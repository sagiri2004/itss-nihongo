import { useEffect, useMemo, useRef, useState } from 'react'
import { createTranscriptionClient, type TranscriptionEventMessage } from '../../services/transcriptionService'
import '../../styles/transcription.css'
import { useLanguage } from '../../context/LanguageContext'

type ChatMessage = {
  id: string
  text: string
  confidence?: number
  timestamp: number
}

type Mode = 'microphone' | 'file'

type FileStreamState = {
  buffer: ArrayBuffer
  offset: number
  timerId?: number
}

type LocalizedMessage = {
  key: string
  params?: Record<string, string | number>
}

type ErrorState = LocalizedMessage | { message: string }

const CHUNK_SIZE = 3200
const CHUNK_INTERVAL_MS = 100

const RealtimeTranscriptionPage = () => {
  const { t, language } = useLanguage()
  const [mode, setMode] = useState<Mode>('microphone')
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [interimText, setInterimText] = useState<string>('')
  const [errorState, setErrorState] = useState<ErrorState | null>(null)
  const [statusState, setStatusState] = useState<LocalizedMessage>({ key: 'transcription.status.ready' })
  const [fileInfo, setFileInfo] = useState<{ name: string; sizeKB: number; sampleRate?: number; bitsPerSample?: number } | null>(null)
  const [fileWarningState, setFileWarningState] = useState<LocalizedMessage | null>(null)
  const [languageCode, setLanguageCode] = useState<string>('ja-JP')
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)

  const clientRef = useRef<ReturnType<typeof createTranscriptionClient> | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const pendingMicSamplesRef = useRef<number[]>([])
  const micStartSentRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const chatFeedRef = useRef<HTMLDivElement | null>(null)
  const fileBufferRef = useRef<ArrayBuffer | null>(null)
  const fileStreamRef = useRef<FileStreamState | null>(null)
  const shouldStreamFileRef = useRef(false)
  const isRecordingRef = useRef(false)

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
    }
  }, [messages, interimText])

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // Timer for recording duration
  useEffect(() => {
    let intervalId: number | null = null
    if (isRecording && recordingStartTime) {
      intervalId = window.setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - recordingStartTime) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isRecording, recordingStartTime])

  useEffect(() => {
    return () => {
      stopRecording()
      clientRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Format time MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate speaking rate (characters per minute)
  const speakingRate = useMemo(() => {
    if (!isRecording || elapsedTime === 0) return 0
    const totalChars = messages.reduce((sum, msg) => sum + msg.text.length, 0)
    const minutes = elapsedTime / 60
    return minutes > 0 ? Math.round(totalChars / minutes) : 0
  }, [messages, elapsedTime, isRecording])

  const statusText = t(statusState.key, statusState.params)
  const error = errorState ? ('key' in errorState ? t(errorState.key, errorState.params) : errorState.message) : null
  const fileWarning = fileWarningState ? t(fileWarningState.key, fileWarningState.params) : null
  const fileMeta =
    fileInfo !== null
      ? t('transcription.placeholders.fileMeta', {
          name: fileInfo.name,
          size: (fileInfo.sizeKB / 1024).toFixed(2),
          sampleRate: fileInfo.sampleRate ? `${fileInfo.sampleRate}Hz` : '?',
        })
      : null

  const appendMessage = (text: string, confidence?: number) => {
    setMessages((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        text,
        confidence,
        timestamp: Date.now(),
      },
    ])
  }

  const clearFileStreaming = () => {
    if (fileStreamRef.current?.timerId) {
      window.clearTimeout(fileStreamRef.current.timerId)
    }
    fileStreamRef.current = null
    shouldStreamFileRef.current = false
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
        setErrorState({ key: 'transcription.errors.audioSendFailed' })
        pending.unshift(...chunkSamples)
        micStartSentRef.current = false
        return
      }

      if (
        sent &&
        !micStartSentRef.current &&
        clientRef.current.readyState() === WebSocket.OPEN
      ) {
        micStartSentRef.current = true
        try {
          clientRef.current.start({
            language: languageCode,
            enableInterimResults: true,
          })
        } catch (e) {
          console.log('Start command not needed for this endpoint')
        }
        setStatusState({ key: 'transcription.status.sendingFirstChunk' })
      }
    }
  }

  const handleMicrophoneSamples = (input: Float32Array, sampleRate: number) => {
    if (!isRecordingRef.current || mode !== 'microphone') {
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
      setStatusState({ key: 'transcription.status.recording' })
      setIsRecording(true)
      isRecordingRef.current = true
      setRecordingStartTime(Date.now())
      setElapsedTime(0)
    } catch (err) {
      console.error(err)
      await cleanupMicrophone()
      setIsRecording(false)
      isRecordingRef.current = false
      setStatusState({ key: 'transcription.status.ready' })
      setErrorState({ key: 'transcription.errors.microphonePermission' })
      clientRef.current?.close()
    }
  }

  const extractPcmData = (buffer: ArrayBuffer) => {
    const view = new DataView(buffer)
    if (buffer.byteLength < 44 || view.getUint32(0, false) !== 0x52494646) {
      return { data: buffer }
    }

    let offset = 12
    let dataOffset = 44
    let dataSize = buffer.byteLength - dataOffset
    let sampleRate: number | undefined
    let bitsPerSample: number | undefined

    while (offset + 8 <= buffer.byteLength) {
      const chunkId = view.getUint32(offset, false)
      const chunkSize = view.getUint32(offset + 4, true)
      if (chunkId === 0x666d7420) {
        sampleRate = view.getUint32(offset + 12, true)
        bitsPerSample = view.getUint16(offset + 22, true)
      } else if (chunkId === 0x64617461) {
        dataOffset = offset + 8
        dataSize = Math.min(chunkSize, buffer.byteLength - dataOffset)
        break
      }
      offset += 8 + chunkSize
    }

    return { data: buffer.slice(dataOffset, dataOffset + dataSize), sampleRate, bitsPerSample }
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      fileBufferRef.current = null
      setFileInfo(null)
      setFileWarningState(null)
      return
    }

    setErrorState(null)
    setFileWarningState(null)
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      const { data, sampleRate, bitsPerSample } = extractPcmData(buffer)
      fileBufferRef.current = data
      setFileInfo({
        name: file.name,
        sizeKB: Math.round(data.byteLength / 1024),
        sampleRate,
        bitsPerSample,
      })

      if (sampleRate && sampleRate !== 16000) {
        setFileWarningState({
          key: 'transcription.errors.sampleRateMismatch',
          params: { sampleRate },
        })
      } else if (bitsPerSample && bitsPerSample !== 16) {
        setFileWarningState({
          key: 'transcription.errors.bitDepthMismatch',
          params: { bitDepth: bitsPerSample },
        })
      }
    }
    reader.onerror = () => {
      setErrorState({ key: 'transcription.errors.fileReadFailed' })
      fileBufferRef.current = null
    }
    reader.readAsArrayBuffer(file)
  }

  const beginStreamingFile = () => {
    const state = fileStreamRef.current
    if (!state || !shouldStreamFileRef.current) {
      return
    }

    const streamNext = () => {
      const current = fileStreamRef.current
      if (!current || !shouldStreamFileRef.current) {
        return
      }

      if (current.offset >= current.buffer.byteLength) {
        clearFileStreaming()
        setStatusState({ key: 'transcription.status.fileFinished' })
        try {
          clientRef.current?.stop()
        } catch (err) {
          console.warn('Failed to send stop command after file streaming', err)
        }
        return
      }

      const end = Math.min(current.offset + CHUNK_SIZE, current.buffer.byteLength)
      let chunk = current.buffer.slice(current.offset, end)

      if (chunk.byteLength < CHUNK_SIZE) {
        const padded = new Uint8Array(CHUNK_SIZE)
        padded.set(new Uint8Array(chunk))
        chunk = padded.buffer
      }

      try {
        clientRef.current?.sendAudio(new Uint8Array(chunk))
      } catch (err) {
        console.error('Failed to send audio chunk', err)
        setErrorState({ key: 'transcription.errors.audioSendFailed' })
        clearFileStreaming()
        setIsRecording(false)
        return
      }

      current.offset = end
      current.timerId = window.setTimeout(streamNext, CHUNK_INTERVAL_MS)
    }

    streamNext()
  }

  const handleSocketEvent = (payload: TranscriptionEventMessage) => {
    switch (payload.event) {
      case 'session_started':
        if (mode === 'file' && shouldStreamFileRef.current && fileStreamRef.current) {
          setStatusState({ key: 'transcription.status.sessionReadyForFile' })
          beginStreamingFile()
        }
        break
      case 'session_closed':
        clearFileStreaming()
        if (mode === 'microphone') {
          pendingMicSamplesRef.current = []
          micStartSentRef.current = false
          void cleanupMicrophone()
        }
        setIsRecording(false)
        break
      case 'transcription': {
        if ('result' in payload && payload.result && typeof payload.result === 'object') {
          const result = payload.result as { is_final?: boolean; text?: string; confidence?: number }
          if (result.is_final && typeof result.text === 'string' && typeof result.confidence === 'number') {
            appendMessage(result.text, result.confidence)
            setInterimText('')
          } else if (typeof result.text === 'string') {
            setInterimText(result.text)
          }
        }
        break
      }
      case 'error':
        if ('message' in payload && typeof payload.message === 'string') {
          setErrorState({ message: payload.message })
        }
        clearFileStreaming()
        if (mode === 'microphone') {
          pendingMicSamplesRef.current = []
          micStartSentRef.current = false
          void cleanupMicrophone()
        }
        setIsRecording(false)
        break
      default:
        break
    }
  }

  const startMicrophoneRecording = async () => {
    setErrorState(null)
    setStatusState({ key: 'transcription.status.socketConnecting' })
    shouldStreamFileRef.current = false
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
        setStatusState({ key: 'transcription.status.microPreparing' })
        initializeMicrophoneStream().catch((err) => {
          console.error('Failed to initialize microphone stream', err)
          setErrorState({ key: 'transcription.errors.microPipelineFailed' })
          setStatusState({ key: 'transcription.status.ready' })
          void cleanupMicrophone()
          clientRef.current?.close()
          clientRef.current = null
        })
      },
      onError: () => {
        setErrorState({ key: 'transcription.errors.websocketError' })
        pendingMicSamplesRef.current = []
        micStartSentRef.current = false
        void cleanupMicrophone()
      },
      onClose: () => {
        setStatusState({ key: 'transcription.status.socketClosed' })
        setIsRecording(false)
        void cleanupMicrophone()
        micStartSentRef.current = false
        clientRef.current = null
        setRecordingStartTime(null)
        setElapsedTime(0)
      },
    })
  }

  const startFileStreaming = () => {
    if (!fileBufferRef.current) {
      setErrorState({ key: 'transcription.errors.fileRequired' })
      return
    }

    setStatusState({ key: 'transcription.status.fileConnecting' })
    try {
      void cleanupMicrophone()
      clientRef.current?.close()
      clientRef.current = null
      clientRef.current = createTranscriptionClient({
        onEvent: handleSocketEvent,
        onOpen: () => {
          if (clientRef.current) {
            clientRef.current.start({
              language: languageCode,
              enableInterimResults: true,
            })
          }
        },
        onError: () => setErrorState({ key: 'transcription.errors.websocketError' }),
        onClose: () => {
          setIsRecording(false)
          setStatusState({ key: 'transcription.status.socketClosed' })
          clearFileStreaming()
          shouldStreamFileRef.current = false
          clientRef.current = null
        },
      })

      fileStreamRef.current = {
        buffer: fileBufferRef.current,
        offset: 0,
      }
      shouldStreamFileRef.current = true

      const initialState = fileStreamRef.current
      if (initialState) {
        const end = Math.min(initialState.offset + CHUNK_SIZE, initialState.buffer.byteLength)
        let chunk = initialState.buffer.slice(initialState.offset, end)
        if (chunk.byteLength < CHUNK_SIZE) {
          const padded = new Uint8Array(CHUNK_SIZE)
          padded.set(new Uint8Array(chunk))
          chunk = padded.buffer
        }
        try {
          clientRef.current.sendAudio(new Uint8Array(chunk))
        } catch (initialError) {
          console.warn('Failed to send initial file chunk', initialError)
        }
        initialState.offset = end
        setStatusState({ key: 'transcription.status.fileSessionStarting' })
      }

      setIsRecording(true)
      setRecordingStartTime(Date.now())
      setElapsedTime(0)
    } catch (errorStarting) {
      console.error(errorStarting)
      setErrorState({ key: 'transcription.errors.fileStartFailed' })
      clearFileStreaming()
      setIsRecording(false)
    }
  }

  const startRecording = async () => {
    if (isRecording) {
      return
    }

    setErrorState(null)
    if (mode === 'file') {
      startFileStreaming()
    } else {
      await startMicrophoneRecording()
    }
  }

  const stopRecording = () => {
    const shouldNotifyStop = mode === 'file' || micStartSentRef.current

    if (mode === 'microphone') {
      void cleanupMicrophone()
      pendingMicSamplesRef.current = []
      micStartSentRef.current = false
    } else {
      clearFileStreaming()
    }
    shouldStreamFileRef.current = false

    if (clientRef.current) {
      try {
        if (shouldNotifyStop) {
          clientRef.current.stop()
        }
      } catch (err) {
        console.warn('Failed to send stop command', err)
      } finally {
        clientRef.current.close()
        clientRef.current = null
      }
    }

    setIsRecording(false)
    isRecordingRef.current = false
    setStatusState({ key: 'transcription.status.stopped' })
    setRecordingStartTime(null)
    setElapsedTime(0)
  }

  const resetTranscript = () => {
    clearFileStreaming()
    pendingMicSamplesRef.current = []
    shouldStreamFileRef.current = false
    setErrorState(null)
    setMessages([])
    setInterimText('')
    setStatusState({ key: 'transcription.status.cleared' })
    setRecordingStartTime(null)
    setElapsedTime(0)
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('transcription.breadcrumb')}</p>
          <h1>{t('transcription.title')}</h1>
        </div>
      </section>

      <section className="page-content-wrapper">
        <div className="page-content-container">
          <div className="transcription-layout">
            {/* Recorder Card - Left Side */}
            <div className="recorder-card">
              <div className="recorder-wave">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8"
                  />
                </svg>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <p className="recorder-timer" style={{ fontSize: isRecording ? '2rem' : '1.5rem', marginBottom: '0.5rem' }}>
                  {isRecording ? formatTime(elapsedTime) : statusText}
                </p>
                {isRecording && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {t('transcription.status.recording')}
                    </p>
                    {speakingRate > 0 && (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {language === 'ja' 
                          ? `話速: ${speakingRate} 文字/分`
                          : language === 'vi'
                          ? `Tốc độ: ${speakingRate} ký tự/phút`
                          : `Speed: ${speakingRate} chars/min`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="form-grid">
                <label>
                  {language === 'ja' ? '言語' : language === 'vi' ? 'Ngôn ngữ' : 'Language'}
                  <select
                    value={languageCode}
                    onChange={(event) => setLanguageCode(event.target.value)}
                    disabled={isRecording}
                  >
                    <option value="ja-JP">🇯🇵 日本語 (Japanese)</option>
                    <option value="vi-VN">🇻🇳 Tiếng Việt (Vietnamese)</option>
                    <option value="en-US">🇺🇸 English (Tiếng Anh)</option>
                  </select>
                </label>

                <label>
                  {t('transcription.labels.mode')}
                  <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value as 'microphone' | 'file')}
                    disabled={isRecording}
                  >
                    <option value="microphone">{t('transcription.modes.microphone')}</option>
                    <option value="file">{t('transcription.modes.file')}</option>
                  </select>
                </label>

                {mode === 'file' && (
                  <label>
                    {t('transcription.labels.fileInput')}
                    <input
                      id="audioFile"
                      type="file"
                      accept="audio/wav,audio/x-wav,audio/*"
                      disabled={isRecording}
                      onChange={handleFileChange}
                    />
                    {fileMeta && <small>{fileMeta}</small>}
                    {fileWarning && <p className="form-error">⚠️ {fileWarning}</p>}
                  </label>
                )}
              </div>

              <div className="recorder-actions">
                <button type="button" className="recorder-button" onClick={startRecording} disabled={isRecording}>
                  ●
                </button>
                <button type="button" className="secondary-button" onClick={stopRecording} disabled={!isRecording}>
                  {t('transcription.buttons.stop')}
                </button>
                <button type="button" className="link-button" onClick={resetTranscript}>
                  {t('transcription.buttons.reset')}
                </button>
              </div>

              {error && <p className="form-error">⚠️ {error}</p>}
            </div>

            {/* Messages Section - Right Side */}
            <div className="transcription-messages-section">
              <h2>{t('transcription.chatTitle')}</h2>
              <div className="chat-feed-compact" ref={chatFeedRef}>
                {messages.length === 0 && !interimText && (
                  <div className="chat-empty">
                    <p>{t('transcription.chat.empty')}</p>
                  </div>
                )}
                {messages.map((message) => (
                  <div className="chat-bubble-compact" key={message.id}>
                    <p>{message.text}</p>
                    {typeof message.confidence === 'number' && (
                      <div className="chat-meta-row">
                        <span className="chat-meta">
                          {t('transcription.chat.confidence', {
                            confidence: (message.confidence * 100).toFixed(1),
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {interimText && (
                  <div className="chat-bubble-compact interim">
                    <p>{interimText}</p>
                    <span className="chat-meta">{t('transcription.chat.processing')}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default RealtimeTranscriptionPage
