"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ArrowLeft, Menu, Mic, MicOff, Square } from "lucide-react"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { Logo } from "@/components/logo"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function CreateVoicePage() {
  const { toast } = useToast()
  const router = useRouter()
  // Load issues for sidebar and settings for default voice name
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const settings = useQuery(api.orchestration.getSettings, {}) as any | null | undefined
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

  const [voiceName, setVoiceName] = React.useState("")
  const [voiceStyle, setVoiceStyle] = React.useState("")
  const [voiceDescription, setVoiceDescription] = React.useState("")
  const [voiceGender, setVoiceGender] = React.useState("")
  const [voiceAge, setVoiceAge] = React.useState("")
  const [voiceAccent, setVoiceAccent] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)
  const [isRecording, setIsRecording] = React.useState(false)
  const [hasRecorded, setHasRecorded] = React.useState(false)
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const [recordedB64, setRecordedB64] = React.useState<string>("")
  const [recordedMime, setRecordedMime] = React.useState<string>("audio/webm")
  const [recordedUrl, setRecordedUrl] = React.useState<string>("")

  // Convex hooks
  const cloneVoice = useAction((api as any).actions.voiceCloning.cloneVoiceWithAudioData)
  const saveSettings = useMutation(api.orchestration.saveSettings)

  // Suggest a default voice name from saved profile (first + last name)
  const suggestedVoiceName = React.useMemo(() => {
    const name = [settings?.firstName, settings?.lastName].filter(Boolean).join(" ").trim()
    return name || ""
  }, [settings])
  // If user hasn't typed a name and we have a suggestion, set it
  React.useEffect(() => {
    if (!voiceName && suggestedVoiceName) setVoiceName(suggestedVoiceName)
  }, [suggestedVoiceName])

  // Phonetically-rich script for better voice cloning (inspired by common TTS/voice datasets)
  // Short guidance + 2 paragraphs cover varied phonemes, pacing, and dynamics
  const sampleSentence = (
    "Please read the following passage in your natural speaking voice. " +
    "Speak clearly at a comfortable pace, with normal intonation and emotion. " +
    "If you make a mistake, pause and continue, no need to start over.\n\n" +
    "On a crisp morning, I checked the time and whispered, 'Ready to begin.' " +
    "The quick brown fox jumps over the lazy dog, while bright geese zigzag above. " +
    "Numbers and names roll off the tongue: one, two, three; April, July, November. " +
    "Please schedule a call for Thursday at 3:45 PM, and confirm by email. " +
    "I'd rather avoid delays, could we speed things up a bit?\n\n" +
    "Thanks for your help today. I appreciate your patience and attention. " +
    "Let me know if you need anything else from me—account numbers, dates, or details. " +
    "I'll follow up soon to make sure everything is resolved."
  )

  const voiceStyles = [
    { id: "professional", name: "Professional" },
    { id: "friendly", name: "Friendly" },
    { id: "calm", name: "Calm" },
    { id: "energetic", name: "Energetic" },
    { id: "warm", name: "Warm" },
    { id: "authoritative", name: "Authoritative" },
  ]

  const voiceGenders = [
    { id: "female", name: "Female" },
    { id: "male", name: "Male" },
    { id: "neutral", name: "Neutral" },
  ]

  const voiceAges = [
    { id: "young", name: "Young (20-30)" },
    { id: "middle", name: "Middle-aged (30-50)" },
    { id: "mature", name: "Mature (50+)" },
  ]

  const voiceAccents = [
    { id: "american", name: "American" },
    { id: "british", name: "British" },
    { id: "australian", name: "Australian" },
    { id: "canadian", name: "Canadian" },
    { id: "neutral", name: "Neutral" },
  ]

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      // Clear previous preview if any
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
        setRecordedUrl("")
      }
      
      recorder.onstart = () => {
        setIsRecording(true)
        setRecordedB64("")
      }
      
      recorder.onstop = async () => {
        setIsRecording(false)
        setHasRecorded(true)
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop())

        // Build a single Blob from chunks and convert to base64
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          // Create preview URL for inline playback
          const url = URL.createObjectURL(blob)
          setRecordedUrl(url)
          setRecordedMime(blob.type || 'audio/webm')
          // Convert to base64 without large spread to avoid call stack overflow
          const reader = new FileReader()
          reader.onloadend = () => {
            try {
              const result = reader.result as string
              // result is a data URL like: data:audio/webm;base64,XXXX
              const commaIdx = result.indexOf(',')
              const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : ""
              setRecordedB64(base64)
            } catch (e) {
              console.error('Failed to parse base64 from data URL', e)
            }
          }
          reader.readAsDataURL(blob)
        } catch (e) {
          console.error('Failed to process recorded audio', e)
        }
      }
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      setMediaRecorder(recorder)
      recorder.start()
      // Avoid toasts that obstruct the Create Voice button; UI already shows recording state
    } catch (err) {
      console.error("Error accessing microphone:", err)
      toast({ 
        title: "Microphone Error", 
        description: "Unable to access your microphone. Please check permissions.", 
        variant: "destructive" 
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      // No toast here to keep the CTA unobstructed; we render a preview instead
    }
  }

  const onCreate = async () => {
    if (!recordedB64) {
      toast({ title: "No recording", description: "Please record a sample before creating a voice.", variant: "destructive" })
      return
    }

    try {
      setIsCreating(true)
      // Call Convex action to clone the voice with recorded audio
      const finalName = (voiceName?.trim() || suggestedVoiceName || "My Voice").slice(0, 50)
      const res: any = await cloneVoice?.({ audioBase64: recordedB64, voiceName: finalName, mimeType: recordedMime })
      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to clone voice')
      }

      // Save voiceId in settings
      await saveSettings({ voiceId: res.voiceId })

      toast({
        title: "Voice Created",
        description: `Your custom voice "${res.voiceName || voiceName}" has been created and set.`
      })

      router.push("/profile")
    } catch (err: any) {
      toast({ 
        title: "Creation failed", 
        description: err?.message ?? "Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setIsCreating(false)
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
        {/* Back button and header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 -ml-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Create Custom Voice</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design a personalized voice assistant that matches your preferences.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Voice Recording Section */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20" />
            <CardContent className="relative p-8 lg:p-12">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Record Your Voice Sample</h2>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    Read the sentence below clearly to help us understand your voice characteristics and create a personalized assistant.
                  </p>
                </div>
                
                {/* Sample Script Display */}
                <div className="bg-background/80 backdrop-blur-sm rounded-lg border p-6 lg:p-8 shadow-sm text-left">
                  <p className="text-sm text-muted-foreground mb-3">Recommended script for best cloning quality (about 45–60 seconds):</p>
                  <pre className="whitespace-pre-wrap text-base leading-relaxed font-medium">
                    {sampleSentence}
                  </pre>
                </div>
                
                {/* Recording Controls */}
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    {/* Recording Animation */}
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                        <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
                      </>
                    )}
                    
                    <Button
                      size="lg"
                      variant={isRecording ? "destructive" : hasRecorded ? "secondary" : "default"}
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`
                        relative h-20 w-20 rounded-full p-0 transition-all duration-300 shadow-lg hover:shadow-xl
                        ${isRecording ? 'scale-110' : 'hover:scale-105'}
                        ${hasRecorded ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                      `}
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" />
                      ) : hasRecorded ? (
                        <Mic className="h-8 w-8 text-green-600" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-center space-y-2">
                    {isRecording ? (
                      <>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          🔴 Recording in progress...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click the stop button when finished
                        </p>
                      </>
                    ) : hasRecorded ? (
                      <>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          ✓ Voice sample recorded
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to record again if needed
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">
                          Click to start recording
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Make sure your microphone is connected
                        </p>
                      </>
                    )}
                  </div>
                  {hasRecorded && recordedUrl && (
                    <div className="w-full max-w-md mx-auto mt-4 text-left">
                      <Label className="mb-2 block">Preview your recording</Label>
                      <audio controls src={recordedUrl} className="w-full" />
                      <p className="text-xs text-muted-foreground mt-2">If you’re not happy with it, click the mic to re-record.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Voice Configuration</CardTitle>
              <CardDescription>
                Configure the characteristics of your custom voice assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid gap-2">
                <Label htmlFor="voiceName">Voice Name *</Label>
                <Input
                  id="voiceName"
                  placeholder="e.g., My Assistant"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                />
              </div>


              <div className="grid gap-2">
                <Label htmlFor="voiceStyle">Speaking Style</Label>
                <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a speaking style..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceStyles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div className="grid gap-2">
                <Label htmlFor="voiceGender">Voice Gender</Label>
                <Select value={voiceGender} onValueChange={setVoiceGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice gender..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceGenders.map((gender) => (
                      <SelectItem key={gender.id} value={gender.id}>
                        {gender.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div className="grid gap-2">
                <Label htmlFor="voiceAge">Voice Age Range</Label>
                <Select value={voiceAge} onValueChange={setVoiceAge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age range..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAges.map((age) => (
                      <SelectItem key={age.id} value={age.id}>
                        {age.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div className="grid gap-2">
                <Label htmlFor="voiceAccent">Accent</Label>
                <Select value={voiceAccent} onValueChange={setVoiceAccent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select accent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAccents.map((accent) => (
                      <SelectItem key={accent.id} value={accent.id}>
                        {accent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="grid gap-2">
                <Label htmlFor="voiceDescription">Additional Instructions</Label>
                <Textarea
                  id="voiceDescription"
                  placeholder="Describe any specific characteristics, tone, or behavior you want for this voice..."
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card> */}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={isCreating}>
              {isCreating ? "Creating Voice..." : "Create Voice"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
