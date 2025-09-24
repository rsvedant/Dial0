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
import type { IssueListItem } from "@/types/issue"

// NOTE: This file was migrated from /profile/create-voice to /account/create-voice for improved IA.
// TODO: Consider extracting shared sidebar layout into a reusable shell component.

interface NavigatorWithUserMedia extends Navigator {
  getUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
  webkitGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
  mozGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
  msGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
}

export default function CreateVoicePage() {
  const { toast } = useToast()
  const router = useRouter()
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const settings = useQuery(api.orchestration.getSettings, {}) as any | null | undefined
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
  const [micPermissionState, setMicPermissionState] = React.useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [isCheckingPermissions, setIsCheckingPermissions] = React.useState(false)
  const [isMobileDevice, setIsMobileDevice] = React.useState(false)

  const cloneVoice = useAction((api as any).actions.voiceCloning.cloneVoiceWithAudioData)
  const saveSettings = useMutation(api.orchestration.saveSettings)

  const suggestedVoiceName = React.useMemo(() => {
    const name = [settings?.firstName, settings?.lastName].filter(Boolean).join(" ").trim()
    return name || ""
  }, [settings])
  React.useEffect(() => { if (!voiceName && suggestedVoiceName) setVoiceName(suggestedVoiceName) }, [suggestedVoiceName])

  React.useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || window.innerWidth <= 768
    setIsMobileDevice(isMobile)
    checkMicrophonePermissions()
  }, [])

  const checkMicrophonePermissions = async () => {
    const nav = navigator as NavigatorWithUserMedia
    if (!navigator.mediaDevices && !nav.getUserMedia) {
      setMicPermissionState('unknown')
      return
    }
    if (!navigator.permissions) {
      setMicPermissionState('unknown')
      return
    }
    try {
      setIsCheckingPermissions(true)
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setMicPermissionState(permission.state as any)
      permission.onchange = () => setMicPermissionState(permission.state as any)
    } catch {
      setMicPermissionState('unknown')
    } finally {
      setIsCheckingPermissions(false)
    }
  }

  const getUserMediaWithFallback = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    if (navigator.mediaDevices?.getUserMedia) return navigator.mediaDevices.getUserMedia(constraints)
    const nav = navigator as NavigatorWithUserMedia
    const getUserMedia = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia
    if (!getUserMedia) return Promise.reject(new Error('getUserMedia is not supported in this browser'))
    return new Promise((resolve, reject) => { getUserMedia.call(navigator, constraints, resolve, reject) })
  }

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      setIsCheckingPermissions(true)
      const nav = navigator as NavigatorWithUserMedia
      if (!navigator.mediaDevices && !nav.getUserMedia && !nav.webkitGetUserMedia && !nav.mozGetUserMedia && !nav.msGetUserMedia) {
        toast({ title: "Browser Not Supported", description: "Your browser doesn't support microphone access.", variant: "destructive" })
        return false
      }
      const stream = await getUserMediaWithFallback({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicPermissionState('granted')
      return true
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermissionState('denied')
        toast({ title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" })
      } else if (error.name === 'NotFoundError') {
        toast({ title: "No Microphone Found", description: "Please connect a microphone and try again.", variant: "destructive" })
      } else {
        toast({ title: "Microphone Error", description: "Unable to access your microphone.", variant: "destructive" })
      }
      return false
    } finally { setIsCheckingPermissions(false) }
  }

  const sampleSentence = "Please read the following passage in your natural speaking voice. Speak clearly at a comfortable pace, with normal intonation and emotion. If you make a mistake, pause and continue, no need to start over.\n\nOn a crisp morning, I checked the time and whispered, 'Ready to begin.' The quick brown fox jumps over the lazy dog, while bright geese zigzag above. Numbers and names roll off the tongue: one, two, three; April, July, November. Please schedule a call for Thursday at 3:45 PM, and confirm by email. I'd rather avoid delays, could we speed things up a bit?\n\nThanks for your help today. I appreciate your patience and attention. Let me know if you need anything else from me—account numbers, dates, or details. I'll follow up soon to make sure everything is resolved.";

  const startRecording = async () => {
    if (micPermissionState === 'denied') { toast({ title: "Microphone Access Required", description: "Enable microphone access and refresh.", variant: "destructive" }); return }
    if (micPermissionState === 'unknown' || micPermissionState === 'prompt') { const ok = await requestMicrophonePermission(); if (!ok) return }
    try {
      const stream = await getUserMediaWithFallback({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl("") }
      recorder.onstart = () => { setIsRecording(true); setRecordedB64("") }
      recorder.onstop = async () => {
        setIsRecording(false); setHasRecorded(true); stream.getTracks().forEach(t => t.stop())
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          const url = URL.createObjectURL(blob); setRecordedUrl(url); setRecordedMime(blob.type || 'audio/webm')
          const reader = new FileReader(); reader.onloadend = () => { const result = reader.result as string; const commaIdx = result.indexOf(','); const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : ""; setRecordedB64(base64) }; reader.readAsDataURL(blob)
        } catch {
          toast({ title: "Recording Error", description: "Failed to process audio.", variant: "destructive" })
        }
      }
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      recorder.onerror = () => { toast({ title: "Recording Error", description: "An error occurred while recording.", variant: "destructive" }); setIsRecording(false); stream.getTracks().forEach(t => t.stop()) }
      setMediaRecorder(recorder); recorder.start()
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') { setMicPermissionState('denied'); toast({ title: "Microphone Access Denied", description: "Allow microphone access and refresh.", variant: "destructive" }) }
      else if (err.name === 'NotFoundError') toast({ title: "No Microphone Found", description: "Connect a microphone.", variant: "destructive" })
      else toast({ title: "Recording Error", description: "Unable to start recording.", variant: "destructive" })
    }
  }

  const stopRecording = () => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop() }

  const onCreate = async () => {
    if (!recordedB64) { toast({ title: "No recording", description: "Record a sample first.", variant: "destructive" }); return }
    try {
      setIsCreating(true)
      const finalName = (voiceName?.trim() || suggestedVoiceName || "My Voice").slice(0, 50)
      const res: any = await cloneVoice?.({ audioBase64: recordedB64, voiceName: finalName, mimeType: recordedMime })
      if (!res?.success) throw new Error(res?.error || 'Failed to clone voice')
      await saveSettings({ voiceId: res.voiceId })
      toast({ title: "Voice Created", description: `Your custom voice "${res.voiceName || voiceName}" has been created and set.` })
      router.push("/account/settings")
    } catch (err: any) {
      toast({ title: "Creation failed", description: err?.message ?? "Please try again.", variant: "destructive" })
    } finally { setIsCreating(false) }
  }

  return (
    <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm ios-no-bounce ios-mobile-header px-4 lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="animate-scale-in h-12 w-12 p-0 ios-button icon-only large scale-150 lg:scale-100">
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
      <div className="mx-auto w-full max-w-3xl px-6 pt-20 lg:pt-6 pb-24 animate-fade-in-up">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 -ml-2 flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Create Custom Voice</h1>
          <p className="text-sm text-muted-foreground mt-1">Design a personalized voice assistant that matches your preferences.</p>
        </div>
        <div className="grid gap-8">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20" />
            <CardContent className="relative p-8 lg:p-12">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Record Your Voice Sample</h2>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto">Read the sentence below clearly to help us understand your voice characteristics and create a personalized assistant.</p>
                </div>
                <div className="bg-background/80 backdrop-blur-sm rounded-lg border p-6 lg:p-8 shadow-sm text-left">
                  <p className="text-sm text-muted-foreground mb-3">Recommended script for best cloning quality (about 45–60 seconds):</p>
                  <pre className="whitespace-pre-wrap text-base leading-relaxed font-medium">{sampleSentence}</pre>
                </div>
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    {isRecording && (<><div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" /><div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" /></>)}
                    <Button size="lg" variant={isRecording ? "destructive" : hasRecorded ? "secondary" : "default"} onClick={isRecording ? stopRecording : startRecording} disabled={isCheckingPermissions || micPermissionState === 'denied'} className={`relative h-20 w-20 rounded-full p-0 transition-all duration-300 shadow-lg hover:shadow-xl ${isRecording ? 'scale-110' : 'hover:scale-105'} ${hasRecorded ? 'ring-2 ring-green-500 ring-offset-2' : ''} ${micPermissionState === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}>{isRecording ? (<Square className="h-8 w-8" />) : hasRecorded ? (<Mic className="h-8 w-8 text-green-600" />) : (<Mic className="h-8 w-8" />)}</Button>
                  </div>
                  <div className="text-center space-y-2">
                    {isCheckingPermissions ? (<><p className="text-sm font-medium text-blue-600 dark:text-blue-400">🔍 Checking microphone permissions...</p><p className="text-xs text-muted-foreground">Please allow access when prompted</p></>) : isRecording ? (<><p className="text-sm font-medium text-red-600 dark:text-red-400">🔴 Recording in progress...</p><p className="text-xs text-muted-foreground">Click the stop button when finished</p></>) : hasRecorded ? (<><p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Voice sample recorded</p><p className="text-xs text-muted-foreground">Click to record again if needed</p></>) : micPermissionState === 'denied' ? (<><p className="text-sm font-medium text-red-600 dark:text-red-400">🚫 Microphone access denied</p><p className="text-xs text-muted-foreground">Please enable microphone access in browser settings</p></>) : micPermissionState === 'granted' ? (<><p className="text-sm font-medium text-green-600 dark:text-green-400">🎤 Ready to record</p><p className="text-xs text-muted-foreground">Click to start recording your voice sample</p></>) : (<><p className="text-sm font-medium">{isMobileDevice ? "Tap to start recording" : "Click to start recording"}</p><p className="text-xs text-muted-foreground">{isMobileDevice ? "You'll be asked to allow microphone access - tap 'Allow'" : "You'll be asked for microphone permission"}</p></>)}
                  </div>
                  {micPermissionState === 'denied' && (
                    <div className="w-full max-w-lg mx-auto mt-6">
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Microphone Access Required</h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                              <p className="mb-2">To create a custom voice, we need access to your microphone. Please:</p>
                              <ol className="list-decimal list-inside space-y-1 text-xs">
                                <li>Refresh this page and tap the record button again</li>
                                <li>When prompted, tap "Allow" to grant microphone access</li>
                                <li>If you don't see a prompt, check your browser's site settings</li>
                                <li>Chrome: lock icon next to URL → Microphone → Allow</li>
                                <li>Safari iOS: Settings → Safari → Camera & Microphone</li>
                              </ol>
                              <div className="mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={checkMicrophonePermissions}
                                  disabled={isCheckingPermissions}
                                  className="text-xs"
                                >
                                  {isCheckingPermissions ? "Checking..." : "Try Again"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasRecorded && recordedUrl && (<div className="w-full max-w-md mx-auto mt-4 text-left"><Label className="mb-2 block">Preview your recording</Label><audio controls src={recordedUrl} className="w-full" /><p className="text-xs text-muted-foreground mt-2">If you're not happy, click the mic to re-record.</p></div>)}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()} disabled={isCreating}>Cancel</Button>
            <Button onClick={onCreate} disabled={isCreating}>{isCreating ? "Creating Voice..." : "Create Voice"}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
