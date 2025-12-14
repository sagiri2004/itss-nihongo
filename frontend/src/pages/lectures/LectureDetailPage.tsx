import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { lectureService } from '../../services/lectureService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import type { LectureDetail, SlidePage } from '../../types/lecture'
import SlideTranscriptionPanel from '../../components/transcription/SlideTranscriptionPanel'
import RecordingAnalysisPanel from '../../components/analysis/RecordingAnalysisPanel'
import '../../styles/lecture-detail.css'

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
  const [savedRecording, setSavedRecording] = useState<any>(null)

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

  const slideDeck = lecture?.slideDeck
  const pages: SlidePage[] = useMemo(() => slideDeck?.pages ?? [], [slideDeck])

  const statusLabels = useMemo(
    () => ({
      UPLOADED: t('slides.statusLabels.UPLOADED'),
      PROCESSING: t('slides.statusLabels.PROCESSING'),
      READY: t('slides.statusLabels.READY'),
      FAILED: t('slides.statusLabels.FAILED'),
    }),
    [t],
  )

  const lectureStatusLabels = useMemo(
    () => ({
      INFO_INPUT: t('myLectures.status.INFO_INPUT'),
      SLIDE_UPLOAD: t('myLectures.status.SLIDE_UPLOAD'),
      RECORDING: t('myLectures.status.RECORDING'),
      COMPLETED: t('myLectures.status.COMPLETED'),
    }),
    [t],
  )

  const deckStatusLabel =
    slideDeck?.uploadStatus &&
    (statusLabels[slideDeck.uploadStatus as keyof typeof statusLabels] ?? slideDeck.uploadStatus)

  const lectureStatusLabel =
    lecture?.status &&
    (lectureStatusLabels[lecture.status as keyof typeof lectureStatusLabels] ?? lecture.status)

  const keywordCount = useMemo(() => {
    if (slideDeck?.keywordsCount != null) {
      return slideDeck.keywordsCount
    }
    return pages.reduce((total, page) => {
        return total + (page.keywords?.length ?? 0)
    }, 0)
  }, [pages, slideDeck?.keywordsCount])
  const pageTotal = totalPages || pages.length
  const currentPage = pages[currentPageIndex] ?? null
  const currentPageSummary = currentPage?.summary ?? currentPage?.contentSummary ?? null

  // Reset savedRecording khi slide thay đổi
  useEffect(() => {
    setSavedRecording(null)
  }, [currentPageIndex])

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
                {t('lectureDetail.meta.status')}: <strong>{lectureStatusLabel || deckStatusLabel || '-'}</strong>
              </span>
              <span>
                {t('lectureDetail.meta.pages')}: <strong>{slideDeck.pageCount ?? pages.length}</strong>
              </span>
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

      {/* Main Content: Slide Viewer + Transcription Side by Side */}
      <section className="lecture-detail-main-grid">
        {/* Left: Slide Viewer */}
        <div className="slide-viewer-card-enhanced">
          <header className="slide-viewer-header-enhanced">
            <h2>{t('lectureDetail.viewer.title')}</h2>
            <span className="viewer-page-indicator-enhanced">
              {pageTotal > 0
                ? t('lectureDetail.viewer.pageLabel', {
                    current: Math.min(currentPageIndex + 1, pageTotal),
                    total: pageTotal,
                  })
                : ''}
            </span>
          </header>

          <div className="slide-viewer-body-enhanced">
            {viewerStateMessage ? (
              <div className="viewer-placeholder">{viewerStateMessage}</div>
            ) : (
              <>
                <div className="slide-canvas-container">
                  <canvas ref={canvasRef} className="slide-canvas-enhanced" />
                  {isPdfLoading && <div className="viewer-loading">{t('common.loading')}</div>}
                </div>
              </>
            )}
          </div>

          <footer className="viewer-controls-enhanced">
            <button
              type="button"
              className="secondary-button"
              onClick={handlePrev}
              disabled={currentPageIndex === 0 || Boolean(viewerStateMessage)}
            >
              ← {t('lectureDetail.viewer.prev')}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleNext}
              disabled={
                Boolean(viewerStateMessage) ||
                currentPageIndex >= Math.max(pageTotal - 1, 0)
              }
            >
              {t('lectureDetail.viewer.next')} →
            </button>
          </footer>
        </div>

        {/* Right: Transcription Panel */}
        <aside className="transcription-panel-card">
          {numericLectureId && (
            <SlideTranscriptionPanel
              lectureId={numericLectureId}
              slidePageNumber={currentPage?.pageNumber}
              keywords={currentPage?.keywords ?? []}
              onRecordingSaved={setSavedRecording}
            />
          )}
        </aside>
      </section>

      {/* Bottom: Summary and Keywords */}
      <section className="lecture-detail-summary-section">
        {currentPage && (
          <div className="slide-details-card">
            <header className="slide-details-header">
              <h2>
                {t('lectureDetail.summary.slideHeading', { page: currentPage.pageNumber ?? '?' })}
              </h2>
            </header>
            {currentPageSummary && (
              <div className="slide-summary-content">
                <h3>{t('lectureDetail.summary.summaryTitle')}</h3>
                <p className="slide-summary-paragraph">{currentPageSummary}</p>
              </div>
            )}
            {currentPage.keywords?.length > 0 && (
              <div className="keywords-section">
                <h3>{t('lectureDetail.summary.keywords')} ({currentPage.keywords.length})</h3>
                <div className="keyword-list-full">
                  {currentPage.keywords.map((item, index) => (
                    <span key={`keyword-${index}`} className="keyword-pill-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recording Analysis Panel */}
        {numericLectureId && (
          <RecordingAnalysisPanel
            recording={savedRecording}
            slideContent={currentPageSummary || ''}
            slideKeywords={currentPage?.keywords || []}
            lectureId={numericLectureId}
            slidePageNumber={currentPage?.pageNumber}
            onRecordingSaved={setSavedRecording}
          />
        )}
      </section>

      {isLoading && <p>{t('common.loading')}</p>}
      {error && <p className="form-error">{error}</p>}
    </>
  )
}

export default LectureDetailPage


