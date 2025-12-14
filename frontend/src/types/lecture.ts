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
  updatedAt?: string
}

export type SlideDeckSummary = {
  id: number
  gcpAssetId: string
  originalName?: string | null
  processedFileName?: string | null
  presentationId?: string | null
  pageCount: number
  keywordsCount?: number | null
  hasEmbeddings?: boolean | null
  uploadStatus: string
  contentSummary?: string | null
  allSummary?: string | null
}

export type LectureSummary = Lecture & {
  slideDeck?: SlideDeckSummary | null
}

/**
 * Simplified slide page type matching Gemini-based processing.
 * Only contains: pageNumber, summary, keywords
 */
export type SlidePage = {
  pageNumber: number | null
  contentSummary?: string | null
  summary?: string | null
  keywords: string[]
  // Deprecated fields (kept for backward compatibility, but will be empty)
  title?: string | null
  allText?: string | null
  headings: string[]
  bullets: string[]
  body: string[]
}

export type SlideDeckDetail = SlideDeckSummary & {
  createdAt: string
  signedUrl?: string | null
  pages: SlidePage[]
}

export type LectureDetail = Lecture & {
  updatedAt?: string
  slideDeck?: SlideDeckDetail | null
}

export type FinalAnalysisResponse = {
  id?: number | null
  lectureId: number
  overallScore: number | null
  overallFeedback: string | null
  contentCoverage: number | null
  structureQuality: number | null
  clarityScore: number | null
  engagementScore: number | null
  timeManagement: number | null
  slideAnalyses: Array<{
    slidePageNumber: number
    score: number | null
    feedback: string | null
    strengths: string[]
    improvements: string[]
  }>
  strengths: string[]
  improvements: string[]
  recommendations: string[]
}


