import type { SlideDeck } from '../types/slide'
import { httpClient } from './httpClient'

export const slideService = {
  uploadSlideDeck(formData: FormData, token: string) {
    return httpClient<SlideDeck>('/api/slides', {
      method: 'POST',
      body: formData,
      token,
    })
  },
}


