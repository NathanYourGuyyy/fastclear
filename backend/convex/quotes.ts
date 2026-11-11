import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insert = internalMutation({
  args: {
    leadId: v.id("leads"),
    email: v.string(),
    destination: v.union(v.literal("UK"), v.literal("US")),
    method: v.union(v.literal("sea"), v.literal("express")),
    weightKg: v.number(),
    totalNgn: v.number(),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("quotes", {
      ...args,
      emailStatus: "pending",
      createdAt: Date.now(),
    }),
});

export const updateEmailStatus = internalMutation({
  args: {
    id: v.id("quotes"),
    emailStatus: v.union(v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { emailStatus: args.emailStatus });
  },
});
