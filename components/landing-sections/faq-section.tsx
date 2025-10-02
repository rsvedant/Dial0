"use client"

import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is DialZero?",
    answer:
      "DialZero is your AI advocate for customer service escalations. Upload evidence, choose the target company, and our voice agent calls, cites policy, and keeps you updated until the issue is closed.",
  },
  {
    question: "How does the AI voice advocate work?",
    answer:
      "DialZero clones your voice, builds a brief from Convex and Inkeep research, then navigates IVRs, escalates, and confirms commitments. You monitor transcripts live and can intervene anytime.",
  },
  {
    question: "What information do you need from me?",
    answer:
      "Start with a short description, supporting receipts or call logs, and the desired outcome. The more context you share, the better our scripts and citations land on the call.",
  },
  {
    question: "What if a human needs to join the escalation?",
    answer:
      "You can hop in from the dashboard, trigger a callback, or hand off to a teammate. DialZero keeps the line warm and summarizes everything that happened before you join.",
  },
  {
    question: "How does DialZero handle security and compliance?",
    answer:
      "We encrypt data at rest and in transit, offer SOC 2-ready controls, and support regional data residency. Enterprise plans include custom retention and audit configurations.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create an account, record your voice sample, and drop your first case into the dashboard. Most teams send their first DialZero escalation within fifteen minutes.",
  },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  return (
    <div className="w-full flex justify-center items-start">
      <div className="flex-1 px-4 md:px-12 py-16 md:py-20 flex flex-col lg:flex-row justify-start items-start gap-6 lg:gap-12">
        {/* Left Column - Header */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-start gap-4 lg:py-5">
          <div className="w-full flex flex-col justify-center text-[#49423D] font-semibold leading-tight md:leading-[44px] font-sans text-4xl tracking-tight">
            Answers before you hand off the call
          </div>
          <div className="w-full text-[#605A57] text-base font-normal leading-7 font-sans">
            Everything you should know about how DialZero researches, dials, and escalates on your behalf.
          </div>
        </div>

        {/* Right Column - FAQ Items */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-center">
          <div className="w-full flex flex-col">
            {faqData.map((item, index) => {
              const isOpen = openItems.includes(index)

              return (
                <div key={index} className="w-full border-b border-[rgba(73,66,61,0.16)] overflow-hidden">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-5 py-[18px] flex justify-between items-center gap-5 text-left hover:bg-[rgba(73,66,61,0.02)] transition-colors duration-200"
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 text-[#49423D] text-base font-medium leading-6 font-sans">
                      {item.question}
                    </div>
                    <div className="flex justify-center items-center">
                      <ChevronDownIcon
                        className={`w-6 h-6 text-[rgba(73,66,61,0.60)] transition-transform duration-300 ease-in-out ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-5 pb-[18px] text-[#605A57] text-sm font-normal leading-6 font-sans">
                      {item.answer}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
