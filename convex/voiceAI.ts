/**
 * voiceAI.ts — Procesamiento de audio por voz con la API de Google Gemini.
 *
 * Usa la API REST de Gemini directamente con fetch() (disponible en el runtime
 * por defecto de Convex) para evitar depender del runtime Node.js.
 *
 * Exporta:
 *   - processVoice: transcribe y extrae datos estructurados del audio.
 *   - processVoiceAndExecute: igual, pero además ejecuta la mutación si
 *     la confianza es ≥ 0.7.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ---------------------------------------------------------------------------
// Tipos del resultado estructurado que devuelve Gemini
// ---------------------------------------------------------------------------

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
}

interface VoiceExecuteResult extends VoiceResult {
  executed: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Prompt del sistema (en español)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un asistente financiero para una aplicación de gestión de gastos llamada "Cuentas Claras".
El usuario te hablará en español sobre sus finanzas personales.

Tu tarea es extraer datos estructurados del audio y devolver ÚNICAMENTE un objeto JSON válido (sin bloques de código, sin backticks, sin markdown). La respuesta debe seguir esta estructura exacta:

{
  "action": "create_payable" | "create_receivable" | "create_account" | "query" | "unknown",
  "data": { ... },
  "summary": "Breve confirmación en español de lo que entendiste",
  "confidence": 0.0 a 1.0
}

Reglas por tipo de acción:

1. "create_payable" — Cuando el usuario dice que DEBE dinero a alguien.
   data: { "creditorName": string, "reason": string, "amount": number }

2. "create_receivable" — Cuando alguien le DEBE dinero al usuario.
   data: { "debtorName": string, "amount": number, "note": string (opcional, puede omitirse) }

3. "create_account" — Cuando el usuario quiere crear/registrar una cuenta bancaria o de efectivo.
   data: { "name": string, "balance": number }

4. "query" — Cuando el usuario hace una pregunta sobre sus finanzas.
   data: { "question": string }

5. "unknown" — Cuando no se entiende o no está relacionado con finanzas.
   data: {}

Reglas generales:
- Los montos deben estar en bolivianos (BOB) como números decimales (ej: 150.50). NO uses centavos.
- Si el usuario no menciona un monto claro, usa tu mejor estimación o establece confidence bajo.
- Si el audio es ininteligible o no está relacionado con finanzas, usa action "unknown" con confidence 0.
- El campo "summary" siempre debe ser una frase breve en español confirmando lo que entendiste.
- Responde SOLO con el JSON, sin texto adicional.`;

// ---------------------------------------------------------------------------
// Helper: llama a la API REST de Gemini con audio base64
// ---------------------------------------------------------------------------

async function callGeminiRest(
  audioBase64: string,
  mimeType: string,
): Promise<VoiceResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno GEMINI_API_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Analiza el audio anterior y devuelve el JSON estructurado según las instrucciones.",
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error de Gemini API:", response.status, errorText);
    throw new Error(`Error de la API de Gemini (${response.status})`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const rawText =
    json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!rawText) {
    return {
      action: "unknown",
      data: {},
      summary: "No se pudo obtener una respuesta del modelo.",
      confidence: 0,
    };
  }

  // Limpiar posibles bloques de código markdown
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed: VoiceResult = JSON.parse(cleaned);

    if (!parsed.action || parsed.confidence === undefined) {
      throw new Error("Respuesta incompleta del modelo");
    }

    return {
      action: parsed.action,
      data: parsed.data ?? {},
      summary: parsed.summary ?? "Procesado.",
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
    };
  } catch {
    console.error("Error al parsear respuesta de Gemini:", cleaned);
    return {
      action: "unknown",
      data: {},
      summary: "No se pudo interpretar la respuesta del modelo.",
      confidence: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: convierte un Blob a base64
// ---------------------------------------------------------------------------

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Acción pública: procesa audio desde Convex Storage
// ---------------------------------------------------------------------------

export const processVoice = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<VoiceResult> => {
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new Error("No se encontró el archivo de audio en storage");
    }

    const base64 = await blobToBase64(blob);
    const mimeType = blob.type || "audio/webm";

    return await callGeminiRest(base64, mimeType);
  },
});

// ---------------------------------------------------------------------------
// Acción pública: procesa audio Y ejecuta la mutación si hay confianza alta
// ---------------------------------------------------------------------------

export const processVoiceAndExecute = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<VoiceExecuteResult> => {
    // 1. Procesar el audio
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new Error("No se encontró el archivo de audio en storage");
    }

    const base64 = await blobToBase64(blob);
    const mimeType = blob.type || "audio/webm";
    const result = await callGeminiRest(base64, mimeType);

    const response: VoiceExecuteResult = {
      ...result,
      executed: false,
    };

    // 2. Solo ejecutar si la confianza es suficiente
    if (result.confidence < 0.7) {
      return response;
    }

    try {
      const data = result.data;

      switch (result.action) {
        case "create_payable": {
          const creditorName = data.creditorName as string;
          const reason = data.reason as string;
          const amount = data.amount as number;

          if (!creditorName || !reason || !amount) {
            response.error = "Faltan datos para crear la cuenta por pagar.";
            return response;
          }

          await ctx.runMutation(api.payables.create, {
            creditorName,
            reason,
            amount: Math.round(amount * 100),
          });
          response.executed = true;
          break;
        }

        case "create_receivable": {
          const debtorName = data.debtorName as string;
          const amount = data.amount as number;
          const note = data.note as string | undefined;

          if (!debtorName || !amount) {
            response.error = "Faltan datos para crear la cuenta por cobrar.";
            return response;
          }

          await ctx.runMutation(api.receivables.create, {
            debtorName,
            amount: Math.round(amount * 100),
            ...(note ? { note } : {}),
          });
          response.executed = true;
          break;
        }

        case "create_account": {
          const name = data.name as string;
          const balance = data.balance as number;

          if (!name || balance === undefined || balance === null) {
            response.error = "Faltan datos para crear la cuenta.";
            return response;
          }

          await ctx.runMutation(api.accounts.create, {
            name,
            balance: Math.round(balance * 100),
          });
          response.executed = true;
          break;
        }

        default:
          break;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      console.error("Error al ejecutar la mutación:", message);
      response.error = message;
      response.executed = false;
    }

    return response;
  },
});
