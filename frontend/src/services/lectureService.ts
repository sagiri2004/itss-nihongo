import type { Lecture, LecturePayload } from '../types/lecture'
import { httpClient } from './httpClient'

export const lectureService = {
  createLecture(payload: LecturePayload, token: string) {
    return httpClient<Lecture>('/api/lectures', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    })
  },
}


