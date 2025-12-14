import React, { useEffect, useRef, useState } from 'react'
import { createTranscriptionClient, type TranscriptionEventMessage } from '../../services/transcriptionService'
import { slideRecordingService, type SlideRecordingResponse } from '../../services/slideRecordingService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import '../../styles/transcription.css'

type ChatMessage = {
  id: string
  text: string
  timestamp: number
  relativeTime?: number // Thời gian tính từ khi bắt đầu ghi âm (giây)
}

// Removed SavedRecording type - using SlideRecordingResponse from API instead

type LocalizedMessage = {
  key: string
  params?: Record<string, string | number>
}

type ErrorState = LocalizedMessage | { message: string }


interface SlideTranscriptionPanelProps {
  lectureId: number
  slidePageNumber?: number
  keywords?: string[]
  onTranscriptUpdate?: (text: string, isFinal: boolean) => void
  onRecordingSaved?: (recording: any) => void
}

const SlideTranscriptionPanel = ({ lectureId, slidePageNumber, keywords = [], onTranscriptUpdate, onRecordingSaved }: SlideTranscriptionPanelProps) => {
  const { token } = useAuth()
  const { t } = useLanguage()
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [interimText, setInterimText] = useState<string>('')
  const [errorState, setErrorState] = useState<ErrorState | null>(null)
  const [statusState, setStatusState] = useState<string>(t('transcription.slideRecording.ready'))
  const [languageCode, setLanguageCode] = useState<string>('ja-JP')
  const [elapsedTime, setElapsedTime] = useState<number>(0) // Thời gian đã ghi âm (giây)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [savedRecording, setSavedRecording] = useState<SlideRecordingResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const clientRef = useRef<ReturnType<typeof createTranscriptionClient> | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const pendingMicSamplesRef = useRef<number[]>([])
  const micStartSentRef = useRef(false)
  const chatFeedRef = useRef<HTMLDivElement | null>(null)
  const isRecordingRef = useRef(false)
  const timerIntervalRef = useRef<number | null>(null)

  // Load saved recording khi component mount hoặc slidePageNumber thay đổi
  useEffect(() => {
    loadSavedRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId, slidePageNumber])

  // Auto scroll chỉ trong container, không scroll cả trang
  useEffect(() => {
    if (chatFeedRef.current) {
      // Scroll container thay vì scrollIntoView để không ảnh hưởng đến trang
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
    }
  }, [messages, interimText])

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // Timer cho bộ đếm thời gian
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - recordingStartTime) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isRecording, recordingStartTime])

  useEffect(() => {
    return () => {
      stopRecording()
      clientRef.current?.close()
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const appendMessage = (text: string) => {
    const now = Date.now()
    const relativeTime = recordingStartTime ? Math.floor((now - recordingStartTime) / 1000) : undefined
    
    setMessages((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        text,
        timestamp: now,
        relativeTime,
      },
    ])
    // Notify parent component
    if (onTranscriptUpdate) {
      onTranscriptUpdate(text, true)
    }
  }

  // Format thời gian MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Load saved recording từ API
  const loadSavedRecording = async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const recording = await slideRecordingService.getRecording(lectureId, token, slidePageNumber)
      if (recording) {
        setSavedRecording(recording)
        // Convert API response to ChatMessage format
        const chatMessages: ChatMessage[] = recording.messages.map((msg) => ({
          id: String(msg.id),
          text: msg.text,
          timestamp: new Date(msg.timestamp).getTime(),
          relativeTime: msg.relative_time_sec,
        }))
        setMessages(chatMessages)
        setIsSubmitted(true)
        setElapsedTime(recording.recording_duration_sec)
        setLanguageCode(recording.language_code)
      } else {
        setSavedRecording(null)
        setIsSubmitted(false)
        setMessages([])
        setElapsedTime(0)
      }
    } catch (error) {
      console.error('Failed to load saved recording', error)
      setSavedRecording(null)
      setIsSubmitted(false)
      setMessages([])
      setElapsedTime(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Lưu recording vào API
  const saveRecording = async () => {
    if (messages.length === 0) {
      setErrorState({ message: t('transcription.slideRecording.noContentToSave') })
      return
    }

    if (!token) {
      setErrorState({ message: t('transcription.slideRecording.notLoggedIn') })
      return
    }

    setIsLoading(true)
    try {
      const request = {
        lecture_id: lectureId,
        slide_page_number: slidePageNumber,
        recording_duration_sec: elapsedTime,
        language_code: languageCode,
        messages: messages.map((msg) => {
          // Đảm bảo relative_time_sec luôn có giá trị hợp lệ
          let relativeTimeSec = msg.relativeTime
          if (relativeTimeSec === undefined || relativeTimeSec === null) {
            // Tính lại từ timestamp nếu không có
            if (recordingStartTime) {
              relativeTimeSec = Math.floor((msg.timestamp - recordingStartTime) / 1000)
            } else {
              // Fallback: tính từ message đầu tiên
              relativeTimeSec = messages.length > 0 && messages[0].timestamp 
                ? Math.floor((msg.timestamp - messages[0].timestamp) / 1000)
                : 0
            }
          }
          return {
            text: msg.text,
            relative_time_sec: Math.max(0, relativeTimeSec), // Đảm bảo không âm, sử dụng snake_case
            timestamp: msg.timestamp,
          }
        }),
      }

      const response = await slideRecordingService.saveRecording(request, token)
      setSavedRecording(response)
      setIsSubmitted(true)
      setStatusState(t('transcription.slideRecording.savedSuccess'))
      setErrorState(null)
      
      // Notify parent component
      if (onRecordingSaved) {
        onRecordingSaved(response)
      }
    } catch (error: any) {
      console.error('Failed to save recording', error)
      setErrorState({ message: error?.message || t('transcription.slideRecording.saveFailed') })
    } finally {
      setIsLoading(false)
    }
  }

  // Xóa saved recording (chỉ xóa local state, không xóa trên server)
  const clearSavedRecording = () => {
    setSavedRecording(null)
    setIsSubmitted(false)
    setMessages([])
    setElapsedTime(0)
    setStatusState(t('transcription.slideRecording.ready'))
  }

  const cleanupMicrophone = async () => {
    pendingMicSamplesRef.current = []
    micStartSentRef.current = false
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current.onaudioprocess = null
      scriptProcessorRef.current = null
    }
    if (micSourceNodeRef.current) {
      micSourceNodeRef.current.disconnect()
      micSourceNodeRef.current = null
    }
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
      } catch (err) {
        console.warn('Failed to close audio context', err)
      }
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }

  const resampleTo16k = (input: Float32Array, inputSampleRate: number): Float32Array => {
    if (inputSampleRate === 16000) {
      return input
    }
    const sampleRatio = inputSampleRate / 16000
    const newLength = Math.floor(input.length / sampleRatio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetInput = 0
    while (offsetResult < newLength) {
      const nextOffsetInput = Math.round((offsetResult + 1) * sampleRatio)
      let accum = 0
      let count = 0
      for (let i = offsetInput; i < nextOffsetInput && i < input.length; i += 1) {
        accum += input[i]
        count += 1
      }
      result[offsetResult] = count > 0 ? accum / count : 0
      offsetResult += 1
      offsetInput = nextOffsetInput
    }
    return result
  }

  const float32ToInt16 = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length)
    for (let i = 0; i < input.length; i += 1) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return output
  }

  const appendMicrophoneSamples = (samples: Int16Array) => {
    const pending = pendingMicSamplesRef.current
    for (let i = 0; i < samples.length; i += 1) {
      pending.push(samples[i])
    }
    while (pending.length >= 1600) {
      const chunkSamples = pending.splice(0, 1600)
      const chunkInt16 = new Int16Array(chunkSamples)
      if (!clientRef.current || clientRef.current.readyState() !== WebSocket.OPEN) {
        pending.unshift(...chunkSamples)
        return
      }

      let sent = false
      try {
        clientRef.current.sendAudio(chunkInt16)
        sent = true
      } catch (sendError) {
        console.error('Failed to send microphone chunk', sendError)
        setErrorState({ message: t('transcription.slideRecording.sendAudioFailed') })
        pending.unshift(...chunkSamples)
        micStartSentRef.current = false
        return
      }

      if (sent && !micStartSentRef.current && clientRef.current.readyState() === WebSocket.OPEN) {
        micStartSentRef.current = true
        try {
          clientRef.current.start({
            language: languageCode,
          })
        } catch (e) {
          console.log('Start command not needed for this endpoint')
        }
        setStatusState(t('transcription.slideRecording.recording'))
      }
    }
  }

  const handleMicrophoneSamples = (input: Float32Array, sampleRate: number) => {
    if (!isRecordingRef.current) {
      return
    }
    const resampled = resampleTo16k(input, sampleRate)
    if (!resampled.length) {
      return
    }
    const int16 = float32ToInt16(resampled)
    appendMicrophoneSamples(int16)
  }

  const initializeMicrophoneStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
        },
      })
      mediaStreamRef.current = stream

      let audioContext: AudioContext
      try {
        audioContext = new AudioContext({ sampleRate: 16000 })
      } catch (err) {
        console.warn('Unable to enforce 16kHz sample rate, using default', err)
        audioContext = new AudioContext()
      }
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const sourceNode = audioContext.createMediaStreamSource(stream)
      micSourceNodeRef.current = sourceNode

      const processorNode = audioContext.createScriptProcessor(4096, 1, 1)
      scriptProcessorRef.current = processorNode
      processorNode.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0)
        handleMicrophoneSamples(channelData, audioContext.sampleRate)
      }

      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0

      sourceNode.connect(processorNode)
      processorNode.connect(gainNode)
      gainNode.connect(audioContext.destination)

      pendingMicSamplesRef.current = []
      setStatusState(t('transcription.slideRecording.listening'))
      setIsRecording(true)
      isRecordingRef.current = true
      setRecordingStartTime(Date.now())
      setElapsedTime(0)
    } catch (err) {
      console.error(err)
      await cleanupMicrophone()
      setIsRecording(false)
      isRecordingRef.current = false
      setStatusState(t('transcription.slideRecording.ready'))
      setErrorState({ message: t('transcription.slideRecording.microphoneAccessFailed') })
      clientRef.current?.close()
    }
  }

  const handleSocketEvent = (payload: TranscriptionEventMessage) => {
    switch (payload.event) {
      case 'transcription': {
        if ('result' in payload && payload.result && typeof payload.result === 'object') {
          const result = payload.result as { is_final?: boolean; text?: string }
          if (result.is_final && typeof result.text === 'string') {
            appendMessage(result.text)
            setInterimText('')
            if (onTranscriptUpdate) {
              onTranscriptUpdate(result.text, true)
            }
          } else if (typeof result.text === 'string') {
            setInterimText(result.text)
            if (onTranscriptUpdate) {
              onTranscriptUpdate(result.text, false)
            }
          }
        }
        break
      }
      case 'error':
        if ('message' in payload && typeof payload.message === 'string') {
          setErrorState({ message: payload.message })
        }
        void cleanupMicrophone()
        setIsRecording(false)
        break
      default:
        break
    }
  }

  const startMicrophoneRecording = async () => {
    setErrorState(null)
    setStatusState(t('transcription.slideRecording.connecting'))
    pendingMicSamplesRef.current = []
    micStartSentRef.current = false

    await cleanupMicrophone()

    try {
      clientRef.current?.close()
    } catch (closeError) {
      console.warn('Failed to close previous connection', closeError)
    }

    clientRef.current = createTranscriptionClient({
      onEvent: handleSocketEvent,
      onOpen: () => {
        if (clientRef.current) {
          clientRef.current.start({
            language: languageCode,
          })
        }
        setStatusState(t('transcription.slideRecording.preparing'))
        initializeMicrophoneStream().catch((err) => {
          console.error('Failed to initialize microphone stream', err)
          setErrorState({ message: t('transcription.slideRecording.initMicrophoneFailed') })
          setStatusState(t('transcription.slideRecording.ready'))
          void cleanupMicrophone()
          clientRef.current?.close()
          clientRef.current = null
        })
      },
      onError: () => {
        setErrorState({ message: t('transcription.slideRecording.websocketError') })
        pendingMicSamplesRef.current = []
        micStartSentRef.current = false
        void cleanupMicrophone()
      },
      onClose: () => {
        setStatusState(t('transcription.slideRecording.disconnected'))
        setIsRecording(false)
        void cleanupMicrophone()
        micStartSentRef.current = false
        clientRef.current = null
      },
    })
  }

  const startRecording = async () => {
    if (isRecording) {
      return
    }
    await startMicrophoneRecording()
  }

  const stopRecording = () => {
    void cleanupMicrophone()
    pendingMicSamplesRef.current = []
    micStartSentRef.current = false

    if (clientRef.current) {
      try {
        clientRef.current.stop()
      } catch (err) {
        console.warn('Failed to send stop command', err)
      } finally {
        clientRef.current.close()
        clientRef.current = null
      }
    }

    setIsRecording(false)
    isRecordingRef.current = false
    setRecordingStartTime(null)
    setStatusState(t('transcription.slideRecording.stopped'))
  }

  const resetTranscript = () => {
    setErrorState(null)
    setMessages([])
    setInterimText('')
    setStatusState(t('transcription.slideRecording.ready'))
    setElapsedTime(0)
    setRecordingStartTime(null)
    setIsSubmitted(false)
    clearSavedRecording()
  }

  // Function để highlight keywords trong text
  const highlightKeywords = (text: string, keywordsList: string[]): React.ReactNode => {
    if (!keywordsList || keywordsList.length === 0) {
      return <>{text}</>
    }

    // Tạo regex pattern từ keywords (case-insensitive)
    const keywordsPattern = keywordsList
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0)
      .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special regex chars
      .join('|')

    if (!keywordsPattern) {
      return <>{text}</>
    }

    const regex = new RegExp(`(${keywordsPattern})`, 'gi')
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    // Reset regex lastIndex
    regex.lastIndex = 0

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add highlighted match
      parts.push(
        <strong key={`highlight-${match.index}`} className="keyword-highlight">
          {match[0]}
        </strong>
      )
      lastIndex = match.index + match[0].length

      // Prevent infinite loop
      if (match[0].length === 0) {
        regex.lastIndex++
      }
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return <>{parts.length > 0 ? parts : text}</>
  }

  const error = errorState ? ('key' in errorState ? errorState.key : errorState.message) : null

  return (
    <div className="slide-transcription-panel">
      <header className="transcription-panel-header">
        <h3>{t('transcription.slideRecording.title', { pageNumber: slidePageNumber || '' })}</h3>
        <div className="transcription-controls-compact">
          <select
            value={languageCode}
            onChange={(event) => setLanguageCode(event.target.value)}
            disabled={isRecording}
            className="language-select-compact"
          >
            <option value="ja-JP">{t('transcription.slideRecording.language.japanese')}</option>
            <option value="vi-VN">{t('transcription.slideRecording.language.vietnamese')}</option>
            <option value="en-US">{t('transcription.slideRecording.language.english')}</option>
          </select>
          <button
            type="button"
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={false}
          >
            {isRecording ? t('transcription.slideRecording.buttons.stop') : t('transcription.slideRecording.buttons.start')}
          </button>
          <button type="button" className="reset-button" onClick={resetTranscript} disabled={isRecording}>
            {t('transcription.slideRecording.buttons.reset')}
          </button>
          {!isRecording && messages.length > 0 && (
            <button
              type="button"
              className="submit-button"
              onClick={saveRecording}
              disabled={isSubmitted || isLoading}
            >
              {isLoading ? t('transcription.slideRecording.buttons.saving') : isSubmitted ? t('transcription.slideRecording.buttons.saved') : t('transcription.slideRecording.buttons.save')}
            </button>
          )}
          {isSubmitted && (
            <button
              type="button"
              className="clear-button"
              onClick={clearSavedRecording}
              disabled={isRecording}
            >
              {t('transcription.slideRecording.buttons.delete')}
            </button>
          )}
        </div>
      </header>

      <div className="transcription-status-compact">
        <div className="status-row">
          <p>{statusState}</p>
          {isRecording && (
            <span className="timer-display">⏱️ {formatTime(elapsedTime)}</span>
          )}
          {isSubmitted && !isRecording && savedRecording && (
            <span className="saved-indicator">{t('transcription.slideRecording.status.saved', { duration: formatTime(savedRecording.recording_duration_sec) })}</span>
          )}
        </div>
        {error && <p className="transcription-error">⚠️ {error}</p>}
      </div>

      <div className="transcription-results-compact">
        <div className="chat-feed-compact" ref={chatFeedRef}>
          {messages.map((message) => (
            <div className="chat-bubble-compact" key={message.id}>
              <p>{highlightKeywords(message.text, keywords)}</p>
              <div className="chat-meta-row">
                {message.relativeTime !== undefined && (
                  <span className="chat-time">
                    ⏱️ {formatTime(message.relativeTime)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {interimText && (
            <div className="chat-bubble-compact interim">
              <p>{interimText}</p>
              <span className="chat-meta">{t('transcription.slideRecording.status.processing')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SlideTranscriptionPanel

