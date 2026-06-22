import { mutation } from "./_generated/server";
import { requireUserId } from "./users";

/**
 * Genera una URL de subida para almacenar archivos de audio en Convex Storage.
 * Usado por el asistente de voz para subir grabaciones antes de procesarlas.
 * Requiere autenticación para evitar subidas anónimas.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
