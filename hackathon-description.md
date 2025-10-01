# DialZero Hackathon Submission

Dial0 is an AI agent that takes painful customer service off your plate. Clone your voice, tell it what’s wrong, and it researches your case, reaches the right people by phone or message, escalates when needed, and keeps you updated in real time (via live listen and transcripts) until it’s fixed.

## Description
- **Problem you're solving**: Founders drown in repetitive support calls; Dial0 turns every inbound request into an AI-managed conversation so humans stay focused on growth.
- **How the app works**: Customers submit intents in the Next.js front end, our Inkeep agent researches their case with Firecrawl, GPT-OSS-120B handles the conversation, Convex orchestrates knowledge and session data, and a Vapi-powered agent places the call, streams transcripts, and logs outcomes automatically. Autumn tallies usage, while live dashboards keep customers and operators informed through Convex live queries.
- **Notable features**:
  - **Vapi AI voice automation & cloning**: Convex actions call Vapi + ElevenLabs to register bespoke voices, enforce sandbox/test routing, and let users monitor calls in real time via listen-in links and transcripts.
  - **Inkeep + Firecrawl knowledge-first reasoning**: Inkeep RAG fuses uploaded docs with Firecrawl web research, GPT-OSS-120B agents build call context using prompt templates, and a context builder converts transcripts into structured JSON for reuse.
  - **Convex adaptive call orchestration**: Convex maintains issues, chat transcripts, call events, and orchestration contexts so the agent can escalate, retry, or hand off to humans with full history preserved.
  - **Better-Auth + Resend identity & trust**: Better-Auth powers passkeys, OTP/TOTP MFA, social linking, and multi-session management; Resend delivers geo-enriched verification, reset, and magic-link flows to ensure secure access.
  - **Autumn post-call lifecycle analytics**: End-of-call reports, Deepgram transcripts, audio recordings, and Autumn metering data sync into analytics dashboards and notification fan-outs (email + in-app toasts) so stakeholders stay up to date.
  - **Safety & observability**: Test mode controls, idempotent call initiation, configurable webhooks, and audit-ready history protect users from rogue automation.
- **Why did you build this**: Our team kept pausing product work to chase support escalations; we built Dial0 to hand those calls to resilient, human-sounding AI operators.
- **Modern Stack cohost(s) included**: Vapi AI voice automation, Inkeep knowledge base, Autumn usage tracking, Better-Auth identity, Convex real-time backend, Firecrawl intelligent research, Resend communications.
- **Tech stack list**: Next.js 15, React 18, TypeScript, Tailwind CSS, Convex, Vapi AI + ElevenLabs, OpenAI GPT-OSS-120b, Inkeep, Autumn, Deepgram, Firecrawl, Resend, Sonner, Zod.
- **Prize category**: OpenAI and Inkeep.