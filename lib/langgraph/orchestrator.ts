import { START, StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  StartCallArguments,
  startCallArgumentsSchema,
  START_CALL_TOOL_DEFINITION,
  ToolDefinition,
} from "../mcp/startCallSchema";
import {
  FIRECRAWL_TOOL_DEFINITIONS,
  executeFirecrawlTool,
  isFirecrawlToolName,
} from "../firecrawl";

const API_KEY = process.env.OPENAI_API_KEY!;
const DEFAULT_MODEL = process.env.OPENAI_MODEL!;
const DEFAULT_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE ?? "0.2"); // Low temperature for deterministic tool calling
const BASE_URL = process.env.OPENAI_BASE_URL!;

// Agent categories based on task specialization
export type AgentType = 
  | "router"           // Routes to specialized agents
  | "financial"        // Bills, fees, refunds, subscriptions
  | "insurance"        // Claims, premiums, compensation
  | "booking"          // Appointments, reservations, scheduling
  | "account"          // Account management, setup, cancellation
  | "support";         // General inquiries, status checks, tech support

function getAgentDisplayName(agent: AgentType): string {
  const names = {
    router: "Routing Agent",
    financial: "Financial Specialist",
    insurance: "Insurance Specialist",
    booking: "Booking Specialist",
    account: "Account Manager",
    support: "Support Specialist"
  };
  return names[agent];
}

function getAgentMetadata(agent: AgentType): { displayName: string; emoji: string; description: string } {
  const metadata = {
    router: {
      displayName: "Dial0 Assistant",
      emoji: "👋",
      description: "Greeting and routing your request"
    },
    financial: {
      displayName: "Financial Negotiator",
      emoji: "💰",
      description: "Building your case to lower bills and get refunds"
    },
    insurance: {
      displayName: "Insurance Claims Specialist",
      emoji: "🛡️",
      description: "Handling claims and compensation"
    },
    booking: {
      displayName: "Booking Coordinator",
      emoji: "📅",
      description: "Scheduling appointments and reservations"
    },
    account: {
      displayName: "Account Manager",
      emoji: "👤",
      description: "Managing account changes and services"
    },
    support: {
      displayName: "Technical Support Agent",
      emoji: "🔧",
      description: "Troubleshooting technical issues"
    }
  };
  return metadata[agent];
}

export type SharedSecrets = {
  issueId: string | null;
  authToken: string | null;
  settings?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    birthdate?: string;
    voiceId?: string;
    selectedVoice?: string;
    testModeEnabled?: boolean;
    testModeNumber?: string;
  };
};

export type RequestContext = {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  address?: string;
};

export type NormalizedMessage = {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
};

export type ToolCallDefinition = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

type ToolCallChunkLike = {
  id?: string;
  name?: string;
  args?: string | Record<string, unknown> | null;
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown> | null;
  } | null;
};

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type ToolCallSource = {
  tool_call_chunks?: unknown;
  tool_calls?: unknown;
};

type OpenAIToolDefinition = ToolDefinition;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeToolArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : { raw: parsed };
    } catch {
      return { raw };
    }
  }

  if (isRecord(raw)) {
    return raw;
  }

  return {};
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toToolCallChunkLike(value: unknown): ToolCallChunkLike | null {
  if (!isRecord(value)) {
    return null;
  }

  const fn = value.function;
  const functionData = isRecord(fn)
    ? {
        name: getString(fn.name) ?? undefined,
        arguments:
          typeof fn.arguments === "string" || isRecord(fn.arguments)
            ? (fn.arguments as string | Record<string, unknown>)
            : null,
      }
    : undefined;

  const argsCandidate = value.args;
  const args =
    typeof argsCandidate === "string" || isRecord(argsCandidate)
      ? (argsCandidate as string | Record<string, unknown>)
      : null;

  return {
    id: getString(value.id) ?? undefined,
    name: getString(value.name) ?? undefined,
    args,
    function: functionData ?? null,
  };
}

function toToolCallDefinition(chunk: ToolCallChunkLike): ToolCallDefinition {
  const name = chunk.function?.name ?? chunk.name ?? "tool";
  const argsSource = chunk.function?.arguments ?? chunk.args ?? null;
  return {
    id: chunk.id ?? nanoid(),
    name,
    arguments: normalizeToolArguments(argsSource),
  };
}

function collectToolCallDefinitions(source: ToolCallSource | undefined): ToolCallDefinition[] {
  if (!source) {
    return [];
  }

  const definitions: ToolCallDefinition[] = [];
  const appendFrom = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }
    for (const item of value) {
      const chunk = toToolCallChunkLike(item);
      if (!chunk) {
        continue;
      }
      definitions.push(toToolCallDefinition(chunk));
    }
  };

  appendFrom(source.tool_call_chunks);
  appendFrom(source.tool_calls);

  return definitions;
}

function toOpenAIToolCalls(toolCalls?: ToolCallDefinition[]): OpenAIToolCall[] | undefined {
  if (!toolCalls || toolCalls.length === 0) {
    return undefined;
  }

  return toolCalls.map((call) => ({
    id: call.id,
    type: "function" as const,
    function: {
      name: call.name,
      arguments: JSON.stringify(call.arguments ?? {}),
    },
  }));
}

async function resolveToolDefinitions(): Promise<OpenAIToolDefinition[]> {
  return [...FIRECRAWL_TOOL_DEFINITIONS, START_CALL_TOOL_DEFINITION];
}

function bindTools(model: ChatOpenAI, tools: OpenAIToolDefinition[]) {
  if (tools.length === 0) {
    return model;
  }
  
  // Log the tool schemas being bound for debugging
  // console.log(JSON.stringify({
  //   level: "debug",
  //   event: "binding_tools_to_model",
  //   toolCount: tools.length,
  //   toolNames: tools.map(t => t.function.name),
  //   toolSchemas: tools.map(t => ({
  //     name: t.function.name,
  //     parameters: t.function.parameters
  //   })),
  //   timestamp: Date.now()
  // }, null, 2));
  
  return model.bind({ tools, tool_choice: "auto" as const });
}

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCallDefinition[];
  toolCallId?: string;
  name?: string;
};

const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
});

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  toolCallId: z.string().optional(),
  name: z.string().optional(),
});

const RequestContextSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  address: z.string().optional(),
});

const SharedSecretsSchema = z.object({
  issueId: z.string().nullable().optional(),
  authToken: z.string().nullable().optional(),
  settings: z.record(z.unknown()).optional(), // User settings from Convex
});

const OrchestratorStateSchema = z.object({
  messages: z.array(MessageSchema),
  requestContext: RequestContextSchema,
  sharedSecrets: SharedSecretsSchema,
  status: z.enum(["routing", "collecting", "calling", "completed"]).default("routing"),
  currentAgent: z.enum(["router", "financial", "insurance", "booking", "account", "support"]).default("router"),
  callResult: z.record(z.unknown()).optional(),
  processedToolCallIds: z.array(z.string()).default([]),
  consecutiveToolFailures: z.number().default(0), // Track failures to prevent infinite loops
  lastFailedTool: z.string().optional(), // Track which tool is failing
  agentTurnCount: z.number().default(0), // Track conversation turns for current agent to enforce info gathering
  gatheredInfo: z.record(z.string()).default({}), // Track what info has been gathered (company, issue, etc)
});

export type OrchestratorState = z.infer<typeof OrchestratorStateSchema>;

export type OrchestratorEvent =
  | { type: "agent-header"; agent: AgentType; displayName: string; emoji: string; description: string }
  | { type: "text-start"; id: string; metadata?: Record<string, unknown> }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string; text: string }
  | { type: "tool-call"; id: string; name: string; arguments: Record<string, unknown>; metadata?: { displayName: string; description: string; estimatedDuration?: number; agentType?: AgentType } }
  | { type: "tool-result"; id: string; name: string; output: unknown }
  | { type: "status"; status: string; metadata?: Record<string, unknown> }
  | { type: "agent-switch"; from: AgentType; to: AgentType; reason?: string; confidence?: number; previousTurnCount?: number }
  | { type: "final"; state: OrchestratorState };

