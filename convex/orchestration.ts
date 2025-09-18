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

