import { useCallback, useSyncExternalStore } from 'react'

import { dashboardService } from '../services/api'
import { dashboardStore } from '../store/dashboardStore'

export function useDashboardData() {
  const data = useSyncExternalStore(dashboardStore.subscribe, dashboardStore.getState)

  const refresh = useCallback(async (token?: string | null) => {
    if (!token) return
    const latest = await dashboardService.fetchDashboard(token)
    dashboardStore.setState(latest)
  }, [])

  return { data, refresh }
}