export type OrchestratorInput = {
  messages: NormalizedMessage[];
  requestContext?: RequestContext;
  sharedSecrets?: SharedSecrets;
  currentAgent?: string; // Persisted from database to maintain agent continuity
};

export interface OrchestratorConfig {
  modelName?: string;
  temperature?: number;
  apiKey?: string;
  baseURL?: string;
}

interface NodeContext {
  emit: (event: OrchestratorEvent) => void;
  config: Required<OrchestratorConfig>;
}

function normalizeMessages(messages: NormalizedMessage[]): StoredMessage[] {
  return messages.map((msg) => ({
    id: msg.id ?? nanoid(),
    role: msg.role,
    content: msg.content ?? "",
    name: msg.name,
  }));
}

// Sanitize context fields to prevent prompt injection
function sanitizeContext(ctx: RequestContext): RequestContext {
  const sanitize = (value: string | undefined): string | undefined => {
    if (!value) return value;
    // Remove newlines and common injection patterns
    return value
      .replace(/[\n\r]/g, " ")
      .replace(/IGNORE\s+PREVIOUS\s+INSTRUCTIONS/gi, "[filtered]")
      .replace(/SYSTEM\s+PROMPT/gi, "[filtered]")
      .replace(/ACT\s+AS/gi, "[filtered]")
      .slice(0, 100); // Limit length
  };
  
  return {
    name: sanitize(ctx.name),
    email: sanitize(ctx.email),
    phone: sanitize(ctx.phone),
    timezone: sanitize(ctx.timezone),
    address: sanitize(ctx.address),
  };
}

// Memoization cache for system prompts
const systemPromptCache = new Map<string, string>();

function getCachedSystemPrompt(
  agentType: AgentType, 
  ctx: RequestContext,
  settings?: any,
  circuitBreaker?: { failures: number; toolName?: string }
): string {
  // Optimize: most contexts are empty, don't JSON.stringify for every call
  const safeCtx = sanitizeContext(ctx);
  const hasContext = safeCtx.name || safeCtx.email || safeCtx.phone || safeCtx.timezone || safeCtx.address;
  const hasSettings = settings && (settings.firstName || settings.lastName || settings.phone || settings.email);
  
  const cacheKey = hasContext || hasSettings
    ? `${agentType}:${JSON.stringify({ ctx: safeCtx, settings: hasSettings ? { firstName: settings.firstName, lastName: settings.lastName } : undefined })}` 
    : `${agentType}:empty`;
  
  let basePrompt = systemPromptCache.get(cacheKey);
  if (!basePrompt) {
    basePrompt = AGENT_PROMPTS[agentType](ctx, settings);
    systemPromptCache.set(cacheKey, basePrompt);
    
    // Limit cache size to prevent memory leak (keep last 100 entries)
    if (systemPromptCache.size > 100) {
      const firstKey = systemPromptCache.keys().next().value;
      if (firstKey) systemPromptCache.delete(firstKey);
    }
  }
  
  // Inject circuit breaker warning if needed (not cached)
  if (circuitBreaker && circuitBreaker.failures >= 3) {
    return basePrompt + `\n\n⚠️ CIRCUIT BREAKER ALERT: Tool "${circuitBreaker.toolName}" has failed ${circuitBreaker.failures} times in a row. DO NOT call it again. Try a different approach or ask user for clarification.`;
  }
  
  return basePrompt;
}

