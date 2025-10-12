"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Menu, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  User, 
  FileText,
  PhoneOff,
  Info,
  Plus,
  X
} from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

interface DemoIssueDashboardProps {
  issueId: string
  onOpenMenu: () => void
}

export function DemoIssueDashboard({ issueId, onOpenMenu }: DemoIssueDashboardProps) {
  // Determine which demo to show based on issueId
  if (issueId === "demo-needs-info") {
    return <NeedsMoreInfoDashboard onOpenMenu={onOpenMenu} />
  } else if (issueId === "demo-resolved") {
    return <ResolvedDashboard onOpenMenu={onOpenMenu} />
  } else if (issueId === "demo-email-sent") {
    return <EmailSentDashboard onOpenMenu={onOpenMenu} />
  }
  
  return null
}

type TimeSlot = {
  id: string
  date: string
  timeStart: string
  timeEnd: string
}

function NeedsMoreInfoDashboard({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: '1', date: '', timeStart: '', timeEnd: '' }
  ])
  
  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { id: Date.now().toString(), date: '', timeStart: '', timeEnd: '' }])
  }
  
  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id))
    }
  }
  
  const updateTimeSlot = (id: string, field: keyof TimeSlot, value: string) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ))
  }
  
  const isFormValid = timeSlots.every(slot => slot.date && slot.timeStart && slot.timeEnd)
  
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm border-b border-border px-4 lg:hidden h-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMenu}
          className="h-12 w-12 p-0"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Logo width={120} height={30} />
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        {/* Header Section - Full Width */}
        <div className="bg-muted/30 border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Internet Outage - Technician Visit</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Issue #DEM-001</span>
                <span>•</span>
                <span>Created 2 hours ago</span>
                <span>•</span>
                <span>Call completed at 2:34 PM</span>
                <span>•</span>
                <span>Spectrum Internet</span>
              </div>
            </div>
            <Badge variant="secondary" className="whitespace-nowrap">
              <AlertCircle className="h-3 w-3 mr-1" />
              Awaiting Input
            </Badge>
          </div>
        </div>

        <div className="max-w-4xl mx-auto pb-24">

          <div className="p-6 space-y-4">
            {/* Status Alert - Reduced Padding */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Additional Information Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Your ISP has confirmed a service issue at your location. To schedule a technician visit, they need your availability preferences.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Select Your Availability
                </CardTitle>
                <CardDescription>Choose dates and times when you're available for a technician visit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeSlots.map((slot, index) => (
                  <div key={slot.id} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Time Slot {index + 1}</p>
                      {timeSlots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(slot.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Date</label>
                        <Select value={slot.date} onValueChange={(value) => updateTimeSlot(slot.id, 'date', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select date" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2025-10-14">Monday, Oct 14</SelectItem>
                            <SelectItem value="2025-10-15">Tuesday, Oct 15</SelectItem>
                            <SelectItem value="2025-10-16">Wednesday, Oct 16</SelectItem>
                            <SelectItem value="2025-10-17">Thursday, Oct 17</SelectItem>
                            <SelectItem value="2025-10-18">Friday, Oct 18</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                        <Select value={slot.timeStart} onValueChange={(value) => updateTimeSlot(slot.id, 'timeStart', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Start" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="08:00">8:00 AM</SelectItem>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="12:00">12:00 PM</SelectItem>
                            <SelectItem value="13:00">1:00 PM</SelectItem>
                            <SelectItem value="14:00">2:00 PM</SelectItem>
                            <SelectItem value="15:00">3:00 PM</SelectItem>
                            <SelectItem value="16:00">4:00 PM</SelectItem>
                            <SelectItem value="17:00">5:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">End Time</label>
                        <Select value={slot.timeEnd} onValueChange={(value) => updateTimeSlot(slot.id, 'timeEnd', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="End" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="12:00">12:00 PM</SelectItem>
                            <SelectItem value="13:00">1:00 PM</SelectItem>
                            <SelectItem value="14:00">2:00 PM</SelectItem>
                            <SelectItem value="15:00">3:00 PM</SelectItem>
                            <SelectItem value="16:00">4:00 PM</SelectItem>
                            <SelectItem value="17:00">5:00 PM</SelectItem>
                            <SelectItem value="18:00">6:00 PM</SelectItem>
                            <SelectItem value="19:00">7:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addTimeSlot}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Time Slot
                </Button>
                
                <Button className="w-full" disabled={!isFormValid}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Availability
                </Button>
              </CardContent>
            </Card>

            {/* Call Summary & Timeline */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Summary
              </CardTitle>
              <CardDescription>Call completed at 2:34 PM today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">Spectrum Internet</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">4 minutes 23 seconds</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Agent</p>
                  <p className="font-medium">Sarah Johnson</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-medium">#SR-2849573</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Call Connected</p>
                      <p className="text-muted-foreground text-xs">2:30 PM</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Issue Diagnosed</p>
                      <p className="text-muted-foreground text-xs">Service outage confirmed</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Awaiting Availability</p>
                      <p className="text-muted-foreground text-xs">Please provide time slots below</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  )
}function ResolvedDashboard({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm border-b border-border px-4 lg:hidden h-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMenu}
          className="h-12 w-12 p-0"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Logo width={120} height={30} />
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto pb-24">
          {/* Header Section - Full Width */}
          <div className="bg-muted/30 border-b border-border px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">AC Not Working - Service Scheduled</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Issue #DEM-002</span>
                  <span>•</span>
                  <span>Resolved 5 hours ago</span>
                  <span>•</span>
                  <span>Call completed at 10:42 AM</span>
                  <span>•</span>
                  <span>CoolAir HVAC Services</span>
                </div>
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Appointment Confirmed
              </CardTitle>
              <CardDescription>Your service visit has been scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Tuesday, October 15, 2025</p>
                    <p className="text-xs text-muted-foreground">2:00 PM - 4:00 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Mike Rodriguez</p>
                    <p className="text-xs text-muted-foreground">Certified HVAC Technician</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">CoolAir HVAC Services</p>
                    <p className="text-xs text-muted-foreground">Service Ticket #SVC-9482</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Summary & Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Details
              </CardTitle>
              <CardDescription>Call completed at 10:42 AM • Duration: 6 min 47 sec</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Technician will call 30 minutes before arrival</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Standard diagnostic fee: $75 (waived if repair is done)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Average repair time: 1-2 hours</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>All parts covered by 1-year warranty</span>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailSentDashboard({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [attachmentType, setAttachmentType] = useState("")
  const [notes, setNotes] = useState("")
  
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm border-b border-border px-4 lg:hidden h-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMenu}
          className="h-12 w-12 p-0"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Logo width={120} height={30} />
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto pb-24">
          {/* Header Section - Full Width */}
          <div className="bg-muted/30 border-b border-border px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Billing Dispute - Weekend Hours</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Issue #DEM-003</span>
                  <span>•</span>
                  <span>Created 30 minutes ago</span>
                  <span>•</span>
                  <span>Email sent at 11:17 AM</span>
                  <span>•</span>
                  <span>Verizon Wireless</span>
                </div>
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                <Mail className="h-3 w-3 mr-1" />
                Email Sent
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">

          {/* Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Email Sent on Your Behalf</h3>
                  <p className="text-sm text-muted-foreground">
                    The company's phone lines are closed for the weekend. We've sent a detailed email explaining your billing concern to their support team.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expected response: 1-2 business days (Monday-Tuesday)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Summary
              </CardTitle>
              <CardDescription>Sent to billing@verizon.com at 11:17 AM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">Verizon Wireless</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">Delivered</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Subject</p>
                  <p className="font-medium text-xs">Billing Dispute - Account #8492-3847</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Amount Disputed</p>
                  <p className="font-medium">$87.50</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Key Points in Email:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Disputed unexpected overage charges</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Referenced unlimited data plan</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Requested account review and refund</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Mentioned 5-year customer history</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Supporting Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Supporting Documentation
              </CardTitle>
              <CardDescription>Strengthen your case with additional information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={attachmentType} onValueChange={setAttachmentType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bill">Bill/Invoice Copy</SelectItem>
                    <SelectItem value="plan">Plan Details Screenshot</SelectItem>
                    <SelectItem value="usage">Usage History</SelectItem>
                    <SelectItem value="chat">Previous Chat Transcript</SelectItem>
                    <SelectItem value="other">Other Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Notes (Optional)</label>
                <Select value={notes} onValueChange={setNotes}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select if applicable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dates">Specific dates of overages</SelectItem>
                    <SelectItem value="previous">Previous billing disputes</SelectItem>
                    <SelectItem value="upgrade">Recent plan upgrade issues</SelectItem>
                    <SelectItem value="promise">Service promise not fulfilled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="w-full" disabled={!attachmentType}>
                <Plus className="h-4 w-4 mr-2" />
                Attach Documentation
              </Button>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TimelineItemProps {
  icon: React.ElementType
  title: string
  description: string
  time: string
  status: "completed" | "current" | "pending"
}

function TimelineItem({ icon: Icon, title, description, time, status }: TimelineItemProps) {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
            status === "completed" && "bg-green-500/20",
            status === "current" && "bg-blue-500/20",
            status === "pending" && "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              status === "completed" && "text-green-500",
              status === "current" && "text-blue-500",
              status === "pending" && "text-muted-foreground"
            )}
          />
        </div>
        {status !== "pending" && (
          <div
            className={cn(
              "w-px flex-1 mt-2 mb-2",
              status === "completed" && "bg-green-500/20",
              status === "current" && "bg-blue-500/20"
            )}
          />
        )}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4
            className={cn(
              "font-medium text-sm",
              status === "pending" && "text-muted-foreground"
            )}
          >
            {title}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
        </div>
        <p
          className={cn(
            "text-sm",
            status === "pending" ? "text-muted-foreground" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      </div>
    </div>
  )
}
