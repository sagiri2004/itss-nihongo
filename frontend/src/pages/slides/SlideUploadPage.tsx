import type { DragEvent, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { slideService } from '../../services/slideService'
import { useAuth } from '../../hooks/useAuth'
import type { SlideDeck } from '../../types/slide'
import { useLanguage } from '../../context/LanguageContext'

const SlideUploadPage = () => {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const [lectureId, setLectureId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentUpload, setRecentUpload] = useState<SlideDeck | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const formatBoolean = (value: boolean | null | undefined) => {
    if (value == null) {
      return t('common.boolean.unknown')
    }
    return value ? t('common.boolean.yes') : t('common.boolean.no')
  }

  useEffect(() => {
    const paramLectureId = searchParams.get('lectureId')
    if (paramLectureId) {
      setLectureId(paramLectureId)
    }
  }, [searchParams])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lectureId || !file) {
      setError(t('slides.errors.missingFields'))
      return
    }

    if (!token) {
      setError(t('slides.errors.sessionExpired'))
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
      const message = uploadError instanceof Error ? uploadError.message : t('slides.errors.uploadFailed')
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('slides.breadcrumb')}</p>
          <h1>{t('slides.title')}</h1>
        </div>
      </section>

      <section className="page-content-wrapper">
        <div className="page-content-container">
          <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('slides.lectureId')}
            <input
              type="number"
              min="1"
              placeholder={t('slides.placeholders.lectureId')}
              value={lectureId}
              onChange={(event) => setLectureId(event.target.value)}
              required
            />
          </label>

          <label
            className="upload-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            htmlFor="slide-file-input"
          >
            <strong>{t('slides.dropTitle')}</strong>
            <span>{t('slides.dropHint')}</span>
            <input
              id="slide-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              hidden
            />
            {file && <span>{t('slides.selectedFile', { fileName: file.name })}</span>}
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="secondary-button" type="reset" onClick={() => setFile(null)}>
              {t('slides.reset')}
            </button>
            <button className="primary-button" type="submit" disabled={isUploading}>
              {isUploading ? t('slides.uploading') : t('slides.upload')}
            </button>
          </div>
        </form>

        {recentUpload && (
          <div className="form-section">
          <h2>{t('slides.history')}</h2>
          <ul className="upload-list">
            <li>
              <span>{t('slides.status.lectureId')}</span>
              <strong>{recentUpload.lectureId}</strong>
            </li>
            {recentUpload.presentationId && (
              <li>
                <span>{t('slides.status.presentationId')}</span>
                <strong>{recentUpload.presentationId}</strong>
              </li>
            )}
            <li>
              <span>{t('slides.status.originalName')}</span>
              <strong>{recentUpload.originalName ?? '不明'}</strong>
            </li>
            {recentUpload.processedFileName && (
              <li>
                <span>{t('slides.status.processedName')}</span>
                <strong>{recentUpload.processedFileName}</strong>
              </li>
            )}
            <li>
              <span>{t('slides.status.gcpAssetId')}</span>
              <strong>{recentUpload.gcpAssetId}</strong>
            </li>
            <li>
              <span>{t('slides.status.uploadStatus')}</span>
              <strong>{recentUpload.uploadStatus}</strong>
            </li>
            {recentUpload.pageCount != null && (
              <li>
                <span>{t('slides.status.pageCount')}</span>
                <strong>{recentUpload.pageCount}</strong>
              </li>
            )}
            {recentUpload.keywordsCount != null && (
              <li>
                <span>{t('slides.status.keywordsCount')}</span>
                <strong>{recentUpload.keywordsCount}</strong>
              </li>
            )}
            <li>
              <span>{t('slides.status.hasEmbeddings')}</span>
              <strong>{formatBoolean(recentUpload.hasEmbeddings)}</strong>
            </li>
          </ul>
          </div>
        )}
        </div>
      </section>
    </>
  )
}

export default SlideUploadPage