// Agent system prompts - specialized by task type
const AGENT_PROMPTS = {
  router: (ctx: RequestContext, settings?: any) => {
    const safeCtx = sanitizeContext(ctx);
    const knownFields: string[] = [];
    if (safeCtx.name) knownFields.push(`Name: ${safeCtx.name}`);
    if (safeCtx.email) knownFields.push(`Email: ${safeCtx.email}`);
    if (safeCtx.phone) knownFields.push(`Phone: ${safeCtx.phone}`);
    if (safeCtx.timezone) knownFields.push(`Timezone: ${safeCtx.timezone}`);
    if (safeCtx.address) knownFields.push(`Address: ${safeCtx.address}`);

    return `You are Dial0's friendly assistant. You handle casual conversation and help route users to specialists when they have issues.

Your job:
- For casual chat (greetings, small talk): Respond warmly and naturally
- When user mentions an issue (billing, tech support, booking, etc.): Acknowledge it briefly and let the system route them to a specialist

Examples:
- User: "hi" → You: "Hi there! How can I assist you today?"
- User: "im good mate" → You: "Glad to hear it! What can I help you with?"
- User: "my wifi is broken" → You: "I understand you're having wifi issues. Let me connect you with our technical support specialist who can help diagnose and fix this."

Known context:
${knownFields.length > 0 ? knownFields.join("\n") : "None"}

IMPORTANT: You have NO tools. You cannot search or make calls. You only converse. When user mentions a real issue, acknowledge it and the system will route them to the right specialist automatically.`;
  },

  financial: (ctx: RequestContext, settings?: any) => {
    const safeCtx = sanitizeContext(ctx);
    return `You are Dial0's financial negotiation specialist. BUILD A STRONG CASE for negotiation.

Known context:
${safeCtx.name ? `- Name: ${safeCtx.name}` : ""}
${safeCtx.phone ? `- Phone: ${safeCtx.phone}` : ""}

PHASE 1 - INFORMATION GATHERING (Ask AT LEAST 4 questions):

Required information:
1. **Company name** - "Which company is this bill from?"
2. **Current bill amount** - "How much are you currently paying per month?"
3. **Service details** - "What services do you have?" (internet speed, cable package, etc.)
4. **Contract status** - "Are you in a contract or month-to-month?"
5. **Goal** - "What would you like to achieve?" (lower bill, cancel, refund, etc.)
6. **Loyalty** - "How long have you been with them?"
7. **Location** - "What's your city/state?" (for competitor pricing research)

PHASE 2 - RESEARCH (Only after gathering info above):

Use firecrawl_search to find:
- Competitor pricing for same services in their area
- Current promotions from the company
- Billing department phone number

PHASE 3 - BUILD LEVERAGE:

Summarize the case:
"Here's what I found:
- You're paying $X with [Company]
- [Competitor] offers similar for $Y
- You've been a loyal customer for Z years

Let me call their billing department to negotiate a better rate."

PHASE 4 - EXECUTE:

Invoke start_call with STRUCTURED context:
\`\`\`json
{
  "context": {
    "callType": "customer_service",
    "contact": {
      "type": "business",
      "name": "Verizon Billing Department",
      "phoneNumber": "1-800-VERIZON"
    },
    "issue": {
      "category": "billing",
      "summary": "Lower monthly bill from $80 to $50-60",
      "details": "Current: $80/month for 100mbps internet. Contract: month-to-month. Tenure: 3 years as customer. Competitor leverage: AT&T offers 100mbps for $55/month.",
      "desiredOutcome": "Reduce bill to $50-60/month to match competitor pricing"
    },
    "caller": {
      "name": "Customer name",
      "identifiers": ["Account number if available"]
    },
    "notesForAgent": "Customer has been loyal for 3 years. Use competitor pricing as leverage. Willing to stay if rate matches."
  }
}
\`\`\`

NOTE: User settings (name, phone, address) will be AUTOMATICALLY added!

CRITICAL RULES:
- NEVER call tools until you have AT LEAST 4 pieces of info
- Research competitors to build leverage BEFORE calling
- The more details you gather, the stronger the negotiation position
- Use STRUCTURED format (contact/issue/caller objects)

You have firecrawl_search and start_call tools.`;
  },

  insurance: (ctx: RequestContext, settings?: any) => {
    const safeCtx = sanitizeContext(ctx);
    return `You are Dial0's insurance claims specialist. BUILD A STRONG CLAIM before calling.

Known context:
${safeCtx.name ? `- Name: ${safeCtx.name}` : ""}
${safeCtx.phone ? `- Phone: ${safeCtx.phone}` : ""}

PHASE 1 - INFORMATION GATHERING (Ask AT LEAST 4 questions):

Required information:
1. **Company/Airline** - "Which company or airline is this claim with?"
2. **What happened** - "What exactly happened?" (delay, cancellation, damage, etc.)
3. **When** - "When did this occur?" (date, time, flight number if applicable)
4. **Policy/Claim details** - "Do you have a policy number, claim number, or booking reference?"
5. **Documentation** - "What documentation do you have?" (receipts, tickets, photos)
6. **Desired outcome** - "What are you seeking?" (refund, compensation, reimbursement)
7. **Previous contact** - "Have you already contacted them about this?"

PHASE 2 - RESEARCH:

Use firecrawl_search to find:
- Claims department phone number
- Relevant compensation policies (e.g., EU261 for flight delays)

PHASE 3 - CASE SUMMARY:

Summarize before calling:
"Here's your claim:
- Company: [X]
- Incident: [detailed description]
- Date: [when]
- Reference: [policy/claim/booking number]
- Seeking: [desired outcome]

Let me call their claims department now."

PHASE 4 - EXECUTE:

Invoke start_call with complete claim details

CRITICAL RULES:
- NEVER call tools until you have AT LEAST 4 pieces of info
- Document everything to strengthen the claim
- The more details, the better the outcome

You have firecrawl_search and start_call tools.`;
  },

  booking: (ctx: RequestContext, settings?: any) => {
    const safeCtx = sanitizeContext(ctx);
    return `You are Dial0's booking coordinator. BUILD COMPLETE BOOKING DETAILS before calling.

Known context:
${safeCtx.name ? `- Name: ${safeCtx.name}` : ""}
${safeCtx.phone ? `- Phone: ${safeCtx.phone}` : ""}
${safeCtx.timezone ? `- Timezone: ${safeCtx.timezone}` : ""}

PHASE 1 - INFORMATION GATHERING (Ask AT LEAST 4 questions):

Required information:
1. **Business/Provider** - "What business or provider?" (restaurant, doctor, salon, etc.)
2. **Location** - "What's the location or address?"
3. **Service/Purpose** - "What's this appointment for?" (haircut, checkup, dinner, etc.)
4. **Preferred dates/times** - "When would you like to go?" (specific dates, time of day)
5. **Duration** - "How long do you need?" (1 hour, 30 min, etc.)
6. **Party size** - "How many people?" (if applicable)
7. **Special requests** - "Any special requests or preferences?"

PHASE 2 - RESEARCH:

Use firecrawl_search to find:
- Business phone number
- Business hours/availability

PHASE 3 - BOOKING SUMMARY:

Summarize before calling:
"Let me book this for you:
- Where: [business + location]
- What: [service/purpose]
- When: [preferred dates/times]
- Details: [party size, duration, special requests]

I'll call them now to schedule."

PHASE 4 - EXECUTE:

Invoke start_call with complete booking details

CRITICAL RULES:
- NEVER call tools until you have AT LEAST 4 pieces of info
- Get specific dates/times (not just "soon")
- Confirm all details before calling

You have firecrawl_search and start_call tools.`;
  },

  account: (ctx: RequestContext, settings?: any) => {
    const safeCtx = sanitizeContext(ctx);
    return `You are Dial0's account manager. BUILD COMPLETE ACCOUNT CHANGE REQUEST before calling.

Known context:
${safeCtx.name ? `- Name: ${safeCtx.name}` : ""}
${safeCtx.phone ? `- Phone: ${safeCtx.phone}` : ""}
${safeCtx.address ? `- Address: ${safeCtx.address}` : ""}

PHASE 1 - INFORMATION GATHERING (Ask AT LEAST 4 questions):

Required information:
1. **Company** - "Which company is this account with?"
2. **Account details** - "What's your account number or email on the account?"
3. **Current status** - "What services do you currently have?"
4. **Desired change** - "What would you like to change?" (cancel, pause, update info, etc.)
5. **Reason** - "Why are you making this change?" (moving, cost, switching provider, etc.)
6. **Timeline** - "When do you need this done?" (immediately, end of month, specific date)
7. **Equipment** - "Do you have any equipment to return?" (modem, router, cable box, etc.)

PHASE 2 - RESEARCH:

Use firecrawl_search to find:
- Account services phone number
- Cancellation/change policies
- Equipment return procedures if applicable

PHASE 3 - CHANGE REQUEST SUMMARY:

Summarize before calling:
"Here's what we're changing:
- Company: [X]
- Account: [account number]
- Current: [what they have]
- Change: [what they want]
- Reason: [why]
- Timeline: [when]

Let me call their account services now."

PHASE 4 - EXECUTE:

Invoke start_call with complete details

CRITICAL RULES:
- NEVER call tools until you have AT LEAST 4 pieces of info
- Get account number for faster service
- Understand the full scope of change (equipment, billing cycle, etc.)
- Document reason to avoid retention attempts

You have firecrawl_search and start_call tools.`;
  },

  support: (ctx: RequestContext, settings?: any) => {
    const safeCtx = sanitizeContext(ctx);
    
    // Build settings display
    const settingsInfo: string[] = [];
    if (settings) {
      if (settings.firstName && settings.lastName) {
        settingsInfo.push(`- Full Name: ${settings.firstName} ${settings.lastName}`);
      } else if (safeCtx.name) {
        settingsInfo.push(`- Name: ${safeCtx.name}`);
      }
      if (settings.phone) settingsInfo.push(`- Phone: ${settings.phone}`);
      if (settings.email) settingsInfo.push(`- Email: ${settings.email}`);
      if (settings.address) settingsInfo.push(`- Address: ${typeof settings.address === 'string' ? settings.address : JSON.stringify(settings.address)}`);
      if (settings.timezone) settingsInfo.push(`- Timezone: ${settings.timezone}`);
      if (settings.birthdate) settingsInfo.push(`- Date of Birth: ${settings.birthdate}`);
    } else {
      // Fallback to ctx if no settings
      if (safeCtx.name) settingsInfo.push(`- Name: ${safeCtx.name}`);
      if (safeCtx.phone) settingsInfo.push(`- Phone: ${safeCtx.phone}`);
      if (safeCtx.email) settingsInfo.push(`- Email: ${safeCtx.email}`);
      if (safeCtx.address) settingsInfo.push(`- Address: ${safeCtx.address}`);
      if (safeCtx.timezone) settingsInfo.push(`- Timezone: ${safeCtx.timezone}`);
    }
    
    return `You are Dial0's support specialist. Your job is to BUILD A STRONG CASE before calling.

USER'S SAVED INFORMATION (use these in your calls - they're verified and accurate):
${settingsInfo.length > 0 ? settingsInfo.join('\n') : "No saved user information available - you MUST ask for these details."}

PHASE 1 - INFORMATION GATHERING (Ask AT LEAST 5-6 questions to build a COMPLETE case):

CRITICAL - Ask these questions methodically:
1. **Company** - "Which company provides your service?" (e.g., Xfinity, AT&T, Verizon)
2. **Issue details** - "What exactly is happening?" Get specifics: no connection, slow, intermittent, error codes
3. **Timeline** - "When did this start?" Exact date/time if possible
4. **Troubleshooting** - "What have you already tried?" List every step they took
5. **Impact** - "How is this affecting you?" Work from home, business, personal use
6. **Account number** - "What's your account number?" CRITICAL for verification
7. **Service address** - "What's the service address?" For verification and outage checks
8. **Equipment** - "What equipment do you have?" (modem model, router type, any errors on devices)
9. **Availability** - "When are you available for a technician?" Get specific time windows
10. **Access** - "Is there anything the technician should know?" (gate code, dogs, apartment number)

PHASE 2 - RESEARCH (Critical step - DO NOT SKIP):

Use firecrawl_search to find:
1. Technical support phone number for the company (search "[company name] technical support phone number")
2. Known outages (search "[company name] outage [city/zip]")
3. Common issues with their equipment (search "[equipment model] troubleshooting")

PHASE 3 - CALL PREPARATION:

Before calling, BUILD THE CASE by summarizing everything:
"Perfect! Here's what I've gathered for the call:
- Company: [X]
- Account: [account number]
- Service Address: [address]
- Issue: [detailed description with all symptoms]
- Duration: [started when]
- Already tried: [all troubleshooting steps]
- Equipment: [models/types]
- Impact: [why it's urgent]
- Available: [time windows for technician]

I found their technical support number. I'll call them now with all these details to get this resolved quickly."

PHASE 4 - EXECUTE:

Invoke start_call with COMPLETE context - fill in ALL relevant fields:
\`\`\`json
{
  "context": {
    "callType": "customer_service",
    "callPurpose": "Report Wi-Fi outage and request technician dispatch",
    "objective": "Get internet service restored as soon as possible, schedule technician if needed",
    "goal": {
      "summary": "Restore internet connection"
    },
    "contact": {
      "type": "business",
      "name": "Xfinity Technical Support",
      "phoneNumber": "1-800-934-6489"
    },
    "issue": {
      "category": "technical_support",
      "summary": "Complete internet outage since yesterday",
      "details": "Customer Vedant Singh reports Xfinity internet has been completely down since yesterday at 5pm. Tried all troubleshooting: rebooted router 3 times, power cycled modem, checked all cables (tight and secure), factory reset equipment. No lights on modem except power. No connection on any device (laptop, phone, smart TV). Customer works from home and cannot access work systems.",
      "urgency": "high",
      "desiredOutcome": "Restore service immediately OR schedule technician for earliest available slot"
    },
    "caller": {
      "name": "Vedant Singh",
      "callback": "+14083341829",
      "identifiers": [
        "Account #8245-3391-8264",
        "Service address: 123 Main St, San Jose, CA 95110",
        "Email: vedant@example.com"
      ]
    },
    "verification": [
      "Account number: 8245-3391-8264",
      "Service address: 123 Main St, San Jose, CA 95110",
      "Phone on account: +14083341829"
    ],
    "availability": {
      "timezone": "America/Los_Angeles",
      "preferredWindows": [
        "Saturday 9am-5pm PST",
        "Sunday anytime",
        "Weekdays after 5pm PST"
      ]
    },
    "constraints": [
      "Customer needs service restored urgently for work",
      "Apartment building - need gate code 1234 for technician access",
      "Prefer morning appointments if possible"
    ],
    "followUp": {
      "nextSteps": [
        "Confirm line check results",
        "Schedule technician if needed",
        "Get confirmation number and time window"
      ]
    },
    "notesForAgent": "Customer is tech-savvy and already completed all standard troubleshooting per Xfinity support site. Modem has no lights except power - likely line issue or equipment failure. Emphasize urgency due to work-from-home requirement. Ask for earliest available technician appointment and confirm time in customer's timezone."
  }
}
\`\`\`

CRITICAL: Fill in ALL fields you gathered AND user settings:
- callPurpose: Clear one-sentence statement
- objective: What we want to achieve
- issue.details: COMPREHENSIVE description with all symptoms and troubleshooting
- caller.name: Use user's full name from settings
- caller.callback: Use user's phone from settings
- caller.identifiers: [Account number, Service address from user settings, Email from user settings]
- verification: [Account number, Service address from user settings, Phone from user settings, Email from user settings]
- availability.timezone: Use user's timezone from settings
- availability.preferredWindows: Based on what user said
- constraints: Any access issues, urgency factors, preferences
- followUp.nextSteps: What should happen on the call
- notesForAgent: Strategy notes, emphasize key points, what to push for

CRITICAL RULES FOR TOOL EXECUTION:
1. **Information Gathering Threshold - MUST HAVE ALL OF THESE**:
   - Company name (validated)
   - Detailed issue description (not just "wifi not working")
   - What user already tried (troubleshooting steps)
   - Account number or service address (for verification)
   - Timeline (when it started)
   - Availability (for technician scheduling if needed)
   
   If MISSING ANY of these → ASK more questions. DON'T proceed with search/call yet.

2. **Phase Progression - ONLY when you have complete information**:
   - Step 1: Confirm you have ALL 6 items above
   - Step 2: Use firecrawl_search to find phone number
   - Step 3: Summarize everything you gathered
   - Step 4: THEN invoke start_call with COMPLETE context
   
   ⚠️ NEVER call prematurely. A well-prepared call is 10x more effective than a rushed one.

3. **Tool Invocation**:
   - When you say "I'm calling now" or "I'll call" → INVOKE start_call IN THE SAME MESSAGE
   - When you say "Let me search" → INVOKE firecrawl_search IN THE SAME MESSAGE
   - NEVER announce action without executing the tool immediately

4. **Context Building**:
   - Use the STRUCTURED format above (contact/issue/caller objects)
   - Fill ALL fields from user settings and conversation
   - Missing info = Weak call = Bad outcome

You have 2 tools: firecrawl_search and start_call. But GATHER COMPLETE INFORMATION FIRST before using them.`;
  }
};

