import type { LectureSummary } from './lecture'

export type DashboardSummary = {
  totalLectures: number
  totalSlideDecks: number
  totalTranscriptionRecords: number
  recentLectures: LectureSummary[]
}

export type Metric = {
  label: string
  value: string
  trend: string
}

export type Alert = {
  id: string
  summary: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
}

export type TaskItem = {
  id: string
  title: string
  owner: string
  status: string
}

export type ActivityItem = {
  id: number
  description: string
  time: string
}

export type DashboardData = {
  metrics: Metric[]
  alerts: Alert[]
  tasks: TaskItem[]
  activity: ActivityItem[]
}

