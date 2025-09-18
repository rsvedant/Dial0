import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	issues: defineTable({
		title: v.string(),
		status: v.union(v.literal("open"), v.literal("in-progress"), v.literal("resolved")),
		createdAt: v.string(), // ISO timestamp
	}).index("by_createdAt", ["createdAt"]),
	settings: defineTable({
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		address: v.optional(v.string()),
		email: v.optional(v.string()),
		birthdate: v.optional(v.string()), // ISO date
		phone: v.optional(v.string()),
		timezone: v.optional(v.string()),
		updatedAt: v.string(), // ISO timestamp
	}).index("by_updatedAt", ["updatedAt"]),
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

