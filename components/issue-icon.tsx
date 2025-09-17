"use client"

import { cn } from "@/lib/utils"
import { 
  Bug, 
  AlertTriangle, 
  Zap, 
  Shield, 
  Database, 
  Globe, 
  Smartphone, 
  Monitor,
  MessageCircle,
  FileText,
  Settings,
  Users
} from "lucide-react"

interface IssueIconProps {
  issueId: string
  issueType?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

// Generate consistent icon based on issue ID
const getIssueIcon = (issueId: string, issueType?: string) => {
  const iconMap = [
    Bug, AlertTriangle, Zap, Shield, Database, Globe, 
    Smartphone, Monitor, MessageCircle, FileText, Settings, Users
  ]
  
  // Use issue ID to consistently pick an icon
  const hash = issueId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const iconIndex = hash % iconMap.length
  
  return iconMap[iconIndex]
}

export function IssueIcon({ issueId, issueType, size = "md", className }: IssueIconProps) {
  const Icon = getIssueIcon(issueId, issueType)
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  }
  
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full bg-primary text-primary-foreground",
      size === "sm" && "w-6 h-6",
      size === "md" && "w-8 h-8", 
      size === "lg" && "w-10 h-10",
      className
    )}>
      <Icon className={sizeClasses[size]} />
    </div>
  )
}