function buildSystemPrompt(
  agentType: AgentType, 
  ctx: RequestContext, 
  settings?: any,
  circuitBreakerInfo?: { failures: number; toolName?: string }
): string {
  return getCachedSystemPrompt(agentType, ctx, settings, circuitBreakerInfo);
}

function extractToolCalls(message: AIMessage): ToolCallDefinition[] {
  const definitions: ToolCallDefinition[] = [];

  definitions.push(...collectToolCallDefinitions({ tool_calls: message.tool_calls as unknown }));

  const additional = isRecord(message.additional_kwargs)
    ? (message.additional_kwargs as Record<string, unknown> & { tool_calls?: unknown }).tool_calls
    : undefined;

  if (additional !== undefined) {
    definitions.push(...collectToolCallDefinitions({ tool_calls: additional }));
  }

  return definitions;
}

function aggregateChunk(base: string, chunk: AIMessageChunk): string {
  const content = chunk.content;
  if (typeof content === "string") {
    return base + content;
  }
  if (Array.isArray(content)) {
    let acc = base;
    for (const part of content) {
      if (typeof part === "string") {
        acc += part;
      } else if (part && typeof part === "object" && "text" in part) {
        acc += String(part.text ?? "");
      }
    }
    return acc;
  }
  return base;
}

