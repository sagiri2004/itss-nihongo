export type LecturePayload = {
  title: string
  description?: string
}

export type Lecture = {
  id: number
  title: string
  description?: string | null
  status: string
  createdAt: string
}


