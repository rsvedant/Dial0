import type { Metadata } from "next"

import LandingPage from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "DialZero – AI Advocates That Finish the Call",
  description:
    "Clone your voice, drop the case, and let DialZero escalate with transcripts, recordings, and real-time updates streaming back to your dashboard.",
}

export default function Page() {
  return <LandingPage />
}
