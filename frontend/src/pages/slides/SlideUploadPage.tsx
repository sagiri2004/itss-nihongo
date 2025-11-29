import { FormEvent, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { slideService } from '../../services/slideService'
import { useAuth } from '../../hooks/useAuth'
import type { SlideDeck } from '../../types/slide'

const SlideUploadPage = () => {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const [lectureId, setLectureId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentUpload, setRecentUpload] = useState<SlideDeck | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const paramLectureId = searchParams.get('lectureId')
    if (paramLectureId) {
      setLectureId(paramLectureId)
    }
  }, [searchParams])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lectureId || !file) {
      setError('Vui lòng nhập lecture ID và chọn file slide.')
      return
    }

    if (!token) {
      setError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
      return
    }

    const formData = new FormData()
    formData.append('lectureId', lectureId)
    formData.append('file', file)

    setIsUploading(true)
    setError(null)

    try {
      const response = await slideService.uploadSlideDeck(formData, token)
      setRecentUpload(response)
      setLectureId('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Upload thất bại, vui lòng thử lại.'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="slide-upload">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tài nguyên bài giảng</p>
          <h1>Upload slide deck lên Google Cloud</h1>
          <p className="subtitle">
            Chọn lecture cần gắn slide và upload file (PDF/PPTX). Backend sẽ đẩy lên bucket được cấu hình và lưu lại
            asset ID trong cơ sở dữ liệu.
          </p>
        </div>
      </header>

      <div className="upload-card">
        <form className="slide-form" onSubmit={handleSubmit}>
          <label className="form-field">
            Mã lecture
            <input
              type="number"
              min="1"
              placeholder="Ví dụ: 101"
              value={lectureId}
              onChange={(event) => setLectureId(event.target.value)}
              required
            />
          </label>

          <label className="form-field">
            Chọn file slide
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
            <span className="field-hint">Hỗ trợ PDF, PPT, PPTX (tối đa 50MB).</span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-btn" type="submit" disabled={isUploading}>
            {isUploading ? 'Đang upload...' : 'Upload slide'}
          </button>
        </form>
      </div>

      {recentUpload && (
        <div className="upload-card success">
          <h2>Slide đã được lưu</h2>
          <ul className="upload-meta">
            <li>
              <span>Lecture ID</span>
              <strong>{recentUpload.lectureId}</strong>
            </li>
            <li>
              <span>Tên gốc</span>
              <strong>{recentUpload.originalName ?? 'N/A'}</strong>
            </li>
            <li>
              <span>ID Google Cloud</span>
              <strong>{recentUpload.gcpAssetId}</strong>
            </li>
            <li>
              <span>Trạng thái</span>
              <strong>{recentUpload.uploadStatus}</strong>
            </li>
          </ul>
        </div>
      )}
    </section>
  )
}

export default SlideUploadPage


