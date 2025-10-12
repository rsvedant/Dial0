import { z } from "zod";
import { FireCrawlLoader } from "@langchain/community/document_loaders/web/firecrawl";
import { JsonSchema, ToolDefinition } from "./mcp/startCallSchema";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY ?? "";
const FIRECRAWL_API_BASE_URL = process.env.FIRECRAWL_API_BASE_URL ?? "https://api.firecrawl.dev/v1";

if (!FIRECRAWL_API_KEY) {
  console.warn("FIRECRAWL_API_KEY is not set. Firecrawl tools will fail until it is provided.");
}

const firecrawlSearchSchema = z.object({
  query: z.string().min(1, "Provide a non-empty search query."),
  limit: z.number().int().positive().max(50).optional(),
  params: z.record(z.unknown()).optional(),
});

const firecrawlScrapeSchema = z.object({
  url: z.string().url("Provide a valid URL to scrape."),
  params: z.record(z.unknown()).optional(),
});

const firecrawlCrawlSchema = z.object({
  url: z.string().url("Provide a valid root URL to crawl."),
  params: z.record(z.unknown()).optional(),
});

const firecrawlExtractSchema = z.object({
  url: z.string().url("Provide a valid URL to extract from."),
  queries: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          name: z.string().optional(),
          query: z.string().min(1),
        }),
      ])
    )
    .min(1, "Provide at least one extraction query."),
  params: z.record(z.unknown()).optional(),
});

export type FirecrawlToolName =
  | "firecrawl_search"
  | "firecrawl_scrape"
  | "firecrawl_crawl"
  | "firecrawl_extract";

function makeToolDefinition(
  name: FirecrawlToolName,
  description: string,
  parameters: JsonSchema
): ToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters,
    },
  };
}

const paramsSchema: JsonSchema = {
  type: "object",
  additionalProperties: true,
};

export const FIRECRAWL_TOOL_DEFINITIONS: ToolDefinition[] = [
  makeToolDefinition("firecrawl_search", "Search the web for relevant pages using Firecrawl's search API.", {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to look up.",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (max 50).",
        minimum: 1,
        maximum: 50,
      },
      params: {
        ...paramsSchema,
        description: "Additional Firecrawl search parameters (optional).",
      },
    },
    required: ["query"],
    additionalProperties: true,
  }),
  makeToolDefinition("firecrawl_scrape", "Scrape a single page and return structured markdown using Firecrawl.", {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to scrape.",
      },
      params: {
        ...paramsSchema,
        description: "Additional Firecrawl scrape parameters (optional).",
      },
    },
    required: ["url"],
    additionalProperties: true,
  }),
  makeToolDefinition("firecrawl_crawl", "Crawl an entire domain and return aggregated markdown from Firecrawl.", {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The root URL to crawl.",
      },
      params: {
        ...paramsSchema,
        description: "Additional Firecrawl crawl parameters (optional).",
      },
    },
    required: ["url"],
    additionalProperties: true,
  }),
  makeToolDefinition(
    "firecrawl_extract",
    "Extract structured answers from a page using Firecrawl's extraction queries.",
    {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to extract data from.",
        },
        queries: {
          type: "array",
          description: "One or more extraction queries (strings or objects with name/query).",
          items: {
            anyOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                  query: { type: "string" },
                },
                required: ["query"],
                additionalProperties: true,
              },
            ],
          },
          minItems: 1,
        },
        params: {
          ...paramsSchema,
          description: "Additional Firecrawl extraction parameters (optional).",
        },
      },
      required: ["url", "queries"],
      additionalProperties: true,
    }
  ),
];

function formatDocuments(docs: Array<{ pageContent: string; metadata: Record<string, unknown> }>): string {
  if (docs.length === 0) {
    return "No documents returned by Firecrawl.";
  }

  const trimmed = docs.slice(0, 3).map((doc, index) => ({
    index,
    source:
      (doc.metadata?.sourceURL as string | undefined) ??
      (doc.metadata?.url as string | undefined) ??
      "unknown",
    metadata: doc.metadata,
    contentPreview: doc.pageContent.length > 2000 ? `${doc.pageContent.slice(0, 2000)}…` : doc.pageContent,
  }));

  return JSON.stringify({ documentCount: docs.length, documents: trimmed }, null, 2);
}

async function firecrawlRequest(path: string, body: Record<string, unknown>): Promise<unknown> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY environment variable is required for Firecrawl tools.");
  }

  const response = await fetch(`${FIRECRAWL_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Firecrawl ${path} failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}

export function isFirecrawlToolName(name: string): name is FirecrawlToolName {
  return (
    name === "firecrawl_search" ||
    name === "firecrawl_scrape" ||
    name === "firecrawl_crawl" ||
    name === "firecrawl_extract"
  );
}

export async function executeFirecrawlTool(
  name: FirecrawlToolName,
  rawArgs: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "firecrawl_search": {
      const args = firecrawlSearchSchema.parse(rawArgs);
      const payload: Record<string, unknown> = { query: args.query };
      if (typeof args.limit === "number") {
        payload.limit = args.limit;
      }
      if (args.params && typeof args.params === "object") {
        Object.assign(payload, args.params);
      }
      const result = await firecrawlRequest("/search", payload);
      return JSON.stringify(result, null, 2);
    }
    case "firecrawl_scrape": {
      const args = firecrawlScrapeSchema.parse(rawArgs);
      const loader = new FireCrawlLoader({
        url: args.url,
        mode: "scrape",
        apiKey: FIRECRAWL_API_KEY || undefined,
        params: args.params as Record<string, unknown> | undefined,
      });
      const docs = await loader.load();
      return formatDocuments(docs as Array<{ pageContent: string; metadata: Record<string, unknown> }>);
    }
    case "firecrawl_crawl": {
      const args = firecrawlCrawlSchema.parse(rawArgs);
      const loader = new FireCrawlLoader({
        url: args.url,
        mode: "crawl",
        apiKey: FIRECRAWL_API_KEY || undefined,
        params: args.params as Record<string, unknown> | undefined,
      });
      const docs = await loader.load();
      return formatDocuments(docs as Array<{ pageContent: string; metadata: Record<string, unknown> }>);
    }
    case "firecrawl_extract": {
      const args = firecrawlExtractSchema.parse(rawArgs);
      const payload: Record<string, unknown> = {
        url: args.url,
        queries: args.queries,
      };
      if (args.params && typeof args.params === "object") {
        Object.assign(payload, args.params);
      }
      const result = await firecrawlRequest("/extract", payload);
      return JSON.stringify(result, null, 2);
    }
    default:
      return "Unsupported Firecrawl tool";
  }
}
