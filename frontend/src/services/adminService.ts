import type { UserProfile } from '../types/auth'
import type { LectureSummary } from '../types/lecture'
import { httpClient, httpClientBlob } from './httpClient'

export type ChangePasswordRequest = {
  newPassword: string
}

export const adminService = {
  listUsers(token: string) {
    return httpClient<UserProfile[]>('/api/admin/users', {
      method: 'GET',
      token,
    })
  },

  deleteUser(userId: number, token: string) {
    return httpClient<void>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      token,
    })
  },

  changeUserPassword(userId: number, newPassword: string, token: string) {
    return httpClient<void>(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
      token,
    })
  },

  listLectures(token: string, status?: string) {
    const url = status
      ? `/api/admin/lectures?status=${status}`
      : '/api/admin/lectures'
    return httpClient<LectureSummary[]>(url, {
      method: 'GET',
      token,
    })
  },

  exportUsers(format: 'csv' | 'xlsx' | 'json', token: string) {
    return httpClientBlob(`/api/admin/export/users?format=${format}`, {
      method: 'GET',
      token,
    })
  },

  exportLectures(format: 'csv' | 'xlsx' | 'json', token: string, status?: string) {
    const url = status
      ? `/api/admin/export/lectures?format=${format}&status=${status}`
      : `/api/admin/export/lectures?format=${format}`
    return httpClientBlob(url, {
      method: 'GET',
      token,
    })
  },

  exportStatistics(format: 'json' | 'csv', token: string) {
    return httpClientBlob(`/api/admin/export/statistics?format=${format}`, {
      method: 'GET',
      token,
    })
  },
}

