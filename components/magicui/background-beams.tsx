"use client"
import { useMemo } from "react"

interface BeamSpec {
  id: number
  delay: number
  duration: number
  rotate: number
  top: string
}

/**
 * BackgroundBeams – lightweight animated gradient beams.
 * Pure CSS animations with randomized timings; no continuous JS loop.
 */
export function BackgroundBeams({ count = 5, className = "" }: { count?: number; className?: string }) {
  const beams: BeamSpec[] = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      delay: Math.random() * 6,
      duration: 8 + Math.random() * 6,
      rotate: -8 + Math.random() * 16,
      top: `${10 + Math.random() * 70}%`,
    }))
  }, [count])

  return (
    <div aria-hidden className={"pointer-events-none absolute inset-0 overflow-hidden " + className}>
      {beams.map(b => (
        <span
          key={b.id}
          style={
            {
              ["--d" as any]: `${b.duration}s`,
              ["--dl" as any]: `${b.delay}s`,
              ["--r" as any]: `${b.rotate}deg`,
              top: b.top,
            } as any
          }
          className="animate-[beamSlide_var(--d)_linear_infinite] [animation-delay:var(--dl)] absolute left-[-40%] h-px w-[55%] origin-left rotate-[var(--r)] bg-gradient-to-r from-transparent via-foreground/30 to-transparent blur-[2px] dark:via-foreground/40" />
      ))}
    </div>
  )
}
