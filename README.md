# Dial0

<div align="center">
  <img src="./public/DialZero.svg" alt="Dial0 Logo" width="220" height="86" />
  
  **Research, call orchestration, and founder oversight in one loop.**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Convex](https://img.shields.io/badge/Convex-1.27-FF7A00?style=flat-square)](https://convex.dev/)
  [![Vapi](https://img.shields.io/badge/Vapi-Voice%20AI-8F4BF7?style=flat-square)](https://vapi.ai/)
  [![OpenAI](https://img.shields.io/badge/OpenAI-GPT--OSS%20120b-10A37F?style=flat-square&logo=openai&logoColor=white)](https://openai.com/)
  [![Firecrawl](https://img.shields.io/badge/Firecrawl-Web%20Research-F97316?style=flat-square)](https://www.firecrawl.dev/)
  [![Inkeep](https://img.shields.io/badge/Inkeep-Agentic%20Knowledge-111827?style=flat-square)](https://inkeep.com/)
  [![Autumn](https://img.shields.io/badge/Autumn-Metering-0EA5E9?style=flat-square)](https://www.useautumn.com/)
  [![Resend](https://img.shields.io/badge/Resend-Emails-6366F1?style=flat-square)](https://resend.com/)
</div>

Dial0 is an agentic voice operations platform that researches a request, orchestrates an outbound phone call with cloned voices, and streams transcripts, status, and reports back to founders in real time.

Start a call from the dashboard, watch transcripts and monitor URLs update live, and ship the end-of-call report directly into your workflows.

## Overview

The app combines a Next.js interface, Convex real-time backend, and Vapi voice automation to take a typed user intent and convert it into a fully managed call. Context is assembled through Inkeep + Firecrawl research, routed through a guardrailed system prompt, and executed via Vapi while founders monitor transcripts, events, and outcomes inside the dashboard.

## Architecture at a glance

```mermaid
flowchart TD
    USER["User<br>(Initiates call intent)"]
    AGENT["Inkeep Main Agent<br>(GPT/OSS-120b)"]
    RAG["Firecrawl<br>(Web Crawling, Retrieval)"]
    CONTEXT["Dynamic Context Builder<br>(GPT/OSS-120b)"]
    VAPIMCP["Dial0 VAPI MCP<br>(Initiates & Controls Call)"]
    CALL["Call Target<br>(Person or business user wants to talk to)"]
    TRANSCRIPTS["Live Listen + Transcript<br>(Websocket, Streaming)"]
    REPORT["End of Call Report"]
    CONVEX{{"Convex<br>(Transcripts,<br>Summaries,<br>Call Events)"}}

    USER -- Call/Chat Intent --> AGENT
    AGENT -- Web Search & Retrieval --> RAG
    AGENT -. Decision, hands off context .-> CONTEXT
    CONTEXT -- Initiate Call --> VAPIMCP
    VAPIMCP -- Connects to --> CALL
    VAPIMCP -- Streaming Audio --> TRANSCRIPTS
    VAPIMCP -- Call Events --> TRANSCRIPTS
    VAPIMCP -- On call end --> REPORT
    AGENT <--> CONTEXT
    TRANSCRIPTS --> CONVEX
    REPORT --> CONVEX
    CONVEX --> USER

    classDef intake fill:#f5ede2,stroke:#b45309,stroke-width:2px,color:#1f1b16;
    classDef intelligence fill:#f1edff,stroke:#5b21b6,stroke-width:2px,color:#1f1b4d;
    classDef voice fill:#fff5e5,stroke:#d97706,stroke-width:2px,color:#3f1d0a;
    classDef data fill:#e7f7f0,stroke:#047857,stroke-width:2px,color:#0f3f2d;
    classDef hub fill:#ece9ff,stroke:#4338ca,stroke-width:3px,color:#1c1633;

    class USER intake;
    class AGENT,CONTEXT intelligence;
    class RAG intelligence;
    class VAPIMCP,CALL voice;
    class TRANSCRIPTS,REPORT data;
    class CONVEX hub;

    linkStyle default stroke:#4338ca,stroke-width:2px;

    style CONVEX fill:#e6f7ff,stroke:#0077b6,stroke-width:2px;
```

### Legend
- **Intake & Trust** Founders capture intent and preferences that frame the call.
- **Intelligence & Planning** Inkeep and Firecrawl assemble research and guardrails before dialing.
- **Voice Execution** Dial0’s Vapi MCP initiates and controls the call with cloned voices.
- **Data & Oversight** Convex persists transcripts, summaries, and alerts for live oversight.

## Feature highlights
- **Intent-driven calls** Conversation context is composed in `app/api/vapi/start-call/route.ts` from Convex state and delivered as a system prompt.
- **Live transcripts & status** `hooks/use-chat.ts` merges Convex call events, transcripts, and streaming SSE responses into rich chat bubbles.
- **Voice cloning & overrides** `convex/actions/voiceCloning.ts` registers ElevenLabs voices while settings (`api.orchestration.getSettings`) handle per-user overrides.
- **Dynamic research loop** Firecrawl + Inkeep enrich issues before dialing to improve first-call resolution.
- **Founder supervision** Components like `components/chat/live-call-transcript.tsx` stream monitoring links, recordings, and summaries in real time.

## 🚀 Technology stack

### Frontend
- **[Next.js 15.5.3](https://nextjs.org/)** – App Router UX with server actions and streaming UI.
- **[React 18](https://react.dev/)** – Concurrent rendering, hooks-first components.
- **[TypeScript 5](https://www.typescriptlang.org/)** – End-to-end typed client and server code.
- **[Tailwind CSS 4.1.9](https://tailwindcss.com/)** – Utility design system for rapid iteration.
- **[Radix UI](https://www.radix-ui.com/)** – Accessible primitives for dialogs, menus, and overlays.
- **[Lucide React](https://lucide.dev/)** – Crisp iconography across dashboards and controls.
- **[Next Themes](https://github.com/pacocoursey/next-themes)** – Dark/light theme management.
- **[Sonner](https://sonner.emilkowal.ski/)** – High-signal toast notifications during live calls.

### Backend & data
- **[Convex](https://convex.dev/)** – Real-time database, queries, and mutations powering the agent loop.
- **[Convex Actions](https://docs.convex.dev/functions/actions)** – Secure server-side bridges into external APIs.
- **[Better Auth](https://better-auth.com/)** – Session + magic link auth flows (via `@convex-dev/better-auth`).
- **[Autumn](https://www.useautumn.com/)** – Usage metering and billing hooks for minutes and issues.

### AI, voice, and research
- **[Vapi](https://vapi.ai/)** – Voice MCP orchestrating outbound calls and tool execution.
- **[OpenAI / GPT-OSS-120b](https://openai.com/)** – Primary reasoning model served through Groq.
- **[ElevenLabs](https://elevenlabs.io/)** – Voice cloning and natural speech synthesis (via Vapi integrations).
- **[Deepgram](https://deepgram.com/)** – Streaming transcription for live call monitoring.
- **[Inkeep](https://inkeep.com/)** – Structured knowledge retrieval for call context and answers.
- **[Firecrawl](https://www.firecrawl.dev/)** – Web research enrichment before dialing.

### Communications & tooling
- **[Resend](https://resend.com/)** – Transactional email for auth, alerts, and call summaries.
- **[Bun](https://bun.sh/)** – Dev/runtime tooling (install, scripts, server).
- **[concurrently](https://github.com/open-cli-tools/concurrently)** – Parallel Next.js + Convex dev servers.
- **[Zod](https://zod.dev/)** – Input validation for API routes and prompts.
- **[Mermaid](https://mermaid.js.org/)** – Diagramming for architecture visualizations.

## Key directories
- `app/` Next.js routes, including `/api/chat` SSE proxy and `/api/vapi/start-call` dial orchestration.
- `components/` UI primitives and live call visualizations (`components/chat/*`).
- `convex/` Database schema, queries, mutations, and actions powering the agent loop.
- `hooks/` Client hooks such as `useChat()` for streaming UI state.
- `lib/` Auth helpers, geo enrichment, default voice definitions, and AI integrations.

## Getting started
```bash
git clone https://github.com/rsvedant/Dial0
cd Dial0

# Bun (recommended)
bun install

# or npm
npm install
```

### Environment variables
Copy `.env.example` and fill in secrets:
```bash
cp .env.example .env.local
```
- **Convex** `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`.
- **Vapi** `VAPI_PRIVATE_API_KEY`, `VAPI_PUBLIC_API_KEY`, `VAPI_PUBLIC_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ORG_ID`, optional `VAPI_WEBHOOK_URL` for ngrok tunnels.
- **Resend + auth** `RESEND_API_KEY`, `RESEND_FROM`, `INTERNAL_EMAIL_PROXY_SECRET`.
- **Agent research** `AGENT_BASE_URL`, `AGENT_API_KEY`.
- **Autumn usage & GitHub OAuth** `AUTUMN_SECRET_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

### Run the stack
```bash
# Start Convex locally (reads CONVEX_DEPLOYMENT)
bunx convex dev

# In another terminal
export $(grep -v '^#' .env.local | xargs)
bun run dev
```
This runs `next dev --turbopack` alongside Convex via the `dev` script. Visit `http://localhost:3000` for the dashboard.

### Vapi webhook
- `VAPI_WEBHOOK_URL` can point to an ngrok tunnel to receive call events while local.
- Outbound requests include `issueId` and `authToken` for Convex correlation and are persisted via `api.orchestration.appendCallEvent`.

## Deployment
- **Frontend** Deploy to Vercel or Bun-compatible hosts (`next build` + `next start`).
- **Convex** Promote with `bunx convex deploy`.
- **Secrets** Mirror your `.env.local` values into production platforms (Vercel, Convex dashboard, Vapi console).

## Contributing
Open issues or pull requests are welcome—focus on incremental improvements to the agent loop, observability, and voice quality.

---

Built with ❤️ by the Dial0 team.
