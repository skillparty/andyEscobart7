import { mutation } from "./_generated/server";

/**
 * Genera una URL de subida para almacenar archivos de audio en Convex Storage.
 * Usado por el asistente de voz para subir grabaciones antes de procesarlas.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
