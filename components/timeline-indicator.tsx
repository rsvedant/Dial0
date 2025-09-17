"use client"

import { cn } from "@/lib/utils"
import { MessageCircle, Clock, CheckCircle2, AlertTriangle, Bug, Zap, Shield } from "lucide-react"

interface TimelineIndicatorProps {
  status: "open" | "in-progress" | "resolved"
  issueType?: string
}

const timelineSteps = [
  { id: "reported", label: "Reported", icon: AlertTriangle },
  { id: "investigating", label: "Investigating", icon: Bug },
  { id: "fixing", label: "Fixing", icon: Zap },
  { id: "testing", label: "Testing", icon: Shield },
  { id: "resolved", label: "Resolved", icon: CheckCircle2 },
]

const statusToStep = {
  open: "reported",
  "in-progress": "investigating", 
  resolved: "resolved"
}

export function TimelineIndicator({ status, issueType }: TimelineIndicatorProps) {
  const currentStep = statusToStep[status]
  const currentStepIndex = timelineSteps.findIndex(step => step.id === currentStep)
  
  return (
    <div className="flex items-center gap-2">
      {timelineSteps.map((step, index) => {
        const StepIcon = step.icon
        const isActive = index <= currentStepIndex
        const isCurrent = index === currentStepIndex
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                isActive
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-border text-muted-foreground",
                isCurrent && "ring-2 ring-primary/20 scale-110"
              )}
            >
              <StepIcon className="h-4 w-4" />
            </div>
            {index < timelineSteps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1 transition-all duration-300",
                  isActive ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
