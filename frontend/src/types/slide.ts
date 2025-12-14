import type { AssetStatus } from './assetStatus'

export type SlideDeck = {
  id: number
  lectureId: number
  gcpAssetId: string
  originalName?: string | null
  processedFileName?: string | null
  presentationId?: string | null
  pageCount?: number | null
  keywordsCount?: number | null
  hasEmbeddings?: boolean | null
  contentSummary?: string | null
  allSummary?: string | null
  uploadStatus: AssetStatus
  createdAt: string
}


