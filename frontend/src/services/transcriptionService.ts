const DEFAULT_WS_URL =
  import.meta.env.VITE_SPEECH_WS_URL ?? 'ws://localhost:8010/ws/transcribe'

export type StreamingResultPayload = {
  text: string
  is_final: boolean
  confidence: number
  timestamp: number
  words: Array<Record<string, unknown>>
  session_id?: string
  presentation_id?: string
  slide?: Record<string, unknown>
  matched_keywords?: string[]
  [key: string]: unknown
}

export type TranscriptionEventMessage =
  | {
      event: 'transcription'
      result: StreamingResultPayload
    }
  | {
      event: 'session_started'
      session_id: string
      presentation_id: string
      language_code: string
      model: string
    }
  | {
      event: 'session_closed'
      session_id: string
      summary: Record<string, unknown>
    }
  | {
      event: 'error'
      message: string
      [key: string]: unknown
    }
  | {
      event: string
      [key: string]: unknown
    }

export type StartSessionOptions = {
  lectureId: number
  sessionId?: string
  presentationId?: string
  languageCode?: string
  model?: string
  enableInterimResults?: boolean
}

export type TranscriptionClient = {
  start: (options: StartSessionOptions) => void
  sendAudio: (chunk: ArrayBuffer | ArrayBufferView | Blob) => void
  stop: () => void
  close: () => void
  readyState: () => number
}

type CreateClientOptions = {
  url?: string
  onEvent: (payload: TranscriptionEventMessage) => void
  onOpen?: () => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
}

export const createTranscriptionClient = ({
  url = DEFAULT_WS_URL,
  onEvent,
  onOpen,
  onError,
  onClose,
}: CreateClientOptions): TranscriptionClient => {
  let socket: WebSocket | null = null
  let pendingStartPayload: Record<string, unknown> | null = null
  const pendingBinary: ArrayBuffer[] = []

  const sendJson = (payload: Record<string, unknown>) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    socket.send(JSON.stringify(payload))
  }

  const ensureSocket = () => {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      return
    }

    socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'

    socket.onopen = () => {
      while (pendingBinary.length > 0) {
        const data = pendingBinary.shift()
        if (data) {
          socket?.send(data)
        }
      }

      if (pendingStartPayload) {
        socket?.send(JSON.stringify(pendingStartPayload))
        pendingStartPayload = null
      }
      onOpen?.()
    }

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data) as TranscriptionEventMessage
          onEvent(parsed)
        } catch (error) {
          console.warn('Failed to parse transcription message', error)
        }
      }
    }

    socket.onerror = (event: Event) => {
      onError?.(event)
    }

    socket.onclose = (event: CloseEvent) => {
      pendingBinary.length = 0
      onClose?.(event)
    }
  }

  const enqueueBinary = (buffer: ArrayBuffer) => {
    ensureSocket()
    if (!socket) {
      throw new Error('WebSocket is not initialised')
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(buffer)
    } else {
      pendingBinary.push(buffer)
    }
  }

  ensureSocket()

  return {
    start: ({
      lectureId,
      sessionId,
      presentationId,
      languageCode,
      model,
      enableInterimResults,
    }: StartSessionOptions) => {
      pendingStartPayload = {
        action: 'start',
        lecture_id: lectureId,
        session_id: sessionId,
        presentation_id: presentationId,
        language_code: languageCode,
        model,
        enable_interim_results: enableInterimResults,
      }

      ensureSocket()

      if (socket?.readyState === WebSocket.OPEN && pendingStartPayload) {
        socket.send(JSON.stringify(pendingStartPayload))
        pendingStartPayload = null
      }
    },
    sendAudio: (chunk: ArrayBuffer | ArrayBufferView | Blob) => {
      if (chunk instanceof Blob) {
        chunk
          .arrayBuffer()
          .then((buffer) => enqueueBinary(buffer))
          .catch((error) => console.error('Failed to read blob audio chunk', error))
      } else if (ArrayBuffer.isView(chunk)) {
        const view = chunk as ArrayBufferView
        const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
        enqueueBinary(buffer as ArrayBuffer)
      } else {
        enqueueBinary(chunk)
      }
    },
    stop: () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return
      }
      sendJson({ action: 'stop' })
    },
    close: () => {
      pendingStartPayload = null
      pendingBinary.length = 0
      socket?.close()
      socket = null
    },
    readyState: () => socket?.readyState ?? WebSocket.CLOSED,
  }
}


