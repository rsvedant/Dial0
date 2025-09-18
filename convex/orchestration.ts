import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Issues CRUD (Convex tutorial style)
export const createIssue = mutation({
	args: {
		title: v.string(),
	},
	handler: async (ctx, { title }) => {
		const createdAt = new Date().toISOString();
		const id = await ctx.db.insert("issues", {
			title,
			status: "open",
			createdAt,
		});
		return { id, createdAt };
	},
});

export const listIssues = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db
			.query("issues")
			.withIndex("by_createdAt")
			.order("desc")
			.collect();
		return rows;
	},
});

export const getIssue = query({
	args: { id: v.id("issues") },
	handler: async (ctx, { id }) => {
		const issue = await ctx.db.get(id);
		return issue;
	},
});

export const updateIssueStatus = mutation({
	args: { id: v.id("issues"), status: v.union(v.literal("open"), v.literal("in-progress"), v.literal("resolved")) },
	handler: async (ctx, { id, status }) => {
		await ctx.db.patch(id, { status });
		return { id, status };
	},
});

export const listIssuesWithMeta = query({
	args: {},
	handler: async (ctx) => {
		const issues = await ctx.db
			.query("issues")
			.withIndex("by_createdAt")
			.order("desc")
			.collect();
		const enriched = await Promise.all(
			issues.map(async (issue) => {
				// Last message for preview
				const last = await ctx.db
					.query("chatMessages")
					.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issue._id as unknown as string))
					.order("desc")
					.take(1);
				// Message count
				const cnt = await ctx.db
					.query("chatMessages")
					.withIndex("by_issue", (q) => q.eq("issueId", issue._id as unknown as string))
					.collect();
				return {
					...issue,
					messageCount: cnt.length,
					lastMessage: last[0]?.content ?? null,
				};
			})
		);
		return enriched;
	},
});

export const setContext = mutation({
	args: {
		context: v.any(),
		summary: v.optional(v.string()),
		issueId: v.optional(v.string()),
		source: v.optional(v.string()),
	},
	handler: async (ctx, { context, summary, issueId, source }) => {
		const createdAt = new Date().toISOString();
		const id = await ctx.db.insert("orchestrationContexts", {
			context,
			summary,
			issueId,
			source,
			createdAt,
		});
		return { id, createdAt };
	},
});

export const latestContext = query({
	args: {},
	handler: async (ctx) => {
		const docs = await ctx.db
			.query("orchestrationContexts")
			.withIndex("by_createdAt")
			.order("desc")
			.take(1);
		return docs[0] ?? null;
	},
});

// Chat storage
export const appendMessage = mutation({
	args: {
		issueId: v.string(),
		role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
		content: v.string(),
	},
	handler: async (ctx, { issueId, role, content }) => {
		const createdAt = new Date().toISOString();
		const id = await ctx.db.insert("chatMessages", { issueId, role, content, createdAt });
		return { id, createdAt };
	},
});

export const listMessages = query({
	args: { issueId: v.string() },
	handler: async (ctx, { issueId }) => {
		const rows = await ctx.db
			.query("chatMessages")
			.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issueId))
			.order("asc")
			.collect();
		return rows;
	},
});

// Call events storage (transcripts, status updates, lifecycle)
export const appendCallEvent = mutation({
	args: {
		issueId: v.string(),
		callId: v.optional(v.string()),
		type: v.string(),
		role: v.optional(v.string()),
		content: v.optional(v.string()),
		status: v.optional(v.string()),
	},
	handler: async (ctx, { issueId, callId, type, role, content, status }) => {
			// Server-side dedupe: if an identical content payload already exists for this issue, skip insert.
			if (typeof content === "string" && content.trim().length > 0) {
				// Look back over recent events for this issue and identical content.
				// We query by issueId and scan latest N to keep it cheap.
				const recent = await ctx.db
					.query("callEvents")
					.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issueId))
					.order("desc")
					.take(50);
				const exists = recent.some((ev) => ev.content === content);
				if (exists) {
					return { id: undefined, createdAt: undefined } as any;
				}
			}
			const createdAt = new Date().toISOString();
			const id = await ctx.db.insert("callEvents", { issueId, callId, type, role, content, status, createdAt });
			return { id, createdAt };
	},
});

export const listCallEvents = query({
	args: { issueId: v.string() },
	handler: async (ctx, { issueId }) => {
		const rows = await ctx.db
			.query("callEvents")
			.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issueId))
			.order("asc")
			.collect();
		return rows;
	},
});

// User settings
export const getSettings = query({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db
            .query("settings")
            .withIndex("by_updatedAt")
            .order("desc")
            .take(1);
        return rows[0] ?? null;
    },
});

export const saveSettings = mutation({
    args: {
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        address: v.optional(v.string()),
        email: v.optional(v.string()),
        birthdate: v.optional(v.string()),
        phone: v.optional(v.string()),
        timezone: v.optional(v.string()),
		voiceId: v.optional(v.string()),
        selectedVoice: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updatedAt = new Date().toISOString();
        // Either upsert single settings record by inserting a new version, or patch the latest
        const latest = await ctx.db
            .query("settings")
            .withIndex("by_updatedAt")
            .order("desc")
            .take(1);
        if (latest[0]) {
            await ctx.db.patch(latest[0]._id, { ...args, updatedAt });
            return { id: latest[0]._id, updatedAt };
        } else {
            const id = await ctx.db.insert("settings", { ...args, updatedAt });
            return { id, updatedAt };
        }
    },
});

