import type { LectureSummary } from './lecture'

export type DashboardSummary = {
  totalLectures: number
  totalSlideDecks: number
  totalTranscriptionRecords: number
  recentLectures: LectureSummary[]
}

