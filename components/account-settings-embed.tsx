"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Plus, CheckCircle2, MailWarning } from "lucide-react"
import { VoiceSelector } from "@/components/voice-selector"

const FALLBACK_TIMEZONES = [
  "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Phoenix",
  "America/Denver", "America/Chicago", "America/New_York", "America/Sao_Paulo",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Europe/Rome", "Europe/Warsaw", "Africa/Johannesburg", "Asia/Dubai",
  "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
]

const RAW_TIMEZONES: string[] = typeof Intl.supportedValuesOf === "function"
  ? (Intl.supportedValuesOf("timeZone") as string[])
  : FALLBACK_TIMEZONES

const TIMEZONE_OPTIONS = RAW_TIMEZONES.slice().sort((a, b) => a.localeCompare(b))
  .map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }))

const INPUT_FOCUS_CLASS = "placeholder:text-neutral-500 focus-visible:ring-transparent focus-visible:border-foreground/40 focus:outline-none"
const SELECT_TRIGGER_CLASS = "focus-visible:ring-transparent focus-visible:border-foreground/40 focus:outline-none"

function FieldRow({ label, children, dirty, saving, onSave }: {
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
  const authShape = useQuery(api.orchestration.debugAuthUserShape, {}) as any
  const emailVerified = authShape?.authUser?.emailVerified || authShape?.authUser?.email_verified
  const email = authShape?.authUser?.email

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Email status</h3>
          <p className="text-xs text-muted-foreground">{email || "No email on file"}</p>
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
          Email verification is not yet enabled in auth configuration.
        </p>
      )}
    </div>
  )
}

