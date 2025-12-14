import type { History } from '../types/history'
import { httpClient } from './httpClient'

export const historyService = {
  getHistory(token: string, limit?: number): Promise<History[]> {
    const searchParams = new URLSearchParams()
    if (limit && limit > 0) {
      searchParams.set('limit', String(limit))
    }
    const query = searchParams.toString()
    const endpoint = query ? `/api/history?${query}` : '/api/history'
    return httpClient<History[]>(endpoint, { token })
  },
}

