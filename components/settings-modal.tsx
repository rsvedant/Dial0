"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreditCard, Shield, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountSettingsEmbed } from "@/components/account-settings-embed"
import { SecuritySettingsEmbed } from "@/components/security-settings-embed"
import { BillingEmbed } from "@/components/billing-embed"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsSection = "profile" | "billing" | "security"

const settingsOptions = [
  {
    id: "profile" as SettingsSection,
    label: "Profile",
    icon: User,
    description: "Manage your account information"
  },
  {
    id: "billing" as SettingsSection,
    label: "Billing & Usage",
    icon: CreditCard,
    description: "View billing details and usage"
  },
  {
    id: "security" as SettingsSection,
    label: "Security",
    icon: Shield,
    description: "Manage security settings"
  }
]

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <AccountSettingsEmbed />
      case "billing":
        return <BillingEmbed />
      case "security":
        return <SecuritySettingsEmbed />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] sm:!max-w-[90vw] w-full h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-2.5 border-b shrink-0">
          <DialogTitle className="text-base font-medium">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left sidebar */}
          <div className="w-64 border-r bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                {settingsOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.id}
                      onClick={() => setActiveSection(option.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                        "hover:bg-muted/40",
                        activeSection === option.id && "bg-muted/60"
                      )}
                    >
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
          
          {/* Main content */}
          <div className="flex-1 overflow-hidden bg-background">
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto px-8 py-6">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}