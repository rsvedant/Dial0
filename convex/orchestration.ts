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

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// Issues CRUD (Convex tutorial style)
export const createIssue = mutation({
	args: {
		title: v.string(),
	},
	handler: async (ctx, { title }) => {
		const userId = await requireUserId(ctx);
		
		// Validate that user has filled out required settings
		const settings = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		
		const userSettings = settings[0];
		if (!userSettings) {
			throw new Error("Please complete your account settings before creating an issue.");
		}
		
		// Check required fields (excluding testModeEnabled)
		const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'birthdate', 'timezone'];
		const missingFields: string[] = [];
		
		for (const field of requiredFields) {
			const value = (userSettings as any)[field];
			if (!value || (typeof value === 'string' && value.trim().length === 0)) {
				missingFields.push(field);
			}
		}
		
		// If test mode is enabled, phone number is required
		if (userSettings.testModeEnabled && (!userSettings.testModeNumber || userSettings.testModeNumber.trim().length === 0)) {
			missingFields.push('testModeNumber (required when test mode is enabled)');
		}
		
		if (missingFields.length > 0) {
			throw new Error(`Please complete these required settings before creating an issue: ${missingFields.join(', ')}`);
		}
		
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

export const updateIssueChatId = mutation({
	args: { id: v.id("issues"), chatId: v.string() },
	handler: async (ctx, { id, chatId }) => {
		const userId = await requireUserId(ctx);
		const existing = await ctx.db.get(id);
		if (!existing || existing.userId !== userId) throw new Error("Issue not found");
		await ctx.db.patch(id, { chatId });
		return { id, chatId };
	},
});

export const updateIssueAgent = mutation({
	args: { id: v.id("issues"), currentAgent: v.string() },
	handler: async (ctx, { id, currentAgent }) => {
		const userId = await requireUserId(ctx);
		const existing = await ctx.db.get(id);
		if (!existing || existing.userId !== userId) throw new Error("Issue not found");
		await ctx.db.patch(id, { currentAgent });
		return { id, currentAgent };
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

type ActivityFeedItem = {
	id: string;
	createdAt: string;
	source: "issue" | "chat" | "call" | "context";
	type: string;
	issueId?: string;
	issueTitle?: string;
	callId?: string;
	summary: string;
	details?: string;
	metadata?: Record<string, any>;
};

type ActivityCursor = {
	id: string;
	createdAt: string;
};

const truncate = (value: string | undefined | null, max = 800) => {
	if (!value) return undefined;
	if (value.length <= max) return value;
	return `${value.slice(0, Math.max(0, max - 1))}…`;
};

const isBeforeCursor = (item: ActivityFeedItem, cursor: ActivityCursor) => {
	const itemTime = Date.parse(item.createdAt);
	const cursorTime = Date.parse(cursor.createdAt);
	if (Number.isFinite(itemTime) && Number.isFinite(cursorTime)) {
		if (itemTime < cursorTime) return true;
		if (itemTime > cursorTime) return false;
	} else if (item.createdAt !== cursor.createdAt) {
		return item.createdAt < cursor.createdAt;
	}
	return item.id < cursor.id;
};

export const listActivityFeed = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.object({
			id: v.string(),
			createdAt: v.string(),
		})),
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		const limit = Math.min(Math.max(args.limit ?? 150, 25), 500);
		const cursor = args.cursor ?? null;

		const issues = await ctx.db
			.query("issues")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();

		const issueMeta = new Map<string, { title: string; status: string }>();
		const events: ActivityFeedItem[] = [];
		const perIssueChatLimit = 15;
		const perIssueCallLimit = 25;

		for (const issue of issues) {
			const issueId = issue._id as unknown as string;
			issueMeta.set(issueId, { title: issue.title, status: issue.status });

			events.push({
				id: `issue-${issue._id}`,
				createdAt: issue.createdAt,
				source: "issue",
				type: "issue.created",
				issueId,
				issueTitle: issue.title,
				summary: `Issue created: ${issue.title}`,
				metadata: { status: issue.status },
			});

			const chatRows = await ctx.db
				.query("chatMessages")
				.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issueId))
				.order("desc")
				.take(perIssueChatLimit);
			for (const row of chatRows) {
				const content = typeof row.content === "string" ? row.content.trim() : "";
				if (!content) continue;
				const role = row.role;
				const summary =
					role === "user"
						? "You sent a message"
						: role === "assistant"
						? "Agent replied"
						: "System message";
				const type =
					role === "user"
						? "chat.user"
						: role === "assistant"
						? "chat.assistant"
						: "chat.system";
				events.push({
					id: `chat-${row._id}`,
					createdAt: row.createdAt,
					source: "chat",
					type,
					issueId,
					issueTitle: issue.title,
					summary,
					details: truncate(content, 1200),
					metadata: { role },
				});
			}

			const callRows = await ctx.db
				.query("callEvents")
				.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issueId))
				.order("desc")
				.take(perIssueCallLimit);
			for (const event of callRows) {
				const base: ActivityFeedItem = {
					id: `call-${event._id}`,
					createdAt: event.createdAt,
					source: "call",
					type: `call.${event.type}`,
					issueId,
					issueTitle: issue.title,
					callId: event.callId,
					summary: "Call update",
					metadata: {},
				};

				const status = typeof event.status === "string" ? event.status : undefined;
				const role = typeof event.role === "string" ? event.role : undefined;
				const rawContent = typeof event.content === "string" ? event.content.trim() : undefined;

				switch (event.type) {
					case "lifecycle": {
						base.summary = status === "ended" ? "Call ended" : status === "started" ? "Call started" : `Call lifecycle update`;
						if (status) (base.metadata as any).status = status;
						break;
					}
					case "status": {
						base.summary = "Call status update";
						if (status) {
							(base.metadata as any).status = status;
							base.details = truncate(status, 800);
						} else if (rawContent) {
							base.details = truncate(rawContent, 800);
						}
						break;
					}
					case "recording": {
						base.summary = "Call recording available";
						if (rawContent) {
							try {
								const payload = JSON.parse(rawContent);
								if (payload.recordingUrl) (base.metadata as any).recordingUrl = payload.recordingUrl;
								if (typeof payload.durationSec === "number") (base.metadata as any).durationSec = payload.durationSec;
								if (typeof payload.cost !== "undefined") (base.metadata as any).cost = payload.cost;
								base.details = truncate(payload.summary ?? rawContent, 800);
							} catch {
								base.details = truncate(rawContent, 800);
							}
						}
						break;
					}
					case "monitor": {
						base.summary = "Live call monitor ready";
						if (rawContent) {
							try {
								const payload = JSON.parse(rawContent);
								if (payload.listenUrl) (base.metadata as any).monitorListenUrl = payload.listenUrl;
								if (payload.controlUrl) (base.metadata as any).monitorControlUrl = payload.controlUrl;
							} catch {
								base.details = truncate(rawContent, 800);
							}
						}
						break;
					}
					case "call-details": {
						base.summary = "Call metadata updated";
						if (rawContent) {
							try {
								const payload = JSON.parse(rawContent);
								if (typeof payload.durationSec === "number") (base.metadata as any).durationSec = payload.durationSec;
								if (payload.startedAt) (base.metadata as any).startedAt = payload.startedAt;
								if (payload.endedAt) (base.metadata as any).endedAt = payload.endedAt;
								base.details = truncate(rawContent, 800);
							} catch {
								base.details = truncate(rawContent, 800);
							}
						}
						break;
					}
					case "transcript": {
						if (!rawContent) continue;
						if ((role ?? "").toLowerCase() !== "final") continue; // Only surface final transcripts in feed
						base.summary = "Final call transcript";
						base.details = truncate(rawContent, 1200);
						if (role) (base.metadata as any).role = role;
						break;
					}
					default: {
						if (rawContent) base.details = truncate(rawContent, 800);
						if (status) (base.metadata as any).status = status;
						if (role) (base.metadata as any).role = role;
						base.summary = `Call event: ${event.type}`;
					}
				}

				if (Object.keys(base.metadata ?? {}).length === 0) {
					delete base.metadata;
				}
				events.push(base);
			}
		}

		const contextFetchLimit = Math.min(limit * 4, 400);
		const contexts = await ctx.db
			.query("orchestrationContexts")
			.withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(contextFetchLimit);

		for (const context of contexts) {
			const issueId = context.issueId;
			const issueTitle = issueId ? issueMeta.get(issueId)?.title : undefined;
			const contextPreview = truncate(JSON.stringify(context.context, null, 2), 2000);
			events.push({
				id: `context-${context._id}`,
				createdAt: context.createdAt,
				source: "context",
				type: "context.capture",
				issueId: issueId,
				issueTitle,
				summary: context.summary ?? (issueId ? "Issue context updated" : "Context captured"),
				details: context.summary ? contextPreview : undefined,
				metadata: {
					source: context.source,
					contextPreview,
				},
			});
		}

		events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		const filtered = cursor ? events.filter((item) => isBeforeCursor(item, cursor)) : events;
		const pageItems = filtered.slice(0, limit);
		const hasMore = filtered.length > limit;
		const nextCursor: ActivityCursor | null = hasMore && pageItems.length > 0
			? {
				id: pageItems[pageItems.length - 1].id,
				createdAt: pageItems[pageItems.length - 1].createdAt,
			}
			: null;

		return {
			items: pageItems,
			nextCursor,
			hasMore,
		};
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
		// Note: Timezone will be auto-detected and updated by SettingsBootstrap on the client
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
			selectedVoice: "cgSgspJ2msm6clMCkdW9", // Default: Jessica (popular 11Labs voice)
			testModeEnabled: undefined,
			testModeNumber: undefined,
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
		testModeEnabled: v.optional(v.boolean()),
		testModeNumber: v.optional(v.string()),
		onboardingCompleted: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		const updatedAt = new Date().toISOString();

		const updates: Record<string, any> = {};

		const assignTrimmed = (key: keyof typeof args) => {
			const value = args[key];
			if (typeof value === "undefined") return;
			if (typeof value === "string") {
				const trimmed = value.trim();
				updates[key] = trimmed.length > 0 ? trimmed : undefined;
			} else {
				updates[key] = value;
			}
		};

		assignTrimmed("firstName");
		assignTrimmed("lastName");
		assignTrimmed("address");
		assignTrimmed("email");
		assignTrimmed("birthdate");
		assignTrimmed("timezone");
		assignTrimmed("voiceId");
		assignTrimmed("selectedVoice");

		if (typeof args.phone !== "undefined") {
			const trimmed = (args.phone ?? "").trim();
			if (trimmed.length > 0 && !E164_REGEX.test(trimmed)) {
				throw new Error("Phone must be in E.164 format, e.g. +15551234567");
			}
			updates.phone = trimmed.length > 0 ? trimmed : undefined;
		}

		if (typeof args.testModeNumber !== "undefined") {
			const trimmed = (args.testModeNumber ?? "").trim();
			if (trimmed.length > 0 && !E164_REGEX.test(trimmed)) {
				throw new Error("Test mode number must be in E.164 format, e.g. +15551234567");
			}
			updates.testModeNumber = trimmed.length > 0 ? trimmed : undefined;
		}

		if (typeof args.testModeEnabled !== "undefined") {
			updates.testModeEnabled = args.testModeEnabled;
		}

		if (typeof args.onboardingCompleted !== "undefined") {
			updates.onboardingCompleted = args.onboardingCompleted;
		}

		const latest = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		updates.updatedAt = updatedAt;
		const updatesWithAudit = { ...updates, updatedAt };

		if (latest[0]) {
			console.log('[saveSettings] patching existing settings', latest[0]._id, Object.keys(updates));
			await ctx.db.patch(latest[0]._id, updatesWithAudit);
			await syncBetterAuthProfile(ctx, updatesWithAudit);
			return { id: latest[0]._id, updatedAt };
		} else {
			console.log('[saveSettings] inserting new settings for user', userId, Object.keys(updates));
			const payload = { userId, ...updatesWithAudit };
			const id = await ctx.db.insert("settings", payload);
			await syncBetterAuthProfile(ctx, updatesWithAudit);
			return { id, updatedAt };
		}
	},
});