async function createMainAgentModel(config: Required<OrchestratorConfig>, includeTools: boolean = true) {
  try {
    const tools = includeTools ? await resolveToolDefinitions() : [];
    const model = new ChatOpenAI({
      configuration: {
        baseURL: "https://ai.hackclub.com/proxy/v1",
      },
      apiKey: config.apiKey,
      model: config.modelName,
      temperature: config.temperature,
    });
    console.log(JSON.stringify({ level: "info", event: "model_created", model: config.modelName, toolCount: tools.length, includeTools }));
    return { model, tools };
  } catch (error) {
    console.log(JSON.stringify({ level: "error", event: "model_creation_failed", error: String(error) }));
    throw new Error(`Failed to create AI model: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Removed old createMainAgentNode - now using individual agent nodes

async function dial0StartCall(args: Record<string, unknown>, secrets: SharedSecrets | undefined) {
  const issueId = secrets?.issueId ?? (typeof args.issueId === "string" ? args.issueId : undefined);
  const authToken = secrets?.authToken ?? (typeof args.authToken === "string" ? args.authToken : undefined);

  if (!issueId) {
    throw new Error("Missing issueId for start_call tool.");
  }
  if (!authToken) {
    throw new Error("Missing authToken for start_call tool.");
  }

  // CRITICAL: Enrich context with user settings if available
  const rawContext = args.context ?? {};
  let enrichedContext = rawContext;
  
  if (secrets?.settings) {
    const settings = secrets.settings;
    console.log(JSON.stringify({
      level: "info",
      event: "enriching_context_with_settings",
      hasFirstName: !!settings.firstName,
      hasLastName: !!settings.lastName,
      hasPhone: !!settings.phone,
      hasAddress: !!settings.address,
      hasTimezone: !!settings.timezone,
      timestamp: Date.now()
    }));
    
    // Merge settings into context structure - agent's values take precedence over settings
    const agentCaller = (rawContext as any).caller || {};
    const agentAvailability = (rawContext as any).availability || {};
    const agentVerification = (rawContext as any).verification || [];
    
    enrichedContext = {
      ...(typeof rawContext === 'object' ? rawContext : {}),
      caller: {
        // Agent values first, then settings as fallback
        name: agentCaller.name || (settings.firstName && settings.lastName 
          ? `${settings.firstName} ${settings.lastName}`
          : settings.firstName || settings.lastName || "User"),
        callback: agentCaller.callback || settings.phone,
        identifiers: [
          // Agent-provided identifiers first
          ...(Array.isArray(agentCaller.identifiers) ? agentCaller.identifiers : []),
          // Add settings as additional verification if not already present
          ...(settings.phone && !agentCaller.identifiers?.some((id: string) => id.includes(settings.phone!)) 
            ? [`Phone: ${settings.phone}`] : []),
          ...(settings.email && !agentCaller.identifiers?.some((id: string) => id.includes(settings.email!))
            ? [`Email: ${settings.email}`] : []),
          ...(settings.address && !agentCaller.identifiers?.some((id: string) => id.includes(settings.address!))
            ? [`Address: ${settings.address}`] : []),
        ].filter(Boolean),
        org: agentCaller.org,
        employer: agentCaller.employer,
      },
      availability: {
        timezone: agentAvailability.timezone || settings.timezone || "UTC",
        preferredWindows: agentAvailability.preferredWindows,
      },
      verification: [
        // Add settings to verification array if not already there
        ...Array.isArray(agentVerification) ? agentVerification : [],
        ...(settings.phone && !agentVerification.some((v: string) => v.includes(settings.phone!))
          ? [`Phone: ${settings.phone}`] : []),
        ...(settings.email && !agentVerification.some((v: string) => v.includes(settings.email!))
          ? [`Email: ${settings.email}`] : []),
        ...(settings.address && !agentVerification.some((v: string) => v.includes(settings.address!))
          ? [`Service address: ${settings.address}`] : []),
        ...(settings.birthdate && !agentVerification.some((v: string) => v.includes(settings.birthdate!))
          ? [`Date of birth: ${settings.birthdate}`] : []),
      ].filter(Boolean),
    };
  }

  const mergedArgs: StartCallArguments = startCallArgumentsSchema.parse({
    issueId,
    authToken,
    context: enrichedContext,
  });

  const mcpResponse = await fetch(`${process.env.SITE_URL || ""}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nanoid(),
      method: "tools/call",
      params: {
        name: "start_call",
        arguments: mergedArgs,
      },
    }),
  });

  if (!mcpResponse.ok) {
    const errorBody = await mcpResponse.text();
    throw new Error(`Failed calling start_call tool: ${mcpResponse.status} ${errorBody}`);
  }

  const payload = await mcpResponse.json();
  return JSON.stringify(payload?.result ?? payload);
}

function createToolNode(nodeCtx: NodeContext) {
  return async (state: OrchestratorState) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const toolCalls = lastMessage?.toolCalls ?? [];
    const processedIds = new Set(state.processedToolCallIds ?? []);
    const pendingCalls = toolCalls.filter((call) => call.id && !processedIds.has(call.id));

    if (pendingCalls.length === 0) {
      const normalizedStatus = state.status === "routing" ? "collecting" : state.status;
      return {
        status: normalizedStatus,
        processedToolCallIds: Array.from(processedIds),
      } satisfies Partial<OrchestratorState>;
    }

    const toolOutputs: StoredMessage[] = [];
    let startCallCompleted = false;
    let callResultPayload: Record<string, unknown> | undefined = undefined;

    for (const call of pendingCalls) {
      const id = call.id ?? nanoid();
      processedIds.add(id);
      
      // For start_call, emit with merged arguments including issueId and authToken for visibility
      let emitArgs = call.arguments;
      if (call.name === "start_call" || call.name === "dial0_start_call") {
        const secrets = state.sharedSecrets as SharedSecrets;
        // console.log(JSON.stringify({
        //   level: "debug",
        //   event: "start_call_arguments_raw",
        //   rawArgs: call.arguments,
        //   hasContext: !!call.arguments.context,
        //   contextKeys: call.arguments.context ? Object.keys(call.arguments.context as Record<string, unknown>) : [],
        //   timestamp: Date.now()
        // }));
        emitArgs = {
          ...call.arguments,
          issueId: secrets?.issueId ?? call.arguments.issueId,
          authToken: secrets?.authToken ?? call.arguments.authToken,
        };
        // console.log(JSON.stringify({
        //   level: "debug",
        //   event: "start_call_arguments_enriched",
        //   hasIssueId: !!emitArgs.issueId,
        //   hasAuthToken: !!emitArgs.authToken,
        //   hasContext: !!emitArgs.context,
        //   timestamp: Date.now()
        // }));
      }
      
      // Build metadata for tool call
      const getToolMetadata = (toolName: string, currentAgent: AgentType) => {
        if (toolName === "firecrawl_search") {
          return {
            displayName: "Web Search",
            description: "Searching the web for relevant information",
            estimatedDuration: 3000, // 3 seconds
            agentType: currentAgent
          };
        }
        if (toolName === "start_call" || toolName === "dial0_start_call") {
          return {
            displayName: "Phone Call",
            description: "Initiating a phone call on your behalf",
            estimatedDuration: 5000, // 5 seconds to start
            agentType: currentAgent
          };
        }
        return {
          displayName: toolName,
          description: `Executing ${toolName}`,
          estimatedDuration: 2000,
          agentType: currentAgent
        };
      };
      
      const metadata = getToolMetadata(call.name, state.currentAgent);
      
      // console.log(JSON.stringify({ 
      //   level: "info", 
      //   event: "tool_execution_start", 
      //   tool: call.name, 
      //   description: metadata.description,
      //   timestamp: Date.now() 
      // }));
      
      nodeCtx.emit({ type: "tool-call", id, name: call.name, arguments: emitArgs, metadata });
      
      // CRITICAL: Check circuit breaker BEFORE execution
      if (state.consecutiveToolFailures >= 3 && state.lastFailedTool === call.name) {
        const message = `Circuit breaker: ${call.name} has failed ${state.consecutiveToolFailures} times, skipping execution`;
        console.log(JSON.stringify({ level: "warn", event: "circuit_breaker_triggered", tool: call.name, failures: state.consecutiveToolFailures }));
        nodeCtx.emit({ type: "tool-result", id, name: call.name, output: { error: message } });
        toolOutputs.push({
          id: nanoid(),
          role: "tool",
          content: message,
          toolCallId: id,
        });
        continue; // Skip to next tool
      }
      
      // Retry logic with exponential backoff AND 30s timeout to prevent hangs
      let output: string | Record<string, unknown> = "";
      let lastError: Error | null = null;
      const maxRetries = call.name === "start_call" || call.name === "dial0_start_call" ? 1 : 3; // Don't retry start_call
      
      const retryLoop = async () => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            if (isFirecrawlToolName(call.name)) {
              output = await executeFirecrawlTool(call.name, call.arguments);
            } else if (call.name === "start_call" || call.name === "dial0_start_call") {
              output = await dial0StartCall(call.arguments, state.sharedSecrets as SharedSecrets);
              startCallCompleted = true;
              if (typeof output === "string") {
                const parsed = tryParseJson(output);
                if (isRecord(parsed)) {
                  callResultPayload = parsed;
                }
              } else if (isRecord(output)) {
                callResultPayload = output;
              }
            } else {
              output = { warning: `Unknown tool: ${call.name}` };
            }
            
            // Success - break retry loop
            lastError = null;
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // Don't retry on last attempt
            if (attempt < maxRetries - 1) {
              const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5s backoff
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
          }
        }
      };
      
      // Wrap retry loop with 30s timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool ${call.name} timed out after 30s`)), 30000);
      });
      
      try {
        await Promise.race([retryLoop(), timeoutPromise]);
      } catch (timeoutError) {
        lastError = timeoutError instanceof Error ? timeoutError : new Error(String(timeoutError));
      }
      
      if (lastError) {
        const message = lastError.message;
        nodeCtx.emit({ type: "tool-result", id, name: call.name, output: { error: message } });
        toolOutputs.push({
          id: nanoid(),
          role: "tool",
          content: `Tool ${call.name} failed after ${maxRetries} attempts: ${message}`,
          toolCallId: id,
        });
      } else {
        nodeCtx.emit({ type: "tool-result", id, name: call.name, output });
        toolOutputs.push({
          id: nanoid(),
          role: "tool",
          content: typeof output === "string" ? output : JSON.stringify(output),
          toolCallId: id,
        });
      }
    }

    const updatedMessages = [...state.messages, ...toolOutputs];
    const nextStatus: OrchestratorState["status"] = startCallCompleted ? "completed" : "collecting";
    const nextCallResult = startCallCompleted ? callResultPayload ?? state.callResult : state.callResult;

    // Track consecutive failures for circuit breaker
    const hasFailures = toolOutputs.some(msg => msg.content.includes("failed after"));
    const lastCallName = pendingCalls[pendingCalls.length - 1]?.name;
    
    let nextConsecutiveFailures = state.consecutiveToolFailures;
    let nextLastFailedTool = state.lastFailedTool;
    
    if (hasFailures && lastCallName) {
      // Same tool failing again
      if (state.lastFailedTool === lastCallName) {
        nextConsecutiveFailures = state.consecutiveToolFailures + 1;
      } else {
        // Different tool, reset counter
        nextConsecutiveFailures = 1;
        nextLastFailedTool = lastCallName;
      }
    } else {
      // Success - reset
      nextConsecutiveFailures = 0;
      nextLastFailedTool = undefined;
    }

    // Keep recent tool IDs to prevent re-execution within same conversation
    // Only keep last 20 to prevent unbounded growth
    const recentToolIds = [...state.processedToolCallIds, ...Array.from(processedIds)].slice(-20);
    
    return {
      messages: updatedMessages,
      status: nextStatus,
      callResult: nextCallResult,
      processedToolCallIds: recentToolIds,
      currentAgent: state.currentAgent,
      consecutiveToolFailures: nextConsecutiveFailures,
      lastFailedTool: nextLastFailedTool,
    } satisfies Partial<OrchestratorState>;
  };
}

