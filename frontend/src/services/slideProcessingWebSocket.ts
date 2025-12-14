import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

export interface SlideProcessingNotification {
  lectureId: number
  slideDeckId: number
  status: string
  message: string
}

type NotificationCallback = (notification: SlideProcessingNotification) => void

class SlideProcessingWebSocketService {
  private client: Client | null = null
  private subscribers: Map<number, Set<NotificationCallback>> = new Map()
  private isConnected = false

  connect(baseUrl: string = 'http://localhost:8080'): void {
    if (this.client && this.isConnected) {
      return
    }

    const socket = new SockJS(`${baseUrl}/ws`)
    this.client = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.isConnected = true
        console.log('WebSocket connected')
        // Subscribe to all active lecture IDs
        this.subscribers.forEach((_, lectureId) => {
          this.subscribeToLecture(lectureId)
        })
      },
      onDisconnect: () => {
        this.isConnected = false
        console.log('WebSocket disconnected')
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame)
      },
    })

    this.client.activate()
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate()
      this.client = null
      this.isConnected = false
    }
  }

  subscribe(lectureId: number, callback: NotificationCallback): () => void {
    if (!this.subscribers.has(lectureId)) {
      this.subscribers.set(lectureId, new Set())
    }
    this.subscribers.get(lectureId)!.add(callback)

    // If already connected, subscribe immediately
    if (this.isConnected && this.client) {
      this.subscribeToLecture(lectureId)
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(lectureId)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscribers.delete(lectureId)
        }
      }
    }
  }

  private subscribeToLecture(lectureId: number): void {
    if (!this.client || !this.isConnected) {
      return
    }

    const topic = `/topic/slide-processing/${lectureId}`
    this.client.subscribe(topic, (message) => {
      try {
        const notification: SlideProcessingNotification = JSON.parse(message.body)
        const callbacks = this.subscribers.get(lectureId)
        if (callbacks) {
          callbacks.forEach((callback) => callback(notification))
        }
      } catch (error) {
        console.error('Failed to parse notification:', error)
      }
    })
  }
}

export const slideProcessingWebSocket = new SlideProcessingWebSocketService()

