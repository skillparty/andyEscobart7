import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listByRange = query({
  args: {
    fromTs: v.number(),
    toTs: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", userId).gte("paidAt", args.fromTs).lte("paidAt", args.toTs),
      )
      .order("desc")
      .collect();
  },
});
