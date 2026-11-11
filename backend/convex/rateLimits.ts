import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const consume = internalMutation({
  args: {
    key: v.string(),
    maxRequests: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (query) => query.eq("key", args.key))
      .unique();

    if (!existing || now - existing.windowStart >= args.windowMs) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimits", {
          key: args.key,
          windowStart: now,
          count: 1,
        });
      }

      return true;
    }

    const nextCount = existing.count + 1;
    await ctx.db.patch(existing._id, { count: nextCount });
    return nextCount <= args.maxRequests;
  },
});
