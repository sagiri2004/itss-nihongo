import { httpClient } from './httpClient'

export type Notification = {
  id: number
  lecture_id: number | null
  lecture_title: string | null
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export type UnreadCountResponse = {
  count: number
}

export const notificationService = {
  async getNotifications(token: string): Promise<Notification[]> {
    return httpClient<Notification[]>('/api/notifications', { token })
  },

  async getUnreadCount(token: string): Promise<number> {
    const response = await httpClient<UnreadCountResponse>('/api/notifications/unread-count', { token })
    return response.count
  },

  async markAsRead(notificationId: number, token: string): Promise<void> {
    await httpClient(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      token,
    })
  },

  async markAllAsRead(token: string): Promise<void> {
    await httpClient('/api/notifications/read-all', {
      method: 'PATCH',
      token,
    })
  },
}

