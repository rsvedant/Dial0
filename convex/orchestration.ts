import { internal } from "./_generated/api";
import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, createAuth } from "./auth";

async function requireUserId(ctx: any): Promise<string> {
	// Try Better Auth user first
	const user: any = await authComponent.getAuthUser(ctx);
	if (user) {
		const id = user.userId ?? user._id; // some versions expose userId, others only _id
		if (typeof id === "string" && id.length > 0) return id;
	}
	// Fallback to raw identity (subject is Better Auth user id per migration docs)
	const identity = await ctx.auth.getUserIdentity();
	if (identity?.subject) return identity.subject;
	throw new Error("Not authenticated");
}

// Issues CRUD (Convex tutorial style)
export const createIssue = mutation({
	args: {
		title: v.string(),
	},
	handler: async (ctx, { title }) => {
		const userId = await requireUserId(ctx);
		const [existing] = await ctx.db
			.query("issues")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
			.take(1);

		const createdAt = new Date().toISOString();
		const id = await ctx.db.insert("issues", {
			userId,
			title,
			status: "open",
			createdAt,
		});

		const shouldTrackUsage = Boolean(process.env.AUTUMN_SECRET_KEY);
		if (shouldTrackUsage) {
			await ctx.scheduler.runAfter(0, internal.actions.autumn.trackIssueUsage, {
				userId,
				value: 1,
				metadata: { issueId: id as unknown as string },
			});
		}

		return {
			id,
			createdAt,
			isFirstIssue: existing ? false : true,
		};
	},
});

export const recordVoiceMinutesUsage = mutation({
	args: {
		issueId: v.string(),
		callId: v.optional(v.string()),
		durationSec: v.optional(v.number()),
		minutes: v.optional(v.number()),
	},
	handler: async (ctx, { issueId, callId, durationSec, minutes }) => {
		const issue = await ctx.db.get(issueId as any) as any;
		if (!issue?.userId) {
			return { tracked: false, reason: "issue_not_found" };
		}

		const derivedMinutes = typeof minutes === "number"
			? minutes
			: (typeof durationSec === "number" && durationSec > 0
				? Math.max(1, Math.ceil(durationSec / 60))
				: null);

		if (!derivedMinutes) {
			return { tracked: false, reason: "no_duration" };
		}

		await ctx.scheduler.runAfter(0, internal.actions.autumn.trackVoiceMinutesUsage, {
			userId: issue.userId,
			value: derivedMinutes,
			metadata: {
				issueId,
				...(callId ? { callId } : {}),
			},
		});

		return { tracked: true, minutes: derivedMinutes };
	},
});

export const listIssues = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		return await ctx.db
			.query("issues")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();
	},
});

export const getIssue = query({
	args: { id: v.id("issues") },
	handler: async (ctx, { id }) => {
		const userId = await requireUserId(ctx);
		const issue = await ctx.db.get(id);
		if (!issue || issue.userId !== userId) return null;
		return issue;
	},
});

export const updateIssueStatus = mutation({
	args: { id: v.id("issues"), status: v.union(v.literal("open"), v.literal("in-progress"), v.literal("resolved")) },
	handler: async (ctx, { id, status }) => {
		const userId = await requireUserId(ctx);
		const existing = await ctx.db.get(id);
		if (!existing || existing.userId !== userId) throw new Error("Issue not found");
		await ctx.db.patch(id, { status });
		return { id, status };
	},
});

export const listIssuesWithMeta = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const issues = await ctx.db
			.query("issues")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
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
		const userId = await requireUserId(ctx);
		const createdAt = new Date().toISOString();
		const id = await ctx.db.insert("orchestrationContexts", {
			userId,
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
		const userId = await requireUserId(ctx);
		const docs = await ctx.db
			.query("orchestrationContexts")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
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
		// Validate ownership of issue
		const userId = await requireUserId(ctx);
		const issue = await ctx.db.get(issueId as any) as any;
		if (!issue || (issue.userId && issue.userId !== userId)) throw new Error("Issue not found");
		const createdAt = new Date().toISOString();
		const id = await ctx.db.insert("chatMessages", { issueId, role, content, createdAt });
		return { id, createdAt };
	},
});

export const listMessages = query({
	args: { issueId: v.string() },
	handler: async (ctx, { issueId }) => {
		const userId = await requireUserId(ctx);
		const issue = await ctx.db.get(issueId as any) as any;
		if (!issue || ((issue as any).userId && (issue as any).userId !== userId)) return [];
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
		const userId = await requireUserId(ctx);
		const issue = await ctx.db.get(issueId as any) as any;
		if (!issue || (issue.userId && issue.userId !== userId)) throw new Error("Issue not found");
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
			const id = await ctx.db.insert("callEvents", { userId, issueId, callId, type, role, content, status, createdAt });
			return { id, createdAt };
	},
});

export const listCallEvents = query({
	args: { issueId: v.string() },
	handler: async (ctx, { issueId }) => {
		const userId = await requireUserId(ctx);
		const issue = await ctx.db.get(issueId as any);
		if (!issue || ((issue as any).userId && (issue as any).userId !== userId)) return [];
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
		const userId = await requireUserId(ctx);
		const docs = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		return docs[0] ?? null;
    },
});

export const getSettingsForUserId = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		const docs = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		return docs[0] ?? null;
	},
});

