import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("leads")
      .withIndex("by_email", (query) => query.eq("email", args.email))
      .unique(),
});

export const upsert = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (query) => query.eq("email", args.email))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("leads", {
      email: args.email,
      createdAt: Date.now(),
    });
  },
});
