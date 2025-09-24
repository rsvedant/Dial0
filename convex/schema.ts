import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	issues: defineTable({
		// Owning Better Auth user id
		userId: v.string(),
		title: v.string(),
		status: v.union(v.literal("open"), v.literal("in-progress"), v.literal("resolved")),
		createdAt: v.string(), // ISO timestamp
	})
		.index("by_createdAt", ["createdAt"]) // legacy / wide queries (optional retain)
		.index("by_userId_createdAt", ["userId", "createdAt"]),
	settings: defineTable({
		userId: v.string(),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		address: v.optional(v.string()),
		email: v.optional(v.string()),
		birthdate: v.optional(v.string()), // ISO date
		phone: v.optional(v.string()),
		timezone: v.optional(v.string()),
		voiceId: v.optional(v.string()),
		selectedVoice: v.optional(v.string()),
		updatedAt: v.string(), // ISO timestamp
	})
		.index("by_updatedAt", ["updatedAt"]) // existing global index
		.index("by_userId", ["userId"]) // point lookup per user
		.index("by_userId_updatedAt", ["userId", "updatedAt"]),
	orchestrationContexts: defineTable({
		userId: v.string(),
		// Full structured context built by the routing agent
		context: v.any(),
		// Free-form summary text
		summary: v.optional(v.string()),
		// Optional linking metadata
		issueId: v.optional(v.string()),
		source: v.optional(v.string()),
		// ISO timestamp for ordering
		createdAt: v.string(),
	})
		.index("by_createdAt", ["createdAt"]) // legacy
		.index("by_userId_createdAt", ["userId", "createdAt"]),
	chatMessages: defineTable({
		issueId: v.string(),
		role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
		content: v.string(),
		createdAt: v.string(), // ISO timestamp
	})
		.index("by_issue", ["issueId"]) 
		.index("by_issue_createdAt", ["issueId", "createdAt"]),
	// Live call events and transcripts from Vapi webhooks
	callEvents: defineTable({
		userId: v.string(),
		issueId: v.string(),
		callId: v.optional(v.string()),
		type: v.string(), // e.g., 'status' | 'transcript' | 'lifecycle'
		role: v.optional(v.string()), // 'assistant' | 'user' when transcript
		content: v.optional(v.string()), // text payload
		status: v.optional(v.string()),
		createdAt: v.string(), // ISO timestamp
	})
		.index("by_issue_createdAt", ["issueId", "createdAt"]) 
		.index("by_issue", ["issueId"]) 
		.index("by_call", ["callId"])
		.index("by_userId_createdAt", ["userId", "createdAt"]),
});

