import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { lectureService } from '../../services/lectureService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import type { LectureDetail, SlidePage } from '../../types/lecture'

GlobalWorkerOptions.workerSrc = pdfWorker

type PdfRenderTask = {
  cancel: () => void
  promise: Promise<unknown>
}

const VIEWER_SCALE = 1.2

const LectureDetailPage = () => {
  const { lectureId } = useParams<{ lectureId: string }>()
  const numericLectureId = Number(lectureId)
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  const [lecture, setLecture] = useState<LectureDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<PdfRenderTask | null>(null)

  useEffect(() => {
    if (!numericLectureId || !token) {
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)

    lectureService
      .getLectureDetail(numericLectureId, token)
      .then((data) => {
        if (!active) return
        setLecture(data)
        setCurrentPageIndex(0)
      })
      .catch((fetchError) => {
        if (!active) return
        const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
        setError(message)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [numericLectureId, token])

  useEffect(() => {
    if (!token || !numericLectureId) {
      return
    }

    const slideDeck = lecture?.slideDeck
    if (!slideDeck || slideDeck.uploadStatus !== 'READY') {
      cleanupPdf()
      setTotalPages(0)
      return
    }

    let cancelled = false
    setIsPdfLoading(true)

    lectureService
      .downloadSlideDeck(numericLectureId, token)
      .then(async (blob) => {
        if (cancelled) {
          return
        }
        const buffer = new Uint8Array(await blob.arrayBuffer())
        const pdf = await getDocument({ data: buffer }).promise
        if (cancelled) {
          pdf.destroy()
          return
        }
        cleanupPdf()
        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setIsPdfLoading(false)
        setTimeout(() => {
          renderPage(1)
          setCurrentPageIndex(0)
        }, 0)
      })
      .catch((downloadError) => {
        if (!cancelled) {
          setIsPdfLoading(false)
          setError(downloadError instanceof Error ? downloadError.message : String(downloadError))
        }
      })

    return () => {
      cancelled = true
      cleanupPdf()
    }
  }, [lecture?.slideDeck, numericLectureId, token])

  useEffect(() => {
    if (pdfRef.current) {
      renderPage(currentPageIndex + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex])

  const cleanupPdf = () => {
    renderTaskRef.current?.cancel()
    renderTaskRef.current = null
    if (pdfRef.current) {
      pdfRef.current.destroy()
      pdfRef.current = null
    }
  }

  const renderPage = async (pageNumber: number) => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return

    try {
      setIsPdfLoading(true)
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: VIEWER_SCALE })
      const context = canvas.getContext('2d')
      if (!context) return

      const outputScale = window.devicePixelRatio || 1
      canvas.width = viewport.width * outputScale
      canvas.height = viewport.height * outputScale
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

      renderTaskRef.current?.cancel()

      const renderTask = page.render({
        canvasContext: context,
        viewport,
        transform,
      })
      renderTaskRef.current = renderTask
      await renderTask.promise
      renderTaskRef.current = null
    } catch (renderError) {
      if (!/Rendering cancelled/.test(String(renderError))) {
        setError(renderError instanceof Error ? renderError.message : String(renderError))
      }
    } finally {
      setIsPdfLoading(false)
    }
  }

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [language],
  )

  const slideDeck = lecture?.slideDeck
  const statusLabels = useMemo(
    () => ({
      UPLOADED: t('slides.statusLabels.UPLOADED'),
      PROCESSING: t('slides.statusLabels.PROCESSING'),
      READY: t('slides.statusLabels.READY'),
      FAILED: t('slides.statusLabels.FAILED'),
    }),
    [t],
  )

  const deckStatusLabel =
    slideDeck?.uploadStatus &&
    (statusLabels[slideDeck.uploadStatus as keyof typeof statusLabels] ?? slideDeck.uploadStatus)

  const pages: SlidePage[] = slideDeck?.pages ?? []
  const keywordCount = useMemo(
    () =>
      pages.reduce((total, page) => {
        return total + (page.keywords?.length ?? 0)
      }, 0),
    [pages],
  )
  const pageTotal = totalPages || pages.length
  const currentPage = pages[currentPageIndex] ?? null

  const handlePrev = () => {
    setCurrentPageIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleNext = () => {
    const maxIndex = Math.max(pageTotal - 1, 0)
    setCurrentPageIndex((prev) => Math.min(prev + 1, maxIndex))
  }

  const navigateToUpload = () => {
    if (numericLectureId) {
      navigate(`/app/slides/upload?lectureId=${numericLectureId}`)
    }
  }

  const viewerStateMessage = useMemo(() => {
    if (isLoading) {
      return null
    }
    if (!lecture) {
      return null
    }
    if (!slideDeck) {
      return t('lectureDetail.viewer.noSlides')
    }
    if (slideDeck.uploadStatus === 'PROCESSING') {
      return t('lectureDetail.viewer.processing')
    }
    if (slideDeck.uploadStatus === 'FAILED') {
      return statusLabels.FAILED
    }
    if (slideDeck.uploadStatus !== 'READY') {
      return t('lectureDetail.viewer.processing')
    }
    return null
  }, [isLoading, lecture, slideDeck, statusLabels, t])

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('lectureDetail.breadcrumb')}</p>
          <h1>{t('lectureDetail.title')}</h1>
          {slideDeck && (
            <div className="hero-meta">
              <span>
                {t('lectureDetail.meta.lectureTitle')}: <strong>{lecture?.title ?? '-'}</strong>
              </span>
              <span>
                {t('lectureDetail.meta.status')}: <strong>{deckStatusLabel}</strong>
              </span>
              <span>
                {t('lectureDetail.meta.pages')}: <strong>{slideDeck.pageCount ?? pages.length}</strong>
              </span>
              {slideDeck.originalName && (
                <span>
                  {t('lectureDetail.meta.originalName')}:{' '}
                  <strong>{slideDeck.originalName}</strong>
                </span>
              )}
              {slideDeck.createdAt && (
                <span>
                  {t('lectureDetail.meta.uploadedAt')}:{' '}
                  <strong>{dateFormatter.format(new Date(slideDeck.createdAt))}</strong>
                </span>
              )}
              {slideDeck.contentSummary && (
                <span>
                  {t('lectureDetail.meta.summary')}: <strong>{slideDeck.contentSummary}</strong>
                </span>
              )}
              <span>
                {t('lectureDetail.meta.keywords')}: <strong>{keywordCount}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={navigateToUpload}>
            {t('lectureDetail.actions.upload')}
          </button>
        </div>
      </section>

      <section className="lecture-detail-grid">
        <div className="slide-viewer-card">
          <header className="slide-viewer-header">
            <h2>{t('lectureDetail.viewer.title')}</h2>
            {slideDeck && slideDeck.contentSummary && (
              <p className="viewer-summary">{slideDeck.contentSummary}</p>
            )}
          </header>

          <div className="slide-viewer-body">
            {viewerStateMessage ? (
              <div className="viewer-placeholder">{viewerStateMessage}</div>
            ) : (
              <>
                <canvas ref={canvasRef} className="slide-canvas" />
                {isPdfLoading && <div className="viewer-loading">{t('common.loading')}</div>}
              </>
            )}
          </div>

          <footer className="viewer-controls">
            <button
              type="button"
              className="secondary-button"
              onClick={handlePrev}
              disabled={currentPageIndex === 0 || Boolean(viewerStateMessage)}
            >
              {t('lectureDetail.viewer.prev')}
            </button>
            <span className="viewer-page-indicator">
              {pageTotal > 0
                ? t('lectureDetail.viewer.pageLabel', {
                    current: Math.min(currentPageIndex + 1, pageTotal),
                    total: pageTotal,
                  })
                : ''}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={handleNext}
              disabled={
                Boolean(viewerStateMessage) ||
                currentPageIndex >= Math.max(pageTotal - 1, 0)
              }
            >
              {t('lectureDetail.viewer.next')}
            </button>
          </footer>
        </div>

        <aside className="slide-summary-card">
          <header className="slide-summary-header">
            <h2>{t('lectureDetail.summary.title')}</h2>
          </header>
          {currentPage ? (
            <div className="slide-summary">
              <h3>{t('lectureDetail.summary.slideHeading', { page: currentPage.pageNumber ?? '?' })}</h3>
              {currentPage.title && <p className="slide-summary-title">{currentPage.title}</p>}
              {currentPage.contentSummary && (
                <p className="slide-summary-paragraph">{currentPage.contentSummary}</p>
              )}
              {currentPage.allText && (
                <details open>
                  <summary>{t('lectureDetail.summary.allText')}</summary>
                  <p>{currentPage.allText}</p>
                </details>
              )}
              {currentPage.headings?.length > 0 && (
                <div>
                  <strong>{t('lectureDetail.summary.headings')}</strong>
                  <ul>
                    {currentPage.headings.map((item, index) => (
                      <li key={`heading-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {currentPage.bullets?.length > 0 && (
                <div>
                  <strong>{t('lectureDetail.summary.bullets')}</strong>
                  <ul>
                    {currentPage.bullets.map((item, index) => (
                      <li key={`bullet-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {currentPage.body?.length > 0 && (
                <div>
                  <strong>{t('lectureDetail.summary.body')}</strong>
                  <ul>
                    {currentPage.body.map((item, index) => (
                      <li key={`body-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {currentPage.keywords?.length > 0 && (
                <div className="keywords-row">
                  <strong>{t('lectureDetail.summary.keywords')}</strong>
                  <div className="keyword-list">
                    {currentPage.keywords.map((item, index) => (
                      <span key={`keyword-${index}`} className="keyword-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="slide-summary-empty">{t('lectureDetail.summary.empty')}</p>
          )}
        </aside>
      </section>

      <section className="form-section">
        <h2>{t('lectureDetail.audio.title')}</h2>
        <div className="audio-placeholder">
          <p>{t('lectureDetail.audio.placeholder')}</p>
        </div>
      </section>

      {isLoading && <p>{t('common.loading')}</p>}
      {error && <p className="form-error">{error}</p>}
    </>
  )
}

export default LectureDetailPage


