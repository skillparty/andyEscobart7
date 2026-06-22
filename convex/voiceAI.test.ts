/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// La clave es necesaria para que las acciones no fallen por configuración.
process.env.GEMINI_API_KEY = "test-key";

/** Crea un usuario y devuelve una instancia de prueba autenticada como él. */
async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

/** Almacena un blob de audio simulado y devuelve su storageId. */
async function storeAudio(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    ctx.storage.store(new Blob(["fake-audio"], { type: "audio/webm" })),
  );
}

type GeminiPart = { text: string };
function geminiResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text } as GeminiPart] } }],
    }),
    text: async () => "",
  };
}

/**
 * Simula la API de Gemini: las llamadas con audio (inlineData) devuelven el
 * JSON estructurado; las llamadas solo-texto devuelven la respuesta de consulta.
 */
function mockGemini(opts: { structured: unknown; answer?: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: { body?: string }) => {
      const body = String(init?.body ?? "");
      if (body.includes("inlineData")) {
        return geminiResponse(JSON.stringify(opts.structured));
      }
      return geminiResponse(opts.answer ?? "Respuesta de prueba.");
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("voiceAI.processVoiceAndExecute — autenticación", () => {
  test("rechaza si no hay sesión", async () => {
    const t = convexTest(schema, modules);
    const storageId = await storeAudio(t);

    await expect(
      t.action(api.voiceAI.processVoiceAndExecute, { storageId }),
    ).rejects.toThrow(/no autenticado/i);
  });
});

describe("voiceAI.processVoiceAndExecute — escritura", () => {
  test("crea una cuenta por pagar con confianza alta y montos en centavos", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    mockGemini({
      structured: {
        action: "create_payable",
        data: { creditorName: "Juan", reason: "cena", amount: 150.5 },
        summary: "Le debes 150.50 a Juan",
        confidence: 0.95,
      },
    });

    const storageId = await storeAudio(t);
    const res = await as.action(api.voiceAI.processVoiceAndExecute, {
      storageId,
    });

    expect(res.executed).toBe(true);
    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(1);
    expect(payables[0]).toMatchObject({
      creditorName: "Juan",
      reason: "cena",
      amount: 15050, // 150.50 BOB en centavos
    });
  });

  test("coacciona montos en texto ('200') a número", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    mockGemini({
      structured: {
        action: "create_receivable",
        data: { debtorName: "Pedro", amount: "200" },
        summary: "Pedro te debe 200",
        confidence: 0.9,
      },
    });

    const storageId = await storeAudio(t);
    const res = await as.action(api.voiceAI.processVoiceAndExecute, {
      storageId,
    });

    expect(res.executed).toBe(true);
    const receivables = await as.query(api.receivables.list);
    expect(receivables[0].amount).toBe(20000);
  });

  test("no ejecuta con confianza baja y avisa", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    mockGemini({
      structured: {
        action: "create_payable",
        data: { creditorName: "X", reason: "Y", amount: 10 },
        summary: "dudoso",
        confidence: 0.4,
      },
    });

    const storageId = await storeAudio(t);
    const res = await as.action(api.voiceAI.processVoiceAndExecute, {
      storageId,
    });

    expect(res.executed).toBe(false);
    expect(res.error).toMatch(/baja confianza/i);
    expect(await as.query(api.payables.list)).toHaveLength(0);
  });
});

describe("voiceAI.processVoiceAndExecute — consulta", () => {
  test("responde la consulta con los datos del usuario sin escribir", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    await as.mutation(api.accounts.create, { name: "Ahorros", balance: 50000 });

    mockGemini({
      structured: {
        action: "query",
        data: { question: "¿Cuánto tengo en Ahorros?" },
        summary: "Consultando saldo",
        confidence: 0.9,
      },
      answer: "Tienes Bs 500,00 en Ahorros.",
    });

    const storageId = await storeAudio(t);
    const res = await as.action(api.voiceAI.processVoiceAndExecute, {
      storageId,
    });

    expect(res.executed).toBe(false);
    expect(res.summary).toMatch(/500/);
    expect(res.data.answer).toMatch(/500/);
  });
});

describe("voiceAI.processVoiceAndExecute — privacidad", () => {
  test("elimina el audio de storage tras procesarlo", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    mockGemini({
      structured: {
        action: "unknown",
        data: {},
        summary: "no entendí",
        confidence: 0,
      },
    });

    const storageId = await storeAudio(t);
    await as.action(api.voiceAI.processVoiceAndExecute, { storageId });

    const blob = await t.run(async (ctx) => ctx.storage.get(storageId));
    expect(blob).toBeNull();
  });
});

describe("voiceAI.processVoice — solo transcripción", () => {
  test("rechaza sin sesión", async () => {
    const t = convexTest(schema, modules);
    const storageId = await storeAudio(t);

    await expect(
      t.action(api.voiceAI.processVoice, { storageId }),
    ).rejects.toThrow(/no autenticado/i);
  });

  test("devuelve el resultado estructurado y borra el audio", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    mockGemini({
      structured: {
        action: "create_account",
        data: { name: "Efectivo", balance: 500 },
        summary: "Crear cuenta efectivo con 500",
        confidence: 0.88,
      },
    });

    const storageId = await storeAudio(t);
    const res = await as.action(api.voiceAI.processVoice, { storageId });

    expect(res.action).toBe("create_account");
    expect(res.confidence).toBeCloseTo(0.88);
    const blob = await t.run(async (ctx) => ctx.storage.get(storageId));
    expect(blob).toBeNull();
  });
});
