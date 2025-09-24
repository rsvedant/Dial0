"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Menu, Plus, CheckCircle2, MailWarning } from "lucide-react"
import type { IssueListItem } from "@/types/issue"
import { UpdateAvatarCard, RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui"

// Local card wrapper to mimic Better Auth UI styling for custom fields
function FieldRow({
  label,
  children,
  dirty,
  saving,
  onSave,
}: {
  label: string
  children: React.ReactNode
  dirty: boolean
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 items-start py-3 group">
      <Label className="sm:mt-2 text-sm font-medium flex items-center gap-2">
        {label}
        {dirty && <span className="text-xs font-normal text-primary">• unsaved</span>}
      </Label>
      <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">{children}</div>
        {dirty && (
          <Button size="sm" variant="outline" disabled={saving} onClick={onSave} className="self-start">
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </div>
  )
}

function EmailVerificationCard() {
  // Use debugAuthUserShape to introspect emailVerified if available
  const authShape = useQuery(api.orchestration.debugAuthUserShape, {}) as any
  const emailVerified = authShape?.authUser?.emailVerified || authShape?.authUser?.email_verified
  const email = authShape?.authUser?.email

  // Placeholder resend logic (not enabled yet) — will show disabled button
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Email status</h3>
          <p className="text-xs text-muted-foreground">{email ? email : "No email on file"}</p>
        </div>
        {emailVerified ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4" /> Verified
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <MailWarning className="h-4 w-4" /> Unverified
          </div>
        )}
      </div>
      {!emailVerified && (
        <p className="text-xs text-muted-foreground">
          Email verification is not yet enabled in auth configuration. Once enabled, a verify button will appear here.
        </p>
      )}
      {!emailVerified && (
        <Button size="sm" variant="outline" disabled className="w-fit">
          Send verification email
        </Button>
      )}
    </div>
  )
}

export function AccountSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const browserTimezone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const existing = useQuery(api.orchestration.getSettings, {}) as any | null | undefined
  const saveSettings = useMutation(api.orchestration.saveSettings)
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const issues: IssueListItem[] = React.useMemo(() => {
    if (!convexIssues) return []
    return convexIssues.map((doc: any) => ({
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

  // Field states
  const [values, setValues] = React.useState({
    firstName: "",
    lastName: "",
    birthdate: "",
    email: "",
    phone: "",
    address: "",
    selectedVoice: "",
  })
  const initialRef = React.useRef<typeof values | null>(null)
  const [saving, setSaving] = React.useState<{ [K in keyof typeof values]?: boolean }>({})

  React.useEffect(() => {
    if (!existing) return
    const next = {
      firstName: existing.firstName ?? "",
      lastName: existing.lastName ?? "",
      birthdate: existing.birthdate ?? "",
      email: existing.email ?? "",
      phone: existing.phone ?? "",
      address: existing.address ?? "",
      selectedVoice: existing.selectedVoice ?? "",
    }
    setValues(next)
    if (!initialRef.current) initialRef.current = next
  }, [existing])

  const displayedTimezone = existing?.timezone ?? browserTimezone

  const dirty = (field: keyof typeof values) => {
    if (!initialRef.current) return false
    return initialRef.current[field] !== values[field]
  }

  const saveField = async (field: keyof typeof values) => {
    try {
      setSaving((s) => ({ ...s, [field]: true }))
      await saveSettings({ [field]: values[field] } as any)
      // Update baseline
      if (initialRef.current) {
        initialRef.current = { ...initialRef.current, [field]: values[field] }
      }
      toast({ title: "Saved", description: `${field} updated.` })
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message ?? "Please try again." })
    } finally {
      setSaving((s) => ({ ...s, [field]: false }))
    }
  }

  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">
          {/* Mobile header */}
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
          {sidebarOpen && (<div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />)}
          <div className={`fixed inset-y-0 left-0 z-50 w-64 h-screen transform ios-transition ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            <IssuesSidebar
              issues={issues as any}
              selectedIssueId={null}
              onSelectIssue={(id) => { router.push(`/?issueId=${id}`) }}
              onGoHome={() => router.push("/")}
              onCloseSidebar={() => setSidebarOpen(false)}
            />
          </div>
          <div className="mx-auto w-full max-w-5xl px-6 pt-20 lg:pt-10 pb-24 animate-fade-in-up">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your personal details & profile.</p>
            </div>

            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              {/* Left column: custom form fields */}
              <div className="grid gap-8 order-1">
                <section>
                  <h2 className="text-base font-semibold">Voice Assistant</h2>
                  <p className="text-sm text-muted-foreground">Configure your preferred voice</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/account/create-voice")}
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
                    We pass these details to agents to accelerate resolution. Time zone helps us schedule call-backs.
                  </AlertDescription>
                </Alert>

                <section>
                  <h2 className="text-base font-semibold">Personal information</h2>
                  <p className="text-sm text-muted-foreground">Your basic profile details</p>
                  <div className="mt-4 divide-y">
                    <FieldRow label="First name" dirty={dirty("firstName")} saving={!!saving.firstName} onSave={() => saveField("firstName")}> 
                      <Input value={values.firstName} onChange={(e) => setValues(v => ({ ...v, firstName: e.target.value }))} placeholder="Jane" autoComplete="given-name" />
                    </FieldRow>
                    <FieldRow label="Last name" dirty={dirty("lastName")} saving={!!saving.lastName} onSave={() => saveField("lastName")}> 
                      <Input value={values.lastName} onChange={(e) => setValues(v => ({ ...v, lastName: e.target.value }))} placeholder="Doe" autoComplete="family-name" />
                    </FieldRow>
                    <FieldRow label="Date of birth" dirty={dirty("birthdate")} saving={!!saving.birthdate} onSave={() => saveField("birthdate")}> 
                      <Input type="date" value={values.birthdate} onChange={(e) => setValues(v => ({ ...v, birthdate: e.target.value }))} autoComplete="bday" />
                    </FieldRow>
                  </div>
                </section>

                <section>
                  <h2 className="text-base font-semibold">Contact information</h2>
                  <p className="text-sm text-muted-foreground">How we can reach you</p>
                  <div className="mt-4 divide-y">
                    <FieldRow label="Email" dirty={dirty("email")} saving={!!saving.email} onSave={() => saveField("email")}> 
                      <Input type="email" value={values.email} onChange={(e) => setValues(v => ({ ...v, email: e.target.value }))} placeholder="jane.doe@example.com" autoComplete="email" />
                    </FieldRow>
                    <FieldRow label="Phone" dirty={dirty("phone")} saving={!!saving.phone} onSave={() => saveField("phone")}> 
                      <Input type="tel" value={values.phone} onChange={(e) => setValues(v => ({ ...v, phone: e.target.value }))} placeholder="(555) 123-4567" autoComplete="tel" />
                    </FieldRow>
                    <FieldRow label="Address" dirty={dirty("address")} saving={!!saving.address} onSave={() => saveField("address")}> 
                      <Input value={values.address} onChange={(e) => setValues(v => ({ ...v, address: e.target.value }))} placeholder="123 Main St, City, State" autoComplete="street-address" />
                    </FieldRow>
                  </div>
                </section>

                <section>
                  <h2 className="text-base font-semibold">Preferences</h2>
                  <p className="text-sm text-muted-foreground">Regional preferences</p>
                  <div className="mt-4 divide-y">
                    <div className="grid gap-4 sm:grid-cols-3 items-start py-3">
                      <Label className="sm:mt-2 text-sm font-medium">Time zone</Label>
                      <div className="sm:col-span-2">
                        <Input readOnly value={displayedTimezone} />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right column: Account management subset */}
              <div className="flex flex-col gap-6 order-2">
                <UpdateAvatarCard />
                <EmailVerificationCard />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  )
}
