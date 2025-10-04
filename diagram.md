# Dial0 Agentic Control Loop

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

## Legend
- **Intake & Trust** Founders capture intent and preferences that frame the call.
- **Intelligence & Planning** Inkeep and Firecrawl assemble research and guardrails before dialing.
- **Voice Execution** Dial0’s Vapi MCP initiates and controls the call with cloned voices.
- **Data & Oversight** Convex persists transcripts, summaries, and alerts for live oversight.

## How the loop works
- **Intent capture** Founders provide goals, verification, and contact details through the Next.js dashboard.
- **Context synthesis** Inkeep + Firecrawl gather external knowledge; Convex stores structured context for the call.
- **Call execution** Vapi (Groq GPT-OSS-120b + ElevenLabs voices + Deepgram transcription) dials the target and streams events.
- **Live oversight** `hooks/use-chat.ts` fuses Convex transcripts, call events, and system updates into supervisor UI components under `components/chat/`.
- **Outcomes & reporting** End-of-call reports, recordings, and summaries return to Convex for auditing, Autumn usage tracking, and follow-up workflows.
