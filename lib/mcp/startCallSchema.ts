import { z } from "zod";

const callTypeOptions = ["customer_service", "personal", "work", "general"] as const;

type CallType = (typeof callTypeOptions)[number];

export type JsonSchema = {
  type?: string;
  description?: string;
  enum?: Array<string | number | boolean | null>;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  additionalProperties?: boolean | Record<string, unknown> | JsonSchema;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
};

const textArraySchema: JsonSchema = {
  type: "array",
  items: { type: "string" },
};

const optionalStringSchema: JsonSchema = { type: "string" };

export const startCallContextJsonSchema: JsonSchema = {
  type: "object",
  required: ["contact", "caller"],
  additionalProperties: false,
  properties: {
    callPurpose: { ...optionalStringSchema },
    callType: { type: "string", enum: [...callTypeOptions] },
    goal: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { ...optionalStringSchema },
      },
    },
    objective: { ...optionalStringSchema },
    contact: {
      type: "object",
      required: ["type", "name"],
      additionalProperties: false,
      properties: {
        type: { type: "string" },
        name: { type: "string" },
        phoneNumber: { ...optionalStringSchema },
        altChannels: textArraySchema,
      },
    },
    issue: {
      type: "object",
      additionalProperties: false,
      properties: {
        category: { ...optionalStringSchema },
        summary: { ...optionalStringSchema },
        details: { ...optionalStringSchema },
        urgency: { ...optionalStringSchema },
        desiredOutcome: { ...optionalStringSchema },
      },
    },
    constraints: textArraySchema,
    verification: textArraySchema,
    availability: {
      type: "object",
      additionalProperties: false,
      properties: {
        timezone: { ...optionalStringSchema },
        preferredWindows: textArraySchema,
      },
    },
    caller: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        callback: { ...optionalStringSchema },
        identifiers: textArraySchema,
        org: { ...optionalStringSchema },
        employer: { ...optionalStringSchema },
      },
    },
    followUp: {
      type: "object",
      additionalProperties: false,
      properties: {
        nextSteps: textArraySchema,
        notify: textArraySchema,
      },
    },
    notesForAgent: { ...optionalStringSchema },
    work: {
      type: "object",
      additionalProperties: false,
      properties: {
        org: { ...optionalStringSchema },
      },
    },
    openers: {
      type: "object",
      additionalProperties: false,
      properties: {
        personal: { ...optionalStringSchema },
        work: { ...optionalStringSchema },
        general: { ...optionalStringSchema },
      },
    },
  },
};

export const startCallArgumentsJsonSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    issueId: { type: "string" },
    authToken: { type: "string" },
    context: startCallContextJsonSchema,
  },
  required: ["context"],
};

export const startCallContextSchema = z.object({
  callPurpose: z.string().optional(),
  callType: z.enum(callTypeOptions).optional(),
  goal: z.object({ summary: z.string().optional() }).optional(),
  objective: z.string().optional(),
  contact: z.object({
    type: z.string(),
    name: z.string(),
    phoneNumber: z.string().optional(),
    altChannels: z.array(z.string()).optional(),
  }),
  issue: z
    .object({
      category: z.string().optional(),
      summary: z.string().optional(),
      details: z.string().optional(),
      urgency: z.string().optional(),
      desiredOutcome: z.string().optional(),
    })
    .optional(),
  constraints: z.array(z.string()).optional(),
  verification: z.array(z.string()).optional(),
  availability: z
    .object({
      timezone: z.string().optional(),
      preferredWindows: z.array(z.string()).optional(),
    })
    .optional(),
  caller: z.object({
    name: z.string(),
    callback: z.string().optional(),
    identifiers: z.array(z.string()).optional(),
    org: z.string().optional(),
    employer: z.string().optional(),
  }),
  followUp: z
    .object({
      nextSteps: z.array(z.string()).optional(),
      notify: z.array(z.string()).optional(),
    })
    .optional(),
  notesForAgent: z.string().optional(),
  work: z
    .object({
      org: z.string().optional(),
    })
    .optional(),
  openers: z
    .object({
      personal: z.string().optional(),
      work: z.string().optional(),
      general: z.string().optional(),
    })
    .optional(),
});

export type StartCallContext = z.infer<typeof startCallContextSchema>;

export const startCallArgumentsSchema = z.object({
  issueId: z.string(),
  authToken: z.string(),
  context: startCallContextSchema,
});

export type StartCallArguments = z.infer<typeof startCallArgumentsSchema>;

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
};

export const START_CALL_TOOL_DEFINITION: ToolDefinition = {
  type: "function" as const,
  function: {
    name: "start_call",
    description: `Initiate a phone call via Vapi. Provide a 'context' object with call details.

REQUIRED in context: contact (type, name), caller (name)
OPTIONAL but recommended: issue, availability, verification, constraints

Minimal example:
{ "context": { "contact": { "type": "business", "name": "Xfinity", "phoneNumber": "+18009346489" }, "caller": { "name": "John Doe" } } }

Full example:
{ "context": { "contact": { "type": "business", "name": "Xfinity Support", "phoneNumber": "+18009346489" }, "caller": { "name": "John Doe", "callback": "+14155551234" }, "issue": { "summary": "Internet outage", "details": "Complete outage since yesterday" } } }`,
    parameters: startCallArgumentsJsonSchema,
  },
};
