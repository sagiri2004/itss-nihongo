import { httpClient } from './httpClient'

export type SlideRecordingMessage = {
  id?: string
  text: string
  relative_time_sec: number
  timestamp: number
}

export type SaveSlideRecordingRequest = {
  lecture_id: number
  slide_page_number?: number
  recording_duration_sec: number
  language_code: string
  messages: SlideRecordingMessage[]
}

export type SlideRecordingResponse = {
  id: number
  lecture_id: number
  slide_page_number?: number
  recording_duration_sec: number
  language_code: string
  submitted_at: string
  messages: Array<{
    id: number
    text: string
    relative_time_sec: number
    timestamp: string
  }>
}

export const slideRecordingService = {
  async saveRecording(request: SaveSlideRecordingRequest, token: string): Promise<SlideRecordingResponse> {
    return httpClient<SlideRecordingResponse>('/api/slide-recordings', {
      method: 'POST',
      body: JSON.stringify(request),
      token,
    })
  },

  async getRecording(lectureId: number, token: string, slidePageNumber?: number): Promise<SlideRecordingResponse | null> {
    try {
      const params = new URLSearchParams()
      params.set('lecture_id', String(lectureId))
      if (slidePageNumber !== undefined) {
        params.set('slide_page_number', String(slidePageNumber))
      }
      const result = await httpClient<SlideRecordingResponse>(`/api/slide-recordings?${params.toString()}`, { token })
      // Return null if result is undefined or null (no recording found)
      return result || null
    } catch (error: any) {
      // Return null if not found (404) or any other error
      // Backend now returns 200 OK with empty body, so this catch is for other errors
      console.error('Error fetching recording:', error)
      return null
    }
  },
}

