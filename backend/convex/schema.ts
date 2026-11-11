import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leads: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
  quotes: defineTable({
    leadId: v.id("leads"),
    email: v.string(),
    destination: v.union(v.literal("UK"), v.literal("US")),
    method: v.union(v.literal("sea"), v.literal("express")),
    weightKg: v.number(),
    totalNgn: v.number(),
    emailStatus: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    createdAt: v.number(),
  }),
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});
