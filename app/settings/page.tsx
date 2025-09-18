"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { Menu, Plus } from "lucide-react"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { Logo } from "@/components/logo"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProfilePage() {
  const browserTimezone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const { toast } = useToast()
  const existing = useQuery(api.orchestration.getSettings, {}) as any | null | undefined
  const saveSettings = useMutation(api.orchestration.saveSettings)
  const router = useRouter()
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const issues = React.useMemo(() => {
    if (!convexIssues) return [] as any[]
    return convexIssues.map((doc) => ({
      id: doc._id,
      title: doc.title,
      status: doc.status,
      createdAt: new Date(doc.createdAt),
      messages: [],
      messageCount: doc.messageCount,
      lastMessage: doc.lastMessage,
    }))
  }, [convexIssues])
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [birthdate, setBirthdate] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [selectedVoice, setSelectedVoice] = React.useState("")

  // Mock voice options - in a real app, these would come from an API
  const voiceOptions = [
    { id: "voice-1", name: "Sarah - Professional" },
  ]

  React.useEffect(() => {
    if (!existing) return
    setFirstName(existing.firstName ?? "")
    setLastName(existing.lastName ?? "")
    setBirthdate(existing.birthdate ?? "")
    setEmail(existing.email ?? "")
    setPhone(existing.phone ?? "")
    setAddress(existing.address ?? "")
    setSelectedVoice(existing.selectedVoice ?? "")
  }, [existing])

  const displayedTimezone = existing?.timezone ?? browserTimezone

  const onSave = async () => {
    try {
      setIsSaving(true)
      await saveSettings({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        birthdate: birthdate || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        timezone: displayedTimezone || undefined,
        selectedVoice: selectedVoice || undefined,
      })
      toast({ title: "Saved", description: "Your settings have been updated." })
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message ?? "Please try again.", })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm ios-no-bounce ios-mobile-header px-4 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="animate-scale-in h-12 w-12 p-0 ios-button icon-only large scale-150 lg:scale-100"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Logo width={120} height={30} />
        <div className="w-12" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 h-screen
        transform ios-transition
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <IssuesSidebar
          issues={issues as any}
          selectedIssueId={null}
          onSelectIssue={(id) => {
            router.push(`/?issueId=${id}`)
          }}
          onGoHome={() => router.push("/")}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 pt-20 lg:pt-6 pb-24 animate-fade-in-up">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal and contact information.</p>
        </div>

        <div className="grid gap-8">
          {/* Voice Selection Section */}
          <section>
            <h2 className="text-base font-semibold">Voice Assistant</h2>
            <p className="text-sm text-muted-foreground">Choose your preferred voice for calls and interactions</p>
            <div className="mt-4 flex items-center gap-3">
              {/* <div className="flex-1">
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a voice..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/profile/create-voice")}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Voice
              </Button>
            </div>
          </section>
          <Alert>
            <AlertTitle>How we use your details</AlertTitle>
            <AlertDescription>
              We automatically pass these details to our customer service agents to help resolve your issues faster.
              For example, your time zone helps us determine a convenient time for call-backs.
            </AlertDescription>
          </Alert>

          <section>
            <h2 className="text-base font-semibold">Personal information</h2>
            <p className="text-sm text-muted-foreground">Your basic profile details</p>
            <div className="mt-4 divide-y">
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="firstName" className="sm:mt-0">First name</Label>
                <div className="sm:col-span-2">
                  <Input id="firstName" placeholder="Jane" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="lastName" className="sm:mt-0">Last name</Label>
                <div className="sm:col-span-2">
                  <Input id="lastName" placeholder="Doe" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="dob" className="sm:mt-0">Date of birth</Label>
                <div className="sm:col-span-2">
                  <Input id="dob" type="date" autoComplete="bday" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold">Contact information</h2>
            <p className="text-sm text-muted-foreground">How we can reach you</p>
            <div className="mt-4 divide-y">
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="email" className="sm:mt-0">Email</Label>
                <div className="sm:col-span-2">
                  <Input id="email" type="email" placeholder="jane.doe@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="phone" className="sm:mt-0">Phone number</Label>
                <div className="sm:col-span-2">
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="address" className="sm:mt-0">Address</Label>
                <div className="sm:col-span-2">
                  <Input id="address" placeholder="123 Main St, City, State" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold">Preferences</h2>
            <p className="text-sm text-muted-foreground">Regional preferences</p>
            <div className="mt-4 divide-y">
              <div className="grid gap-4 sm:grid-cols-3 items-center py-3">
                <Label htmlFor="timezone" className="sm:mt-0">Time zone</Label>
                <div className="sm:col-span-2">
                  <Input id="timezone" value={displayedTimezone} readOnly />
                </div>
              </div>
            </div>
          </section>

          {/* Bottom actions */}
          <div className="mt-8 pt-4 border-t">
            <div className="flex justify-end">
              <Button onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