// Onboarding helpers
export const checkOnboardingStatus = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const settings = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		
		if (!settings[0]) {
			return { 
				completed: false, 
				hasSettings: false,
				requiredFields: ['firstName', 'lastName', 'email', 'phone', 'address', 'birthdate', 'selectedVoice']
			};
		}
		
		const userSettings = settings[0];
		
		// If explicitly marked as completed
		if (userSettings.onboardingCompleted === true) {
			return { completed: true, hasSettings: true };
		}
		
		// Check if all required fields are filled
		const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'birthdate', 'selectedVoice'];
		const missingFields: string[] = [];
		
		for (const field of requiredFields) {
			const value = (userSettings as any)[field];
			if (!value || (typeof value === 'string' && value.trim().length === 0)) {
				missingFields.push(field);
			}
		}
		
		return {
			completed: missingFields.length === 0,
			hasSettings: true,
			missingFields: missingFields.length > 0 ? missingFields : undefined
		};
	},
});

export const completeOnboarding = mutation({
	args: {
		firstName: v.string(),
		lastName: v.string(),
		email: v.string(),
		phone: v.string(),
		address: v.string(),
		birthdate: v.string(),
		timezone: v.string(),
		selectedVoice: v.string(),
		testModeEnabled: v.optional(v.boolean()),
		testModeNumber: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		
		// Validate required fields
		const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'birthdate', 'selectedVoice'];
		for (const field of requiredFields) {
			const value = (args as any)[field];
			if (!value || (typeof value === 'string' && value.trim().length === 0)) {
				throw new Error(`Missing required field: ${field}`);
			}
		}
		
		// Validate phone format
		if (!E164_REGEX.test(args.phone)) {
			throw new Error("Phone must be in E.164 format, e.g. +15551234567");
		}
		
		// Validate test mode number if test mode is enabled
		if (args.testModeEnabled && args.testModeNumber) {
			if (!E164_REGEX.test(args.testModeNumber)) {
				throw new Error("Test mode number must be in E.164 format, e.g. +15551234567");
			}
		}
		
		const updatedAt = new Date().toISOString();
		const settings = await ctx.db
			.query("settings")
			.withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
			.order("desc")
			.take(1);
		
		const updates = {
			firstName: args.firstName,
			lastName: args.lastName,
			email: args.email,
			phone: args.phone,
			address: args.address,
			birthdate: args.birthdate,
			timezone: args.timezone,
			selectedVoice: args.selectedVoice,
			testModeEnabled: args.testModeEnabled ?? false,
			testModeNumber: args.testModeNumber,
			onboardingCompleted: true,
			updatedAt,
		};
		
		if (settings[0]) {
			await ctx.db.patch(settings[0]._id, updates);
			await syncBetterAuthProfile(ctx, updates);
			return { id: settings[0]._id, updatedAt };
		} else {
			const id = await ctx.db.insert("settings", { userId, ...updates });
			await syncBetterAuthProfile(ctx, updates);
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
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();
		return { count: rows.length, rows };
	},
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
		// Note: Timezone will be auto-detected and updated by SettingsBootstrap on the client
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
			selectedVoice: "cgSgspJ2msm6clMCkdW9", // Default: Jessica (popular 11Labs voice)
			testModeEnabled: undefined,
			testModeNumber: undefined,
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

// Tool Calls - persist agent tool activity
export const createToolCall = mutation({
	args: {
		issueId: v.string(),
		toolCallId: v.string(),
		name: v.string(),
		arguments: v.any(),
		turnNumber: v.optional(v.number()),
		agentType: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if this tool call already exists (deduplication)
		const existing = await ctx.db
			.query("toolCalls")
			.withIndex("by_toolCallId", (q) => q.eq("toolCallId", args.toolCallId))
			.first();
		
		if (existing) {
			console.log(`Tool call ${args.toolCallId} already exists, skipping creation`);
			return existing._id;
		}
		
		const now = new Date().toISOString();
		return await ctx.db.insert("toolCalls", {
			issueId: args.issueId,
			toolCallId: args.toolCallId,
			name: args.name,
			arguments: args.arguments,
			createdAt: now,
			turnNumber: args.turnNumber,
			agentType: args.agentType,
		});
	},
});

export const updateToolCallResult = mutation({
	args: {
		toolCallId: v.string(),
		result: v.optional(v.any()),
		error: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();
		const existing = await ctx.db
			.query("toolCalls")
			.withIndex("by_toolCallId", (q) => q.eq("toolCallId", args.toolCallId))
			.first();
		
		if (!existing) {
			console.warn(`Tool call ${args.toolCallId} not found for result update`);
			return;
		}
		
		// Only update if not already completed (avoid overwriting results)
		if (existing.completedAt) {
			console.log(`Tool call ${args.toolCallId} already completed, skipping update`);
			return;
		}
		
		await ctx.db.patch(existing._id, {
			result: args.result,
			error: args.error,
			completedAt: now,
		});
	},
});

export const listToolCalls = query({
	args: { issueId: v.string() },
	handler: async (ctx, { issueId }) => {
		return await ctx.db
			.query("toolCalls")
			.withIndex("by_issue_createdAt", (q) => q.eq("issueId", issueId))
			.order("asc")
			.collect();
	},
});
