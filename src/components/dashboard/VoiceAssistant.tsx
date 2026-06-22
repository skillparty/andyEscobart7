import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ── Types ──────────────────────────────────────────────────────────────────

type VoiceAction =
  | "create_payable"
  | "create_receivable"
  | "create_account"
  | "query"
  | "unknown";

interface VoiceResult {
  action: VoiceAction;
  data: Record<string, unknown>;
  summary: string;
  confidence: number;
  executed: boolean;
  error?: string;
}

type Phase = "idle" | "recording" | "processing" | "result" | "error";

// ── Component ──────────────────────────────────────────────────────────────

export function VoiceAssistant() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    new Array(24).fill(0),
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const processVoice = useAction(api.voiceAI.processVoiceAndExecute);

  // ── Audio Level Visualization ───────────────────────────────────────────
  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);

    // Sample 24 bars from the frequency spectrum
    const bars = 24;
    const step = Math.floor(data.length / bars);
    const levels: number[] = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j];
      }
      levels.push(sum / step / 255); // Normalize to 0-1
    }
    setAudioLevels(levels);
    animFrameRef.current = requestAnimationFrame(updateLevels);
  }, []);

  // ── Start Recording ─────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analyser for visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        cancelAnimationFrame(animFrameRef.current);
        setAudioLevels(new Array(24).fill(0));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms
      setPhase("recording");
      setElapsed(0);
      setError(null);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Start visualization
      updateLevels();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
      setPhase("error");
    }
  }, [updateLevels]);

  // ── Stop Recording & Process ────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setPhase("processing");

    // Stop and wait for final data
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        cancelAnimationFrame(animFrameRef.current);
        setAudioLevels(new Array(24).fill(0));
        resolve();
      };
      recorder.stop();
    });

    // Stop the media stream and release the audio context
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    audioChunksRef.current = [];

    if (audioBlob.size < 1000) {
      setError("La grabación es muy corta. Intenta de nuevo.");
      setPhase("error");
      return;
    }

    try {
      // 1. Upload audio to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type },
        body: audioBlob,
      });
      if (!uploadResponse.ok) {
        throw new Error("Error al subir el audio");
      }
      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };

      // 2. Process with Gemini via the Convex action
      const res = await processVoice({ storageId });
      setResult(res as VoiceResult);
      setPhase("result");
    } catch (err) {
      console.error("Error processing voice:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al procesar el audio.",
      );
      setPhase("error");
    }
  }, [processVoice]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, []);

  // ── Close & Reset ───────────────────────────────────────────────────────
  const close = useCallback(() => {
    if (phase === "recording") {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    setIsOpen(false);
    setPhase("idle");
    setResult(null);
    setError(null);
    setElapsed(0);
  }, [phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Action label & icon helpers ─────────────────────────────────────────
  const actionLabels: Record<VoiceAction, { emoji: string; label: string }> = {
    create_payable: { emoji: "📤", label: "Deuda por pagar registrada" },
    create_receivable: { emoji: "📥", label: "Deuda por cobrar registrada" },
    create_account: { emoji: "🏦", label: "Cuenta creada" },
    query: { emoji: "🔍", label: "Consulta" },
    unknown: { emoji: "❓", label: "No entendí" },
  };

  return (
    <>
      {/* ── FAB: Floating Action Button ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="voice-fab"
        aria-label="Asistente de voz"
        title="Habla para registrar movimientos"
      >
        <MicIcon />
      </button>

      {/* ── Modal Overlay ────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="voice-overlay"
          role="dialog"
          aria-label="Asistente de voz"
        >
          {/* Backdrop */}
          <div className="voice-backdrop" onClick={close} aria-hidden="true" />

          {/* Content */}
          <div className="voice-modal">
            {/* Close */}
            <button
              type="button"
              onClick={close}
              className="voice-close"
              aria-label="Cerrar"
            >
              ✕
            </button>

            {/* ── Idle: Ready to record ───────────────────────────── */}
            {phase === "idle" && (
              <div className="voice-body">
                <div className="voice-ring voice-ring-idle">
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="voice-record-btn"
                    aria-label="Comenzar a grabar"
                  >
                    <MicIcon size={32} />
                  </button>
                </div>
                <h2 className="voice-title">Asistente de Voz</h2>
                <p className="voice-subtitle">
                  Toca el micrófono y di algo como:
                </p>
                <div className="voice-examples">
                  <span className="voice-example">
                    "Le debo 150 bolivianos a Juan por la cena"
                  </span>
                  <span className="voice-example">
                    "Pedro me debe 200 por el taxi"
                  </span>
                  <span className="voice-example">
                    "Crear cuenta efectivo con 500 Bs"
                  </span>
                </div>
              </div>
            )}

            {/* ── Recording ───────────────────────────────────────── */}
            {phase === "recording" && (
              <div className="voice-body">
                <div className="voice-ring voice-ring-recording">
                  <button
                    type="button"
                    onClick={() => void stopRecording()}
                    className="voice-stop-btn"
                    aria-label="Detener grabación"
                  >
                    <StopIcon />
                  </button>
                </div>

                {/* Waveform */}
                <div className="voice-waveform" aria-hidden="true">
                  {audioLevels.map((level, i) => (
                    <div
                      key={`bar-${i}`}
                      className="voice-bar"
                      style={{
                        height: `${Math.max(4, level * 48)}px`,
                        opacity: 0.4 + level * 0.6,
                      }}
                    />
                  ))}
                </div>

                <p className="voice-timer">{formatTime(elapsed)}</p>
                <p className="voice-subtitle">Escuchando… toca para detener</p>
              </div>
            )}

            {/* ── Processing ──────────────────────────────────────── */}
            {phase === "processing" && (
              <div className="voice-body">
                <div className="voice-ring voice-ring-processing">
                  <div className="voice-spinner" />
                </div>
                <h2 className="voice-title">Procesando…</h2>
                <p className="voice-subtitle">Analizando tu mensaje con IA</p>
              </div>
            )}

            {/* ── Result ──────────────────────────────────────────── */}
            {phase === "result" && result && (
              <div className="voice-body">
                <div
                  className={`voice-result-icon ${result.executed ? "voice-result-success" : "voice-result-info"}`}
                >
                  <span className="text-3xl">
                    {actionLabels[result.action].emoji}
                  </span>
                </div>

                <h2 className="voice-title">
                  {actionLabels[result.action].label}
                </h2>

                <p className="voice-summary">{result.summary}</p>

                {/* Data card */}
                {result.action !== "unknown" && result.action !== "query" && (
                  <div className="voice-data-card">
                    {Object.entries(result.data).map(([key, val]) => {
                      if (val === undefined || val === null) return null;
                      const isAmount = key === "amount" || key === "balance";
                      const displayVal = isAmount
                        ? formatMoney(Math.round(Number(val) * 100))
                        : String(val);
                      const labels: Record<string, string> = {
                        creditorName: "Acreedor",
                        debtorName: "Deudor",
                        reason: "Razón",
                        note: "Nota",
                        amount: "Monto",
                        balance: "Saldo",
                        name: "Nombre",
                      };
                      return (
                        <div key={key} className="voice-data-row">
                          <span className="voice-data-label">
                            {labels[key] ?? key}
                          </span>
                          <span className="ledger-dots" />
                          <span className="voice-data-value">{displayVal}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {result.action === "query" && (
                  <div className="voice-data-card">
                    <p className="text-sm text-ink-soft">
                      {String(result.data.answer ?? result.summary)}
                    </p>
                  </div>
                )}

                {/* Confidence */}
                <div className="voice-confidence">
                  <span className="voice-confidence-label">Confianza</span>
                  <div className="voice-confidence-bar">
                    <div
                      className="voice-confidence-fill"
                      style={{
                        width: `${Math.round(result.confidence * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="voice-confidence-pct">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>

                {result.executed && (
                  <p className="voice-executed-badge">✓ Registrado</p>
                )}

                <div className="voice-actions">
                  <button
                    type="button"
                    onClick={close}
                    className="voice-btn-done"
                  >
                    Listo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("idle");
                      setResult(null);
                    }}
                    className="voice-btn-retry"
                  >
                    Otro mensaje
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ───────────────────────────────────────────── */}
            {phase === "error" && (
              <div className="voice-body">
                <div className="voice-result-icon voice-result-error">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="voice-title">Error</h2>
                <p className="voice-summary">{error}</p>
                <div className="voice-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("idle");
                      setError(null);
                    }}
                    className="voice-btn-retry"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="22" x2="12" y2="17" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