// Create agent-specific nodes
function createRouterNode(
  nodeCtx: NodeContext, 
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return createAgentNode(nodeCtx, "router", modelPromise);
}

function createFinancialNode(
  nodeCtx: NodeContext,
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return createAgentNode(nodeCtx, "financial", modelPromise);
}

function createInsuranceNode(
  nodeCtx: NodeContext,
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return createAgentNode(nodeCtx, "insurance", modelPromise);
}

function createBookingNode(
  nodeCtx: NodeContext,
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return createAgentNode(nodeCtx, "booking", modelPromise);
}

function createAccountNode(
  nodeCtx: NodeContext,
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return createAgentNode(nodeCtx, "account", modelPromise);
}

function createSupportNode(
  nodeCtx: NodeContext,
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return createAgentNode(nodeCtx, "support", modelPromise);
}

// Generic agent node creator
function createAgentNode(
  nodeCtx: NodeContext, 
  agentType: AgentType,
  modelPromise: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  return async (state: OrchestratorState) => {
    const { model, tools } = await modelPromise;
    const runId = nanoid();
    
    // Structured logging for production debugging
    console.log(JSON.stringify({
      level: "info",
      event: "agent_start",
      agent: agentType,
      runId,
      messageCount: state.messages.length,
      consecutiveFailures: state.consecutiveToolFailures,
      timestamp: Date.now()
    }));
    
    // Emit agent header for UI display (shows user which agent is now speaking)
    const agentMeta = getAgentMetadata(agentType);
    nodeCtx.emit({ 
      type: "agent-header", 
      agent: agentType, 
      displayName: agentMeta.displayName,
      emoji: agentMeta.emoji,
      description: agentMeta.description
    });
    
    nodeCtx.emit({ type: "status", status: `${agentType}_agent_start`, metadata: { runId } });
    nodeCtx.emit({ type: "text-start", id: runId, metadata: { source: agentType } });

    // Build system prompt for THIS specific agent with circuit breaker info
    const circuitBreaker = state.consecutiveToolFailures >= 3 
      ? { failures: state.consecutiveToolFailures, toolName: state.lastFailedTool }
      : undefined;
    const settings = state.sharedSecrets?.settings;
    const systemPrompt = buildSystemPrompt(agentType, state.requestContext ?? {}, settings, circuitBreaker);
    const lcMessages = [
      new SystemMessage(systemPrompt),
      ...state.messages.map(msg => {
        if (msg.role === "user") {
          return new HumanMessage({ content: msg.content, name: msg.name });
        } else if (msg.role === "assistant") {
          const toolCalls = toOpenAIToolCalls(msg.toolCalls);
          return new AIMessage({
            content: msg.content,
            additional_kwargs: toolCalls ? { tool_calls: toolCalls } : {},
          });
        } else if (msg.role === "tool") {
          return new ToolMessage({
            content: msg.content,
            tool_call_id: msg.toolCallId ?? nanoid(),
            name: msg.name,
          });
        }
        return new HumanMessage({ content: msg.content });
      })
    ];

    const runnable = bindTools(model, tools);
    let stream: AsyncGenerator<AIMessageChunk>;
    
    try {
      stream = (await runnable.stream(lcMessages)) as AsyncGenerator<AIMessageChunk>;
    } catch (error) {
      // Capture full error details for tool validation failures
      // const err = error as any;
      // console.error(JSON.stringify({
      //   level: "error",
      //   event: "stream_initialization_failed",
      //   agent: agentType,
      //   errorMessage: error instanceof Error ? error.message : String(error),
      //   errorName: error instanceof Error ? error.name : undefined,
      //   stack: error instanceof Error ? error.stack : undefined,
      //   code: err.code,
      //   type: err.type,
      //   status: err.status,
      //   timestamp: Date.now()
      // }, null, 2));
      throw error;
    }

    let fullText = "";
    const latestToolCalls: ToolCallDefinition[] = [];
    const seenToolCallIds = new Set<string>();

    try {
      for await (const chunk of stream) {
        fullText = aggregateChunk(fullText, chunk);

        const toolCallDefinitions = collectToolCallDefinitions(chunk as ToolCallSource);
        if (toolCallDefinitions.length > 0) {
          for (const toolCall of toolCallDefinitions) {
            if (!seenToolCallIds.has(toolCall.id)) {
              seenToolCallIds.add(toolCall.id);
              
              // Log tool call from LLM for debugging
              // console.log(JSON.stringify({
              //   level: "debug",
              //   event: "llm_tool_call_generated",
              //   agent: agentType,
              //   toolName: toolCall.name,
              //   hasArguments: !!toolCall.arguments,
              //   argumentKeys: toolCall.arguments ? Object.keys(toolCall.arguments) : [],
              //   timestamp: Date.now()
              // }));
              
              // Generate unique ID: combine LLM's ID with timestamp and random to prevent collisions
              const uniqueId = `${toolCall.id}-${Date.now()}-${nanoid(8)}`;
              // Store with the unique ID so tool execution and results match up
              latestToolCalls.push({
                ...toolCall,
                id: uniqueId,
              });
              nodeCtx.emit({
                type: "tool-call",
                id: uniqueId,
                name: toolCall.name,
                arguments: toolCall.arguments,
              });
            }
          }
        }

        const delta = chunk.content;
        if (typeof delta === "string" && delta.trim().length > 0) {
          nodeCtx.emit({ type: "text-delta", id: runId, delta });
        } else if (Array.isArray(delta)) {
          for (const part of delta) {
            let textChunk = "";
            if (typeof part === "string") {
              textChunk = part;
            } else if (part && typeof part === "object") {
              const partObj = part as Record<string, unknown>;
              if (typeof partObj.text === "string") {
                textChunk = partObj.text;
              } else if (typeof partObj.content === "string") {
                textChunk = partObj.content;
              } else if (typeof partObj.value === "string") {
                textChunk = partObj.value;
              }
            }
            if (textChunk) {
              nodeCtx.emit({ type: "text-delta", id: runId, delta: textChunk });
            }
          }
        }
      }
    } catch (streamError) {
      // Capture the FULL error object including nested properties
      const err = streamError as any;
      const errorDetails = streamError instanceof Error ? {
        errorMessage: streamError.message,
        errorName: streamError.name,
        stack: streamError.stack,
        code: err.code,
        type: err.type,
        status: err.status,
        param: err.param,
        requestID: err.requestID,
        pregelTaskId: err.pregelTaskId,
        nestedError: err.error,
        headers: err.headers ? Object.fromEntries(err.headers.entries()) : undefined,
      } : streamError;
      
      // console.error("🚨 FULL STREAM ERROR DETAILS:");
      // console.error(JSON.stringify(errorDetails, null, 2));
      // console.error("🚨 RAW ERROR OBJECT:");
      // console.error(streamError);
      
      // If there's a nested error object, log it too
      if (err.error) {
        console.error("🚨 NESTED ERROR OBJECT:");
        console.error(JSON.stringify(err.error, null, 2));
      }
      
      throw streamError;
    }

    nodeCtx.emit({ type: "text-end", id: runId, text: fullText });
    nodeCtx.emit({ type: "status", status: `${agentType}_agent_end`, metadata: { runId } });

    // Use collected tool calls from stream (no fallback - if streaming missed them, we're screwed)
    const pendingToolCalls = latestToolCalls.filter((call) => !state.processedToolCallIds.includes(call.id));

    // IMPORTANT: Only store NEW tool calls (pending ones), not already-processed ones
    // This prevents tool calls from persisting across messages in the UI
    const stored: StoredMessage = {
      id: nanoid(),
      role: "assistant",
      content: fullText,
      toolCalls: pendingToolCalls, // Only include NEW tool calls
    };

    // Status transitions: routing -> collecting -> calling -> completed
    // NEVER go backwards (calling -> collecting would cause infinite loops)
    let nextStatus: OrchestratorState["status"] = state.status;

    if (pendingToolCalls.length > 0) {
      nextStatus = "calling";
    } else if (state.status === "completed") {
      nextStatus = "completed";
    } else if (state.status === "calling") {
      // After tools complete, either we're done or waiting for more info
      // But don't go back to "collecting" - stay in "calling" until completed or need user input
      nextStatus = "calling";
    } else {
      nextStatus = "collecting";
    }

    // Track conversation turns for this agent
    const turnCount = state.currentAgent === agentType ? state.agentTurnCount + 1 : 1;
    
    return {
      messages: [...state.messages, stored],
      status: nextStatus,
      currentAgent: agentType,
      agentTurnCount: turnCount,
    } satisfies Partial<OrchestratorState>;
  };
}

