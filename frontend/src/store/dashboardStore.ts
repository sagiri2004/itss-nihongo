import type { DashboardSummary } from '../types/dashboard'

type Listener = () => void

const initialState: DashboardSummary = {
  totalLectures: 0,
  totalSlideDecks: 0,
  totalTranscriptionRecords: 0,
  recentLectures: [],
}

let state: DashboardSummary = initialState
const listeners = new Set<Listener>()

export const dashboardStore = {
  getState: () => state,
  setState: (nextState: DashboardSummary) => {
    state = nextState
    listeners.forEach((listener) => listener())
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

