"use client"

import * as React from "react"
import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAction, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

interface InlineVoiceCreatorProps {
  userName?: string | null
  onCreated?: (payload: { voiceId: string; voiceName?: string }) => void
  className?: string
}

const SAMPLE_SENTENCE = `Please read the following passage in your natural speaking voice. Speak clearly at a comfortable pace, with normal intonation and emotion. If you make a mistake, pause and continue—no need to start over.

On a crisp morning, I checked the time and whispered, "Ready to begin." The quick brown fox jumps over the lazy dog, while bright geese zigzag above. Numbers and names roll off the tongue: one, two, three; April, July, November. Please schedule a call for Thursday at 3:45 PM, and confirm by email. I'd rather avoid delays—could we speed things up a bit?

Thanks for your help today. I appreciate your patience and attention. Let me know if you need anything else from me—account numbers, dates, or details. I'll follow up soon to make sure everything is resolved.`

export function InlineVoiceCreator({ userName, onCreated, className }: InlineVoiceCreatorProps) {
  const { toast } = useToast()
  const cloneVoice = useAction((api as any).actions.voiceCloning.cloneVoiceWithAudioData)
  const saveSettings = useMutation(api.orchestration.saveSettings)

  const [isRecording, setIsRecording] = React.useState(false)
  const [recordedUrl, setRecordedUrl] = React.useState<string>("")
  const [recordedB64, setRecordedB64] = React.useState<string>("")
  const [mimeType, setMimeType] = React.useState("audio/webm")
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pendingAutoCreate, setPendingAutoCreate] = React.useState(false)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])

  React.useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    }
  }, [recordedUrl])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        setIsRecording(false)
        recorder.stream.getTracks().forEach((track) => track.stop())
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
          setMimeType(blob.type || "audio/webm")
          const url = URL.createObjectURL(blob)
          setRecordedUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            const base64 = result.includes(",") ? result.split(",")[1] : ""
            setRecordedB64(base64)
            setPendingAutoCreate(true)
          }
          reader.readAsDataURL(blob)
        } catch (blobError: any) {
          console.error(blobError)
          setError("Failed to process recording. Please try again.")
        }
      }

      recorder.onerror = (event) => {
        console.error(event)
        setError("Recording error. Please refresh and try again.")
        setIsRecording(false)
      }

      recorder.start()
      setRecordedB64("")
      setPendingAutoCreate(false)
      setRecordedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ""
      })
      setIsRecording(true)
    } catch (err: any) {
      console.error(err)
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Microphone permission denied. Enable access in browser settings and try again.")
      } else if (err?.name === "NotFoundError") {
        setError("No microphone detected. Connect one and try again.")
      } else {
        setError("Unable to access microphone. Please try again.")
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const handleCreate = async () => {
    if (!recordedB64) {
      setError("Record a sample before creating your voice.")
      return
    }
    setPendingAutoCreate(false)
    setError(null)
    setIsSaving(true)
    try {
      const finalName = `${userName?.trim() ? `${userName.trim()}'s Voice` : "My Voice"}`.slice(0, 50)
      const response: any = await cloneVoice?.({
        audioBase64: recordedB64,
        voiceName: finalName,
        mimeType,
      })

      if (!response?.success || !response?.voiceId) {
        throw new Error(response?.error || "Failed to create voice")
      }

      await saveSettings({ voiceId: response.voiceId, selectedVoice: response.voiceId })

      toast({
        title: "Voice ready",
        description: `Using custom voice "${response.voiceName || finalName}" for calls.`,
      })

      onCreated?.({ voiceId: response.voiceId, voiceName: response.voiceName || finalName })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Voice creation failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  React.useEffect(() => {
    if (pendingAutoCreate && recordedB64 && !isSaving) {
      handleCreate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoCreate, recordedB64])

  return (
    <div className={cn("rounded-2xl border border-[rgba(55,50,47,0.12)] bg-white p-6 shadow-sm", className)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Clone your voice</h3>
          <p className="text-sm text-muted-foreground">
            Record a short sample so DialZero can sound like you. You can re-record as many times as you like before saving.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Recommended script</p>
          <pre className="whitespace-pre-wrap">{SAMPLE_SENTENCE}</pre>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Button
            type="button"
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            className="relative h-20 w-20 rounded-full"
            variant={isRecording ? "destructive" : "default"}
            disabled={isSaving}
          >
            {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isRecording
              ? "Recording… click to stop"
              : recordedB64
                ? isSaving
                  ? "Cloning your voice…"
                  : "Recording captured. Re-record to try again."
                : "Click to start recording."}
          </p>
        </div>

        {recordedUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <audio controls src={recordedUrl} className="w-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {isSaving && (
          <div className="flex items-center gap-2 rounded-lg border border-muted/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Duplicating your voice sample…</span>
          </div>
        )}
      </div>
    </div>
  )
}
