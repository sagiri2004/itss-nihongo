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
  pageCount: number
  uploadStatus: string
}

export type LectureSummary = Lecture & {
  slideDeck?: SlideDeckSummary | null
}

export type SlidePage = {
  pageNumber: number | null
  title?: string | null
  contentSummary?: string | null
  allText?: string | null
  headings: string[]
  bullets: string[]
  body: string[]
  keywords: string[]
}

export type SlideDeckDetail = SlideDeckSummary & {
  contentSummary?: string | null
  createdAt: string
  signedUrl?: string | null
  pages: SlidePage[]
}

export type LectureDetail = Lecture & {
  updatedAt?: string
  slideDeck?: SlideDeckDetail | null
}


