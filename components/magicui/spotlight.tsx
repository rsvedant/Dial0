"use client"
import { useEffect, useRef } from "react"

interface SpotlightProps {
  size?: number
  className?: string
  colorLight?: string
  colorDark?: string
}

/**
 * Spotlight – follows pointer with a subtle radial focus glow.
 * Uses a single absolutely positioned div; no expensive listeners.
 */
export function Spotlight({
  size = 520,
  className = "",
  colorLight = "oklch(0.95 0 0 / 0.9)",
  colorDark = "oklch(0.35 0 0 / 0.85)",
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function move(e: PointerEvent) {
      if (!el) return
      const parent = el.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el.style.setProperty("--x", `${x}px`)
      el.style.setProperty("--y", `${y}px`)
    }
    window.addEventListener("pointermove", move, { passive: true })
    return () => window.removeEventListener("pointermove", move)
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 [mask:radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),black_0%,transparent_${size}px)] transition-[background] ${className}`}
      style={{
        background: `radial-gradient(circle at var(--x,50%) var(--y,50%), ${colorLight}, transparent 65%)`,
      }}
      data-dark-gradient={`radial-gradient(circle at var(--x,50%) var(--y,50%), ${colorDark}, transparent 65%)`}
    />
  )
}
