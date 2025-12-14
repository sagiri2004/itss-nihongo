import type { FinalAnalysisResponse } from '../types/lecture'
import { httpClient } from './httpClient'

// Backend returns snake_case, we need to convert to camelCase
interface BackendFinalAnalysisResponse {
  id?: number | null
  lecture_id: number
  overall_score: number | null
  overall_feedback: string | null
  content_coverage: number | null
  structure_quality: number | null
  clarity_score: number | null
  engagement_score: number | null
  time_management: number | null
  slide_analyses: Array<{
    slide_page_number: number
    score: number | null
    feedback: string | null
    strengths: string[]
    improvements: string[]
  }>
  strengths: string[]
  improvements: string[]
  recommendations: string[]
}

function mapBackendResponseToFrontend(backend: BackendFinalAnalysisResponse): FinalAnalysisResponse {
  return {
    id: backend.id,
    lectureId: backend.lecture_id,
    overallScore: backend.overall_score,
    overallFeedback: backend.overall_feedback,
    contentCoverage: backend.content_coverage,
    structureQuality: backend.structure_quality,
    clarityScore: backend.clarity_score,
    engagementScore: backend.engagement_score,
    timeManagement: backend.time_management,
    slideAnalyses: backend.slide_analyses.map(sa => ({
      slidePageNumber: sa.slide_page_number,
      score: sa.score,
      feedback: sa.feedback,
      strengths: sa.strengths || [],
      improvements: sa.improvements || [],
    })),
    strengths: backend.strengths || [],
    improvements: backend.improvements || [],
    recommendations: backend.recommendations || [],
  }
}

export const finalAnalysisService = {
  async performFinalAnalysis(lectureId: number, token: string): Promise<FinalAnalysisResponse> {
    const backendResponse = await httpClient<BackendFinalAnalysisResponse>(
      `/api/lectures/${lectureId}/final-analysis`,
      {
        method: 'POST',
        token,
      }
    )
    return mapBackendResponseToFrontend(backendResponse)
  },

  async getFinalAnalysis(lectureId: number, token: string): Promise<FinalAnalysisResponse | null> {
    try {
      const backendResponse = await httpClient<BackendFinalAnalysisResponse>(
        `/api/lectures/${lectureId}/final-analysis`,
        {
          method: 'GET',
          token,
        }
      )
      return mapBackendResponseToFrontend(backendResponse)
    } catch {
      return null
    }
  },

  deleteFinalAnalysis(lectureId: number, token: string): Promise<void> {
    return httpClient<void>(`/api/lectures/${lectureId}/final-analysis`, {
      method: 'DELETE',
      token,
    })
  },
}

