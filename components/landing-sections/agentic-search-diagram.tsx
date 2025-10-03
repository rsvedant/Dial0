"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import mermaid from "mermaid"
import { BackgroundBeams } from "../magicui/background-beams"
import { Spotlight } from "../magicui/spotlight"

const diagramDefinition = `flowchart TD
    USER["User<br>(Initiates call intent)"]
    AGENT["Inkeep Main Agent<br>(GPT/OSS-120b)"]
    RAG["Firecrawl<br>(Web Crawling, Retrieval)"]
    CONTEXT["Dynamic Context Builder<br>(GPT/OSS-120b)"]
    VAPIMCP["Dial0 VAPI MCP<br>(Initiates &amp; Controls Call)"]
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
`

const legendItems: { label: string; description: string; accentClass: string; dotClass: string }[] = [
  {
    label: "Intake & Trust",
    description: "Intent capture, authentication, and founder preferences frame the call.",
    accentClass: "from-[#F5EDE2] to-[#F8F1E7]",
    dotClass: "bg-[#b45309]",
  },
  {
    label: "Intelligence & Planning",
    description: "Inkeep and Firecrawl craft reasoned plans before the voice agent ever dials.",
    accentClass: "from-[#F1EDFF] to-[#F7F3FF]",
    dotClass: "bg-[#5b21b6]",
  },
  {
    label: "Voice Execution",
    description: "Dial0 VAPI orchestrates cloned voices with humanlike pacing and control.",
    accentClass: "from-[#FFF5E5] to-[#FFEFD4]",
    dotClass: "bg-[#d97706]",
  },
  {
    label: "Data & Oversight",
    description: "Convex logs transcripts, summaries, and alerts for live founder supervision.",
    accentClass: "from-[#E7F7F0] to-[#D5F3E4]",
    dotClass: "bg-[#047857]",
  },
]

function useMermaid(diagram: string) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const renderId = useMemo(() => `agentic-flow-${Math.random().toString(36).slice(2)}`, [])

  useEffect(() => {
    let cancelled = false

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      flowchart: {
        curve: "basis",
        nodeSpacing: 65,
        rankSpacing: 90,
        padding: 16,
      },
      themeVariables: {
        fontFamily: "'Inter', sans-serif",
        fontSize: "16px",
        primaryColor: "#f7f4ff",
        primaryBorderColor: "#5b21b6",
        primaryTextColor: "#1f1b16",
        lineColor: "#4338ca",
        arrowheadColor: "#4338ca",
        secondaryColor: "#f5ede2",
        secondaryBorderColor: "#b45309",
        tertiaryColor: "#e7f7f0",
        clusterBkg: "#f9f6f2",
        clusterBorder: "#e6ddd0",
        background: "transparent",
      },
    })

    ;(async () => {
      try {
        const { svg } = await mermaid.render(renderId, diagram)
        if (!cancelled) {
          setSvg(svg)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to render diagram"
          setError(message)
          console.error("Mermaid render failed", err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [diagram, renderId])

  return { svg, error }
}
export function AgenticSearchDiagram() {
  const { svg, error } = useMermaid(diagramDefinition)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollLeft = Math.max(0, (containerRef.current.scrollWidth - containerRef.current.clientWidth) / 2)
  }, [svg])

  return (
    <section className="relative isolate overflow-hidden bg-[#F7F5F3] py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.08)_0%,_rgba(247,245,243,0)_58%)]" aria-hidden />
        <div className="absolute -left-24 top-40 h-[480px] w-[480px] rounded-full bg-gradient-to-r from-[#F59E0B1A] to-[#4338CA14] blur-3xl" aria-hidden />
        <div className="absolute -right-36 bottom-16 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#0478571a] to-transparent blur-3xl" aria-hidden />
      </div>

      <Spotlight className="opacity-50" size={620} colorLight="rgba(67,56,202,0.32)" colorDark="rgba(37,99,235,0.18)" />
      <BackgroundBeams count={7} className="opacity-70" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 text-center sm:px-8 lg:px-10">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#E3DCD3] bg-white/90 px-7 py-2 shadow-[0_18px_32px_rgba(49,45,43,0.08)] backdrop-blur mb-4">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#4338ca] shadow-[0_0_20px_rgba(67,56,202,0.55)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#433026]">DialZero Agentic Control Loop</p>
        </div>

        <div className="flex flex-col items-center gap-0">
          <h2 className="text-balance text-3xl font-semibold leading-tight text-[#1F1B16] md:text-[40px] md:leading-tight">
            Research, call orchestration, and oversight in a single visual
          </h2>
          <p className="max-w-3xl text-base leading-7 text-[#564C46] md:text-lg">
            Every engagement runs on a transparent loop: founders capture intent, GPT-OSS and Firecrawl assemble the plan, Dial0 VAPI executes with cloned voices, and Convex streams transcripts, reports, and alerts back to your team in real time.
          </p>
        </div>

        <div className="relative w-full max-w-[880px] mt-0">
          <div
            ref={containerRef}
            className="mermaid relative mx-auto flex max-w-full justify-center overflow-x-auto py-0 [&_path]:stroke-linecap:round [&_svg]:max-w-none [&_svg]:drop-shadow-[0_12px_20px_rgba(49,45,43,0.1)] [&_svg]:scale-[0.82] [&_text]:fill-[#2F2722] [&_text]:font-medium [&_text]:tracking-tight [&_*]:font-[inherit]"
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          {error ? (
            <div className="mt-3 text-sm font-medium text-red-500">{error}</div>
          ) : null}

          {!svg && !error ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[#6B6159]">
              Rendering orchestration flow…
            </div>
          ) : null}

          <div className="pointer-events-none mt-0 flex w-full flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#6B6159]">
            <span>Closed-loop research</span>
            <span className="text-[#C4BCB5]">→</span>
            <span>Context</span>
            <span className="text-[#C4BCB5]">→</span>
            <span>Call execution</span>
            <span className="text-[#C4BCB5]">→</span>
            <span>Insight</span>
            <span className="text-[#C4BCB5]">→</span>
            <span>Replan</span>
          </div>
        </div>

        <div className="grid w-full gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {legendItems.map((item) => (
            <div
              key={item.label}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${item.accentClass} p-[1.5px] shadow-[0_16px_32px_rgba(49,45,43,0.08)]`}
            >
              <div className="relative h-full rounded-[26px] bg-white/92 p-5">
                <span className={`mb-3 inline-flex h-2.5 w-2.5 rounded-full ${item.dotClass} shadow-[0_0_10px_rgba(49,45,43,0.18)]`} />
                <h3 className="text-sm font-semibold text-[#2F2722]">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5F554F]">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