export function AccountSettingsEmbed() {
  const router = useRouter()
  const { toast } = useToast()
  const browserTimezone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const existing = useQuery(api.orchestration.getSettings, {}) as any | null | undefined
  const saveSettings = useMutation(api.orchestration.saveSettings)

  const [values, setValues] = React.useState({
    firstName: "", lastName: "", birthdate: "", email: "", phone: "", address: "",
    selectedVoice: "", timezone: browserTimezone, testModeEnabled: false, testModeNumber: "",
  })
  const initialRef = React.useRef<typeof values | null>(null)
  const [saving, setSaving] = React.useState<{ [K in keyof typeof values]?: boolean }>({})

  React.useEffect(() => {
    if (!existing) return
    const next = {
      firstName: existing.firstName ?? "", lastName: existing.lastName ?? "",
      birthdate: existing.birthdate ?? "", email: existing.email ?? "",
      phone: existing.phone ?? "", address: existing.address ?? "",
      selectedVoice: existing.selectedVoice ?? "", timezone: existing.timezone ?? browserTimezone,
      testModeEnabled: existing.testModeEnabled ?? false, testModeNumber: existing.testModeNumber ?? "",
    }
    setValues(next)
    if (!initialRef.current) initialRef.current = next
  }, [existing, browserTimezone])

  const dirty = (field: keyof typeof values) => {
    if (!initialRef.current) return false
    return initialRef.current[field] !== values[field]
  }

  const saveField = async (field: keyof typeof values) => {
    try {
      setSaving((s) => ({ ...s, [field]: true }))
      await saveSettings({ [field]: values[field] } as any)
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
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Profile Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal details & profile.</p>
      </div>

      <div className="grid gap-8">
        <section>
          <h4 className="text-base font-semibold mb-2">Voice Assistant</h4>
          <p className="text-sm text-muted-foreground mb-4">Configure your preferred voice</p>
          <div className="flex flex-col gap-3">
            <FieldRow label="Selected Voice" dirty={dirty("selectedVoice")} saving={!!saving.selectedVoice} onSave={() => saveField("selectedVoice")}>
              <VoiceSelector
                value={values.selectedVoice}
                onChange={(value) => setValues(v => ({ ...v, selectedVoice: value }))}
                userVoiceId={existing?.voiceId}
                userVoiceName={values.firstName ? `${values.firstName}'s Voice` : "Your Voice"}
              />
            </FieldRow>
            <Button variant="outline" size="sm" onClick={() => router.push("/account/create-voice")} className="flex items-center gap-2 w-fit">
              <Plus className="h-4 w-4" />
              Create Custom Voice
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
          <h4 className="text-base font-semibold mb-2">Personal information</h4>
          <p className="text-sm text-muted-foreground mb-4">Your basic profile details</p>
          <div className="divide-y">
            <FieldRow label="First name" dirty={dirty("firstName")} saving={!!saving.firstName} onSave={() => saveField("firstName")}>
              <Input value={values.firstName} onChange={(e) => setValues(v => ({ ...v, firstName: e.target.value }))} placeholder="Jane" autoComplete="given-name" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
            <FieldRow label="Last name" dirty={dirty("lastName")} saving={!!saving.lastName} onSave={() => saveField("lastName")}>
              <Input value={values.lastName} onChange={(e) => setValues(v => ({ ...v, lastName: e.target.value }))} placeholder="Doe" autoComplete="family-name" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
            <FieldRow label="Date of birth" dirty={dirty("birthdate")} saving={!!saving.birthdate} onSave={() => saveField("birthdate")}>
              <Input type="date" value={values.birthdate} onChange={(e) => setValues(v => ({ ...v, birthdate: e.target.value }))} autoComplete="bday" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
          </div>
        </section>

        <section>
          <h4 className="text-base font-semibold mb-2">Preferences</h4>
          <p className="text-sm text-muted-foreground mb-4">Regional preferences & testing</p>
          <div className="divide-y">
            <FieldRow label="Time zone" dirty={dirty("timezone")} saving={!!saving.timezone} onSave={() => saveField("timezone")}>
              <Select value={values.timezone} onValueChange={(value) => setValues((v) => ({ ...v, timezone: value }))}>
                <SelectTrigger className={cn("w-full", SELECT_TRIGGER_CLASS)}>
                  <SelectValue placeholder="Select a time zone" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Test mode" dirty={dirty("testModeEnabled")} saving={!!saving.testModeEnabled} onSave={() => saveField("testModeEnabled")}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Switch checked={values.testModeEnabled} onCheckedChange={(checked) => setValues((v) => ({ ...v, testModeEnabled: checked }))} />
                <span className="text-sm text-muted-foreground">{values.testModeEnabled ? "Enabled" : "Disabled"}</span>
              </div>
            </FieldRow>
            <FieldRow label="Test phone number" dirty={dirty("testModeNumber")} saving={!!saving.testModeNumber} onSave={() => saveField("testModeNumber")}>
              <Input type="tel" value={values.testModeNumber} onChange={(e) => setValues((v) => ({ ...v, testModeNumber: e.target.value }))} placeholder="+1 (555) 123-4567" disabled={!values.testModeEnabled} autoComplete="tel" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
          </div>
        </section>

        <section>
          <h4 className="text-base font-semibold mb-2">Contact information</h4>
          <p className="text-sm text-muted-foreground mb-4">How we can reach you</p>
          <div className="divide-y">
            <FieldRow label="Email" dirty={dirty("email")} saving={!!saving.email} onSave={() => saveField("email")}>
              <Input type="email" value={values.email} onChange={(e) => setValues(v => ({ ...v, email: e.target.value }))} placeholder="jane.doe@example.com" autoComplete="email" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
            <FieldRow label="Phone" dirty={dirty("phone")} saving={!!saving.phone} onSave={() => saveField("phone")}>
              <Input type="tel" value={values.phone} onChange={(e) => setValues(v => ({ ...v, phone: e.target.value }))} placeholder="(555) 123-4567" autoComplete="tel" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
            <FieldRow label="Address" dirty={dirty("address")} saving={!!saving.address} onSave={() => saveField("address")}>
              <Input value={values.address} onChange={(e) => setValues(v => ({ ...v, address: e.target.value }))} placeholder="123 Main St, City, State" autoComplete="street-address" className={INPUT_FOCUS_CLASS} />
            </FieldRow>
          </div>
        </section>

        <EmailVerificationCard />
      </div>
    </div>
  )
}
