import type { Lecture, LectureDetail, LecturePayload, LectureSummary } from '../types/lecture'
import { httpClient, httpClientBlob } from './httpClient'

export const lectureService = {
  createLecture(payload: LecturePayload, token: string) {
    return httpClient<Lecture>('/api/lectures', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    })
  },
  listLectures(token: string, limit?: number) {
    const searchParams = new URLSearchParams()
    if (limit && limit > 0) {
      searchParams.set('limit', String(limit))
    }
    const query = searchParams.toString()
    const endpoint = query ? `/api/lectures?${query}` : '/api/lectures'
    return httpClient<LectureSummary[]>(endpoint, { token })
  },
  getLectureDetail(lectureId: number, token: string) {
    return httpClient<LectureDetail>(`/api/lectures/${lectureId}`, { token })
  },
  downloadSlideDeck(lectureId: number, token: string) {
    return httpClientBlob(`/api/lectures/${lectureId}/slide-deck/file`, {
      token,
    })
  },
}


