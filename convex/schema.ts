import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	issues: defineTable({
		title: v.string(),
		status: v.union(v.literal("open"), v.literal("in-progress"), v.literal("resolved")),
		createdAt: v.string(), // ISO timestamp
	}).index("by_createdAt", ["createdAt"]),
	orchestrationContexts: defineTable({
		// Full structured context built by the routing agent
		context: v.any(),
		// Free-form summary text
		summary: v.optional(v.string()),
		// Optional linking metadata
		issueId: v.optional(v.string()),
		source: v.optional(v.string()),
		// ISO timestamp for ordering
		createdAt: v.string(),
	}).index("by_createdAt", ["createdAt"]),
	chatMessages: defineTable({
		issueId: v.string(),
		role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
		content: v.string(),
		createdAt: v.string(), // ISO timestamp
	})
		.index("by_issue", ["issueId"]) 
		.index("by_issue_createdAt", ["issueId", "createdAt"]),
});

