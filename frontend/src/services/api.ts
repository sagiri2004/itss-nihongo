import type { DashboardSummary } from '../types/dashboard'
import { httpClient } from './httpClient'

export const dashboardService = {
  fetchDashboard(token: string, limit = 5): Promise<DashboardSummary> {
    const params = new URLSearchParams({ limit: String(limit) })
    return httpClient<DashboardSummary>(`/api/dashboard/summary?${params.toString()}`, {
      token,
    })
  },
}