// Mutation form that guarantees a settings row exists (use this instead of getSettings on first load)
export const getOrCreateSettings = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const existing = await ctx.db
			.query('settings')
			.withIndex('by_userId_updatedAt', q => q.eq('userId', userId))
			.order('desc')
			.take(1);
		if (existing[0]) {
			return { created: false, settings: existing[0] };
		}
		const authUser = await authComponent.getAuthUser(ctx);
		const name = authUser?.name as string | undefined;
		let firstName: string | undefined; let lastName: string | undefined;
		if (name) {
			const parts = name.split(' ');
			firstName = parts[0];
			lastName = parts.slice(1).join(' ') || undefined;
		}
		const updatedAt = new Date().toISOString();
		const id = await ctx.db.insert('settings', {
			userId,
			email: authUser?.email || undefined,
			firstName,
			lastName,
			address: undefined,
			birthdate: undefined,
			phone: undefined,
			timezone: undefined,
			voiceId: undefined,
			selectedVoice: undefined,
			updatedAt,
		});
		console.log('[getOrCreateSettings] inserted', id, 'for user', userId);
		const created = await ctx.db.get(id);
		return { created: true, settings: created };
	}
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
		const userId = await requireUserId(ctx);
        const updatedAt = new Date().toISOString();
		// Upsert for this user: always insert new version (audit) or patch latest? We'll patch latest for simplicity.
		const latest = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		if (latest[0]) {
			console.log('[saveSettings] patching existing settings', latest[0]._id, Object.keys(args));
			await ctx.db.patch(latest[0]._id, { ...args, updatedAt });
			await syncBetterAuthProfile(ctx, { ...args });
			return { id: latest[0]._id, updatedAt };
		} else {
			console.log('[saveSettings] inserting new settings for user', userId, Object.keys(args));
			const id = await ctx.db.insert("settings", { userId, ...args, updatedAt });
			await syncBetterAuthProfile(ctx, { ...args });
			return { id, updatedAt };
		}
    },
});

// DEBUG HELPERS
export const debugAllMySettings = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const rows = await ctx.db
			.query("settings")
			.withIndex("by_userId", q => q.eq("userId", userId))
			.collect();
		return { count: rows.length, rows };
	}
});

export const forceInitSettings = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		// See if exists
		const existing = await ctx.db
			.query("settings")
			.withIndex("by_userId", q => q.eq("userId", userId))
			.take(1);
		if (existing[0]) {
			return { created: false, id: existing[0]._id };
		}
		const updatedAt = new Date().toISOString();
		const id = await ctx.db.insert("settings", { userId, updatedAt });
		return { created: true, id };
	}
});

// Ensure settings exists (lazy initializer) - call this right after login/signup.
export const ensureSettings = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const existing = await ctx.db
			.query('settings')
			.withIndex('by_userId', q => q.eq('userId', userId))
			.take(1);
		if (existing[0]) {
			return { created: false, id: existing[0]._id };
		}
		// Pull auth user to seed
		const authUser = await authComponent.getAuthUser(ctx);
		const name: string | undefined = authUser?.name;
		let firstName: string | undefined;
		let lastName: string | undefined;
		if (name) {
			const parts = name.split(' ');
			firstName = parts[0];
			lastName = parts.slice(1).join(' ') || undefined;
		}
		const updatedAt = new Date().toISOString();
		const id = await ctx.db.insert('settings', {
			userId,
			email: authUser?.email || undefined,
			firstName,
			lastName,
			address: undefined,
			birthdate: undefined,
			phone: undefined,
			timezone: undefined,
			voiceId: undefined,
			selectedVoice: undefined,
			updatedAt,
		});
		console.log('[ensureSettings] created settings id', id, 'for user', userId);
		return { created: true, id };
	}
});

// Dump raw auth user (shape) for debugging differences between environments
export const debugAuthUserShape = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const authUser = await authComponent.getAuthUser(ctx);
		return {
			resolvedUserId: userId,
			hasAuthUser: !!authUser,
			authUserKeys: authUser ? Object.keys(authUser) : [],
			authUser,
		};
	}
});

// Raw dump of every settings row (dangerous: DO NOT expose in production UI) – helps confirm if rows are written under wrong userId
export const listAllSettingsRaw = query({
	args: {},
	handler: async (ctx) => {
		// Still require auth to avoid leaking data, but do not filter
		await requireUserId(ctx);
		const all = await ctx.db.query('settings').collect();
		return { total: all.length, sample: all.slice(0, 50) };
	}
});

async function syncBetterAuthProfile(ctx: any, args: any) {
	try {
		const { firstName, lastName } = args;
		const proposedEmail = args.email as string | undefined;
		const name = [firstName, lastName].filter(Boolean).join(" ") || undefined;
		const auth = createAuth(ctx);
		const api: any = (auth.api as any);
		if (!api?.updateUser) return;
		const headers = await authComponent.getHeaders(ctx);
		// We first fetch current user to compare email (avoid sending unchanged forbidden field)
		let currentEmail: string | undefined;
		try {
			if (api.getUser) {
				const res = await api.getUser({ headers });
				currentEmail = (res as any)?.email;
			}
		} catch (_) { /* non-fatal */ }
		const baseBody: any = {};
		if (name) baseBody.name = name;
		// Only attempt email update if different and env explicitly allows
		const allowEmail = process.env.ALLOW_EMAIL_PROFILE_SYNC === 'true';
		if (allowEmail && proposedEmail && proposedEmail !== currentEmail) {
			baseBody.email = proposedEmail;
		}
		if (Object.keys(baseBody).length === 0) return; // nothing to update
		try {
			await api.updateUser({ body: baseBody, headers });
		} catch (err: any) {
			// If email is not allowed, retry without it
			const code = err?.body?.code;
			if (code === 'EMAIL_CAN_NOT_BE_UPDATED' && 'email' in baseBody) {
				delete baseBody.email;
				if (Object.keys(baseBody).length > 0) {
					await api.updateUser({ body: baseBody, headers });
				}
			} else {
				throw err;
			}
		}
	} catch (e) {
		console.warn("Better Auth profile sync failed", e);
	}
}
