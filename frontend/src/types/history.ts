export type History = {
  id: number
  lectureId: number | null
  lectureTitle: string | null
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'SLIDE_UPLOADED' | 'SLIDE_PROCESSED' | 'RECORDING_STARTED' | 'RECORDING_COMPLETED'
  description: string | null
  createdAt: string
}