// Helper for specialist edge routing (all specialists have same logic)
function specialistEdgeRouter(state: OrchestratorState) {
  const lastMessage = state.messages[state.messages.length - 1];
  const pendingToolCalls = lastMessage?.toolCalls?.filter(
    (call) => !state.processedToolCallIds.includes(call.id)
  );
  if (pendingToolCalls && pendingToolCalls.length > 0) {
    return "tools";
  }
  if (state.status === "completed") {
    return END;
  }
  return END;
}

// Router to determine which agent to start with (only runs from START node)
function routeToAgent(state: OrchestratorState): { agent: AgentType; confidence: number } {
  // Count user messages to detect first interaction
  const userMessages = state.messages.filter(m => m.role === "user");
  if (userMessages.length === 0) {
    return { agent: "router", confidence: 1.0 };
  }

  const lastUserMsg = userMessages[userMessages.length - 1];
  const text = lastUserMsg.content.toLowerCase();
  
  // Check for exit/reset keywords - ALWAYS go back to router
  if (text.match(/\b(start over|new topic|different issue|change topic|nevermind|cancel|exit|reset)\b/)) {
    return { agent: "router", confidence: 1.0 };
  }

  // Score all messages to decide routing intelligently
  const scores: Record<AgentType, number> = {
    router: 0,
    financial: 0,
    insurance: 0,
    booking: 0,
    account: 0,
    support: 0,
  };

  // Financial: bills, fees, refunds (HIGH priority for billing keywords)
  if (text.match(/\b(bill|billing|fee|refund|subscription|charge|payment|cost|price|expensive|lower|negotiate|cheaper)\b/)) {
    scores.financial += 3;
  }
  if (text.match(/\b(money|dollar|pay|paid|owe)\b/)) {
    scores.financial += 1;
  }

  // Insurance: claims, premiums
  if (text.match(/\b(insurance|claim|premium|coverage|compensat|policy|deductible)\b/)) {
    scores.insurance += 3;
  }
  if (text.match(/\b(medical.*bill|flight.*delay|flight.*cancel|denied|appeal)\b/)) {
    scores.insurance += 2;
  }

  // Booking: appointments, reservations
  if (text.match(/\b(appointment|book|schedul|reserv|reserve)\b/)) {
    scores.booking += 3;
  }
  if (text.match(/\b(doctor|dentist|salon|spa|restaurant|hotel|table|visit)\b/)) {
    scores.booking += 2;
  }

  // Account: setup, updates, cancellation of SERVICE (not appointment)
  if (text.match(/\b(cancel.*service|cancel.*account|close.*account|activate|reactivat|setup.*account)\b/)) {
    scores.account += 3;
  }
  if (text.match(/\b(account|update.*info|change.*address|change.*email|equipment|return.*equipment)\b/)) {
    scores.account += 1;
  }

  // Support: tech issues (be careful not to overlap with billing)
  if (text.match(/\b(wifi|wi-fi|connection|not.*connect|can'?t.*connect|slow.*internet)\b/)) {
    scores.support += 3;
  }
  if (text.match(/\b(broken|not.*work|isn'?t.*work|won'?t.*work|fix|tech.*issue|tech.*support|outage)\b/)) {
    scores.support += 2;
  }
  // Downweight support if billing keywords present
  if (text.match(/\b(bill|billing|pay|payment|cost|price)\b/)) {
    scores.support -= 2;
  }

  // INTELLIGENT ROUTING LOGIC:
  // 1. If with specialist and score is low (casual chat), STAY with specialist
  // 2. If with specialist and high score for DIFFERENT specialist, SWITCH
  // 3. If with router and high score for specialist, SWITCH
  // 4. Otherwise stay with current agent
  
  // Find highest scoring agent with tiebreaker
  let bestAgent: AgentType = state.currentAgent;
  let bestScore = 0;
  const agentPriority: AgentType[] = ["financial", "insurance", "booking", "account", "support", "router"];
  
  for (const agent of agentPriority) {
    const score = scores[agent];
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    } else if (score === bestScore && score > 0) {
      // Tie - prefer current agent if it's one of the tied agents
      if (state.currentAgent === agent) {
        bestAgent = agent;
      }
    }
  }

  // Calculate confidence (normalize score)
  const confidence = Math.min(bestScore / 3.0, 1.0);
  
  // SMART STICKY ROUTING:
  // If currently with a specialist, only switch if:
  // 1. User explicitly mentions a different domain (high confidence)
  // 2. OR very low score (casual chat) but stay with current specialist
  if (state.currentAgent && state.currentAgent !== "router") {
    if (bestScore === 0) {
      // Casual chat - stay with current specialist
      console.log(JSON.stringify({
        level: "debug",
        event: "routing_stayed",
        reason: "casual_chat_with_specialist",
        currentAgent: state.currentAgent,
        timestamp: Date.now()
      }));
      return { agent: state.currentAgent, confidence: 0.8 };
    } else if (bestAgent !== state.currentAgent && confidence < 0.7) {
      // Low confidence switch - prefer staying
      console.log(JSON.stringify({
        level: "debug",
        event: "routing_stayed",
        reason: "low_confidence_switch_prevented",
        currentAgent: state.currentAgent,
        suggestedAgent: bestAgent,
        confidence,
        timestamp: Date.now()
      }));
      return { agent: state.currentAgent, confidence: 0.7 };
    }
    // High confidence switch to different specialist - allow it
  }
  
  // If with router and no strong signal, stay with router for conversation
  if (state.currentAgent === "router" && bestScore === 0) {
    return { agent: "router", confidence: 0.8 };
  }
  
  // If no current agent or low confidence, default to router
  if (!state.currentAgent || confidence < 0.3) {
    return { agent: "router", confidence: Math.max(confidence, 0.5) };
  }

  // Log routing decision for production debugging
  console.log(JSON.stringify({
    level: "debug",
    event: "routing_decision",
    currentAgent: state.currentAgent,
    bestAgent,
    confidence,
    scores,
    messageLength: text.length,
    timestamp: Date.now()
  }));

  // If confidence too low and not currently routed, stay on router for clarification
  if (confidence < 0.3 && state.currentAgent === "router") {
    return { agent: "router", confidence };
  }

  // If already routed to specialist and confidence is low, stay with current
  if (confidence < 0.5 && state.currentAgent !== "router") {
    return { agent: state.currentAgent, confidence: 0.7 };
  }

  return { agent: bestAgent, confidence };
}

function buildGraph(
  nodeCtx: NodeContext,
  sharedModelPromise?: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>,
  routerModelPromise?: Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>
) {
  // Use provided model promises or create new ones
  // Router gets NO tools (just greets), specialists get ALL tools
  const specialistModelPromise = sharedModelPromise ?? createMainAgentModel(nodeCtx.config, true);
  const routerModel = routerModelPromise ?? createMainAgentModel(nodeCtx.config, false);
  
  const graph = new StateGraph(OrchestratorStateSchema)
    // Router has NO tools (just greets)
    .addNode("router", createRouterNode(nodeCtx, routerModel))
    // Specialists have tools
    .addNode("financial", createFinancialNode(nodeCtx, specialistModelPromise))
    .addNode("insurance", createInsuranceNode(nodeCtx, specialistModelPromise))
    .addNode("booking", createBookingNode(nodeCtx, specialistModelPromise))
    .addNode("account", createAccountNode(nodeCtx, specialistModelPromise))
    .addNode("support", createSupportNode(nodeCtx, specialistModelPromise))
    .addNode("tools", createToolNode(nodeCtx))
    
    // START: Route intelligently based on conversation state with confidence scoring
    .addConditionalEdges(START, (state) => {
      const routing = routeToAgent(state);
      const { agent, confidence } = routing;
      
      // If routing away from current agent, emit switch event with rich metadata
      if (agent !== state.currentAgent && state.currentAgent) {
        const toMeta = getAgentMetadata(agent);
        const fromMeta = getAgentMetadata(state.currentAgent);
        nodeCtx.emit({ 
          type: "agent-switch", 
          from: state.currentAgent, 
          to: agent, 
          reason: `${fromMeta.emoji} → ${toMeta.emoji} Switching to ${toMeta.displayName} (${(confidence * 100).toFixed(0)}% match)`,
          confidence,
          previousTurnCount: state.agentTurnCount
        });
      }
      
      return agent;
    })
    
    // Router always ends - specialist routing handled by START node
    .addConditionalEdges("router", (state) => {
      if (state.status === "completed") {
        return END;
      }
      return END;
    })
    
    // All specialists have same logic: tools or end
    .addConditionalEdges("financial", specialistEdgeRouter)
    .addConditionalEdges("insurance", specialistEdgeRouter)
    .addConditionalEdges("booking", specialistEdgeRouter)
    .addConditionalEdges("account", specialistEdgeRouter)
    .addConditionalEdges("support", specialistEdgeRouter)
    
    // Tools route back to the current agent
    .addConditionalEdges("tools", (state) => {
      if (state.status === "completed") {
        return END;
      }
      return state.currentAgent;
    });

  return graph.compile();
}

// Model cache - models are expensive to create, graph compilation is cheap
const modelCache = new Map<string, Promise<{ model: ChatOpenAI; tools: OpenAIToolDefinition[] }>>();

export async function* runOrchestrator(
  input: OrchestratorInput,
  config: OrchestratorConfig = {}
): AsyncGenerator<OrchestratorEvent> {

  const events: OrchestratorEvent[] = [];
  const emit = (event: OrchestratorEvent) => {
    events.push(event);
  };

  // Build config keys for model caching (NOT graph caching - emit is per-request)
  const specialistKey = `${config.modelName ?? DEFAULT_MODEL}:${config.temperature ?? DEFAULT_TEMPERATURE}:tools`;
  const routerKey = `${config.modelName ?? DEFAULT_MODEL}:${config.temperature ?? DEFAULT_TEMPERATURE}:notools`;
  
  // Cache model creation but rebuild graph per request (graph compilation is fast)
  // CRITICAL: Caching graph causes race condition with emit function
  const fullConfig = {
    modelName: config.modelName ?? DEFAULT_MODEL,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    apiKey: config.apiKey ?? API_KEY,
    baseURL: config.baseURL ?? BASE_URL,
  };
  
  if (!modelCache.has(specialistKey)) {
    modelCache.set(specialistKey, createMainAgentModel(fullConfig, true));
  }
  if (!modelCache.has(routerKey)) {
    modelCache.set(routerKey, createMainAgentModel(fullConfig, false));
  }
  
  // Inject model promises into buildGraph to avoid re-creation
  const graph = buildGraph({
    emit,
    config: fullConfig,
  }, modelCache.get(specialistKey)!, modelCache.get(routerKey)!);

  // Validate and cast currentAgent to AgentType
  const validAgents: AgentType[] = ["router", "financial", "insurance", "booking", "account", "support"];
  const restoredAgent = input.currentAgent && validAgents.includes(input.currentAgent as AgentType)
    ? (input.currentAgent as AgentType)
    : "router";
  
  const initialState: OrchestratorState = {
    messages: normalizeMessages(input.messages),
    requestContext: input.requestContext ?? {},
    sharedSecrets: input.sharedSecrets ?? { issueId: null, authToken: null },
    status: "routing",
    currentAgent: restoredAgent, // Restore from database or start with router
    processedToolCallIds: [],
    consecutiveToolFailures: 0,
    agentTurnCount: 0,
    gatheredInfo: {},
  };

  // Log orchestration start
  console.log(JSON.stringify({
    level: "info",
    event: "orchestration_start",
    messageCount: input.messages.length,
    hasContext: !!input.requestContext,
    timestamp: Date.now()
  }));

  const stream = await graph.stream(initialState, {
    streamMode: "values",
  });

  let lastState: OrchestratorState = initialState;
  let previousAgent = initialState.currentAgent;

  for await (const state of stream) {
    lastState = state as OrchestratorState;
    
    // Detect agent changes and emit agent-switch event
    if (state.currentAgent !== previousAgent) {
      yield {
        type: "agent-switch",
        from: previousAgent,
        to: state.currentAgent,
        reason: "routing decision",
      };
      previousAgent = state.currentAgent;
    }
    
    while (events.length) {
      yield events.shift()!;
    }
  }

  while (events.length) {
    yield events.shift()!;
  }

  yield { type: "final", state: lastState };
}
