# DialZero Product Flow (Technology Lens)

This diagram captures the major dial0 components, the external platforms we engage, and the order in which they collaborate to automate a customer support call.

```mermaid
flowchart TD
  %% USER JOURNEY
  subgraph User Journey
    U1[Customer captures call goal
    • Record or type intent
    • Upload docs / voice sample]
    U2[Next.js + React UI
    • App Router pages
    • Hooks: useChat, useToast, useMobile]
    U3[Real-time dashboards & chat
    • Convex live queries render issues, transcripts]
  end

  %% AUTH & SESSION
  subgraph Identity & Session
    A1[Better-Auth
    • Credential flows (magic link, 2FA)
    • Session cookies & JWT headers]
    A2[Resend email workflows
    • Verification, OTP, reset, magic link]
    A3[Geo enrichment
    • lookupGeo() metadata for security emails]
  end

  %% DATA BACKBONE
  subgraph State & Orchestration (Convex)
    C1[Issues table
    • track call requests & status]
    C2[Settings & profile
    • voiceId, test mode, timezone]
    C3[Chat transcripts
    • appendMessage(), listMessages()]
    C4[Call events
    • appendCallEvent(), monitor links]
    C5[Orchestration contexts
    • setContext(), latestContext()]
    C6[Autumn usage hooks
    • trackIssueUsage(), trackVoiceMinutesUsage()]
  end

  %% INTELLIGENCE LAYER
  subgraph Intelligence & Knowledge
    I1[Inkeep RAG
    • Structured context for issues]
    I2[Firecrawl web research
    • Pulls external references for agent]
    I3[OpenAI GPT-OSS-120b Agents
    • Main orchestrator, Context agent]
    I4[Prompt templating
    • System templates for voice calls]
  end

  %% CALL PREP STAGE
  subgraph Call Preparation
    P1[Context builder
    • GPT-OSS-120b converts transcripts → JSON]
    P2[Voice cloning
    • Convex action hits Vapi 11Labs clone API]
    P3[Test mode controls
    • Settings enforce sandbox numbers]
  end

  %% VOICE EXECUTION
  subgraph Voice Automation & Delivery
    V1[Vapi Call Engine
    • Start outbound PSTN call
    • Stream monitor/control URLs]
    V2[Transcription pipeline
    • Deepgram live transcripts → Convex]
    V3[Voice playback
    • ElevenLabs voice selection / cloned voice]
    V4[Target contact
    • Human agent / IVR / business line]
  end

  %% POST CALL
  subgraph Post-Call & Insights
    S1[End-of-call report
    • Summaries stored in Convex]
    S2[Autumn billing & metering
    • Minutes + issue counts → plan usage]
    S3[Analytics & history UI
    • Activity feed, issue timelines]
    S4[Notification layer
    • Emails, in-app toasts, webhook hooks]
  end

  %% FLOWS
  U1 --> U2 --> U3
  U2 --> A1
  A1 --> C2
  A1 --> A2
  A2 --> A3
  U3 --> C1
  U3 --> C3
  C1 --> I1
  C3 --> I3
  C2 --> P2
  C2 --> P3
  I1 --> P1
  P1 --> C5
  C5 --> I3
  I2 --> I3
  I3 --> I4
  I4 --> V1
  V1 --> V3
  V3 --> V4
  V1 --> V2
  V2 --> C4
  V1 --> C4
  C4 --> S1
  S1 --> C3
  C4 --> C6
  C6 --> S2
  C3 --> S3
  S1 --> S4
```

## What Each Layer Does
- **Customer Web app** Built with Next.js + React using App Router. Components under `components/` render guided setup flows, while hooks like `useChat()` stream live agent output and call transcripts from Convex.
- **Session & notifications** Better-Auth manages login state. Email delivery is powered by Resend (OTP, verification, reset) and augmented with geo-aware metadata via `lib/geo.ts`.
- **Convex orchestration** `convex/orchestration.ts` aggregates business logic for issues, contexts, settings, chat, and call events. Stored data drives real-time UI state and usage tracking hooks into Autumn.
- **Knowledge gathering** Inkeep’s OpenAI-backed APIs (`lib/inkeep-service.ts`) analyze issues, perform RAG searches, and return structured advice. Firecrawl supplements with up-to-date external content for the agent.
- **Language intelligence** OpenAI GPT-4.1 (Main + Context agents) reasons over customer goals, builds prompts via templates inside `/app/api/vapi/start-call/route.ts`, and selects actions such as Vapi calls or follow-up messages.
- **Preparation pipeline** Gemini 2.5 (via `/app/api/inkeep/route.ts`) converts resolved chat transcripts into rich call context JSON before storing it with `api.orchestration.setContext`. Voice cloning lives in `convex/actions/voiceCloning.ts` to register custom ElevenLabs voices through Vapi.
- **Voice automation** Vapi handles outbound calling, translating prompts into live speech with selected ElevenLabs voices and streaming transcripts from Deepgram. Monitor/control URLs and event updates enter Convex for playback and auditing.
- **Post-call lifecycle** Webhooks capture end-of-call reports, durations, and recordings, persisting them to the call events table. Convex triggers Autumn metering to update plan usage and powers activity dashboards plus notification fan-out.
- **Observability & safety** System guards include test mode routing (alternate numbers), idempotency checks on call initiation, and environment secrets for every integration (Vapi keys, Inkeep, Autumn, Resend).

Together these layers let DialZero translate a typed request into a fully managed phone call while keeping customers authenticated, informed, and billed accurately.
