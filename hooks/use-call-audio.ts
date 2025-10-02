import { useCallback, useEffect, useRef, useState } from 'react'

export function useCallAudio(listenUrl: string | undefined) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const pcmBufferRef = useRef<Int16Array[]>([])

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 32000,
      })
    }
    return audioContextRef.current
  }, [])

  const playPCMChunk = useCallback(
    (pcmData: Int16Array) => {
      const audioContext = initAudioContext()

      const float32Data = new Float32Array(pcmData.length)
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0
      }

      const audioBuffer = audioContext.createBuffer(
        1,
        float32Data.length,
        audioContext.sampleRate,
      )
      audioBuffer.getChannelData(0).set(float32Data)

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)

      const currentTime = audioContext.currentTime
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime
      }

      source.start(nextPlayTimeRef.current)
      nextPlayTimeRef.current += audioBuffer.duration

      sourceNodeRef.current = source
    },
    [initAudioContext],
  )

  const connect = useCallback(() => {
    if (!listenUrl || wsRef.current) return

    setIsConnecting(true)
    setError(null)

    const ws = new WebSocket(listenUrl)
    wsRef.current = ws

    ws.onopen = () => {
      const audioContext = initAudioContext()
      console.log('WebSocket connection established')
      console.log('Audio Context Sample Rate:', audioContext.sampleRate)
      setIsConnecting(false)
      setIsPlaying(true)
    }

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((arrayBuffer) => {
          const pcmData = new Int16Array(arrayBuffer)
          pcmBufferRef.current.push(pcmData)

          const audioContext = audioContextRef.current
          const durationMs = audioContext
            ? ((pcmData.length / audioContext.sampleRate) * 1000).toFixed(2)
            : 'N/A'

          console.log(
            `Received PCM chunk: ${pcmData.length} samples (~${durationMs}ms at ${audioContext?.sampleRate}Hz)`,
          )
          playPCMChunk(pcmData)
        })
      } else {
        try {
          const message = JSON.parse(event.data)
          console.log('Received message:', message)
        } catch (e) {
          console.log('Received text:', event.data)
        }
      }
    }

    ws.onerror = (errorEvent) => {
      console.error('WebSocket error:', errorEvent)
      setError('Failed to connect to audio stream')
      setIsPlaying(false)
      setIsConnecting(false)
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
      setIsPlaying(false)
      setIsConnecting(false)
      wsRef.current = null
    }
  }, [listenUrl, initAudioContext, playPCMChunk])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    nextPlayTimeRef.current = 0
    pcmBufferRef.current = []
    setIsPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      disconnect()
    } else {
      connect()
    }
  }, [isPlaying, connect, disconnect])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isPlaying,
    isConnecting,
    error,
    togglePlay,
    canPlay: !!listenUrl,
  }
}
