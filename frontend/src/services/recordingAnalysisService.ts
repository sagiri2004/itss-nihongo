import { httpClient } from './httpClient'

export type AnalysisRequest = {
  lecture_id: number
  slide_page_number: number
  slide_content: string
  slide_keywords: string[]
  transcript_texts: string[]
  language_code: string
}

export type AnalysisResponse = {
  context_accuracy: number
  content_completeness: number
  context_relevance: number
  feedback: string
  suggestions: string[]
}

export type SaveAnalysisRequest = {
  recording_id: number
  context_accuracy: number
  content_completeness: number
  context_relevance: number
  average_speech_rate: number
  feedback: string
  suggestions: string[]
}

export type RecordingAnalysisResponse = {
  id: number
  recording_id: number
  context_accuracy: number
  content_completeness: number
  context_relevance: number
  average_speech_rate: number
  feedback: string
  suggestions: string[]
  analyzed_at: string
}

export const recordingAnalysisService = {
  async analyzeRecording(request: AnalysisRequest): Promise<AnalysisResponse> {
    // Call FastAPI service
    const fastApiUrl = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8010'
    const response = await fetch(`${fastApiUrl}/analysis/analyze-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Analysis failed' }))
      throw new Error(error.detail || 'Analysis failed')
    }

    return response.json()
  },

  async saveAnalysis(request: SaveAnalysisRequest, token: string): Promise<RecordingAnalysisResponse> {
    return httpClient<RecordingAnalysisResponse>('/api/recording-analyses', {
      method: 'POST',
      body: JSON.stringify(request),
      token,
    })
  },

  async getAnalysis(recordingId: number, token: string): Promise<RecordingAnalysisResponse | null> {
    try {
      return await httpClient<RecordingAnalysisResponse>(
        `/api/recording-analyses/recording/${recordingId}`,
        { token }
      )
    } catch (error: any) {
      if (error?.status === 404) {
        return null
      }
      throw error
    }
  },
}

