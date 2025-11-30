import type { AssetStatus } from './assetStatus'

export type SlideDeck = {
  id: number
  lectureId: number
  gcpAssetId: string
  originalName?: string | null
  pageCount?: number | null
  uploadStatus: AssetStatus
  createdAt: string
}


