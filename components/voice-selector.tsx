"use client"

import * as React from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getVoicesByGender, findVoice, type VoiceOption } from "@/lib/default-voices"
import { Volume2, Mic, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceSelectorProps {
  value: string | undefined
  onChange: (value: string) => void
  userVoiceId?: string | null
  userVoiceName?: string | null
  className?: string
  disabled?: boolean
}

export function VoiceSelector({
  value,
  onChange,
  userVoiceId,
  userVoiceName,
  className,
  disabled = false
}: VoiceSelectorProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  // Get all voices grouped by gender
  const voicesByGender = React.useMemo(() => getVoicesByGender(), [])
  
  // Find the currently selected voice
  const selectedVoice = React.useMemo(() => {
    if (!value) return null
    if (userVoiceId && value === userVoiceId) return null // Custom voice
    return findVoice(value)
  }, [value, userVoiceId])

  const playPreview = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(url)
    audioRef.current = audio
    setIsPlaying(true)
    audio.play()
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => setIsPlaying(false)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a voice">
            {value && (
              <span className="flex items-center gap-2">
                {userVoiceId && value === userVoiceId ? (
                  <>
                    <Mic className="h-4 w-4 text-primary" />
                    <span>{userVoiceName || "Your Voice"}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    <span>{selectedVoice?.name || value}</span>
                  </>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* User's custom cloned voice at the top */}
          {userVoiceId && (
            <>
              <SelectGroup>
                <SelectLabel>Your Custom Voice</SelectLabel>
                <SelectItem value={userVoiceId}>
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium">{userVoiceName || "Your Voice"}</span>
                      <span className="text-xs text-muted-foreground">Custom cloned voice</span>
                    </div>
                  </div>
                </SelectItem>
              </SelectGroup>
              <div className="my-1 border-t" />
            </>
          )}

          {/* Female voices */}
          <SelectGroup>
            <SelectLabel>Female Voices ({voicesByGender.female.length})</SelectLabel>
            {voicesByGender.female.map((voice) => (
              <SelectItem key={voice.slug} value={voice.slug}>
                <div className="flex flex-col">
                  <span className="font-medium">{voice.name}</span>
                  {voice.accent && (
                    <span className="text-xs text-muted-foreground capitalize">{voice.accent} accent</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          {/* Male voices */}
          <SelectGroup>
            <SelectLabel>Male Voices ({voicesByGender.male.length})</SelectLabel>
            {voicesByGender.male.map((voice) => (
              <SelectItem key={voice.slug} value={voice.slug}>
                <div className="flex flex-col">
                  <span className="font-medium">{voice.name}</span>
                  {voice.accent && (
                    <span className="text-xs text-muted-foreground capitalize">{voice.accent} accent</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Voice description */}
      {selectedVoice && (
        <div className="text-xs text-muted-foreground rounded-md bg-muted/50 p-2">
          <p className="font-medium mb-1">{selectedVoice.name}</p>
          {selectedVoice.description && (
            <p className="line-clamp-2">{selectedVoice.description}</p>
          )}
          {selectedVoice.accent && (
            <p className="mt-1 capitalize">Accent: {selectedVoice.accent}</p>
          )}
          {selectedVoice.previewUrl && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 mt-2"
              onClick={() => playPreview(selectedVoice.previewUrl!)}
              disabled={isPlaying}
            >
              <Play className="h-3 w-3 mr-1" />
              {isPlaying ? "Playing..." : "Preview Voice"}
            </Button>
          )}
        </div>
      )}

      {userVoiceId && value === userVoiceId && (
        <div className="text-xs text-muted-foreground rounded-md bg-primary/10 p-2">
          <p className="flex items-center gap-1 font-medium">
            <Mic className="h-3 w-3" />
            Using your custom cloned voice
          </p>
        </div>
      )}
    </div>
  )
}
