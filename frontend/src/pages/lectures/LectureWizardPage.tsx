import { type DragEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { lectureService } from '../../services/lectureService'
import { slideService } from '../../services/slideService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import SlideTranscriptionPanel from '../../components/transcription/SlideTranscriptionPanel'
import RecordingAnalysisPanel from '../../components/analysis/RecordingAnalysisPanel'
import type { LectureDetail } from '../../types/lecture'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { slideProcessingWebSocket } from '../../services/slideProcessingWebSocket'
import '../../styles/lecture-wizard.css'

GlobalWorkerOptions.workerSrc = pdfWorker

type Step = 1 | 2 | 3

type PdfRenderTask = {
  cancel: () => void
  promise: Promise<unknown>
}

const VIEWER_SCALE = 1.2

const LectureWizardPage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const lectureIdParam = searchParams.get('lectureId')
  
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [lectureId, setLectureId] = useState<number | null>(lectureIdParam ? Number(lectureIdParam) : null)
  
  // Step 1: Create Lecture
  const [form, setForm] = useState({
    title: '',
    datetime: '',
    participants: '',
    memo: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Step 2: Upload Slide
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Clear errors when step changes
  useEffect(() => {
    setCreateError(null)
    setUploadError(null)
    setUploadStatus(null)
  }, [currentStep])

  // WebSocket connection for slide processing notifications
  useEffect(() => {
    if (!lectureId) return

    // Connect WebSocket (only once, service manages connection)
    slideProcessingWebSocket.connect()

    // Subscribe to notifications for this lecture
    const unsubscribe = slideProcessingWebSocket.subscribe(lectureId, (notification) => {
      console.log('Received slide processing notification:', notification)
      
      if (notification.status === 'READY') {
        setIsProcessing(false)
        setUploadStatus(t('slides.processingComplete'))
        
        // Redirect to lecture detail page after processing is complete
        setTimeout(() => {
          navigate(`/app/lectures/${lectureId}`)
        }, 1500)
      } else if (notification.status === 'FAILED') {
        setIsProcessing(false)
        setUploadError(t('slides.processingFailed'))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [lectureId, token, t, navigate])

  // Fallback: Poll lecture status if WebSocket doesn't work or isProcessing is true
  useEffect(() => {
    if (!isProcessing || !lectureId || !token) return

    let pollingInterval: number | null = null
    let timeoutId: number | null = null

    // Poll every 5 seconds
    pollingInterval = setInterval(async () => {
      try {
        const updatedLecture = await lectureService.getLectureDetail(lectureId, token)
        // Check if processing is complete (has pages)
        if (updatedLecture.slideDeck?.pages && updatedLecture.slideDeck.pages.length > 0) {
          setIsProcessing(false)
          setUploadStatus(t('slides.processingComplete'))
          setLecture(updatedLecture)
          // Redirect to lecture detail page after processing is complete
          setTimeout(() => {
            navigate(`/app/lectures/${lectureId}`)
          }, 1500)
        }
      } catch (err) {
        console.error('Failed to poll lecture status', err)
      }
    }, 5000)

    // Timeout after 10 minutes
    timeoutId = setTimeout(() => {
      setIsProcessing(false)
      setUploadError(t('slides.processingTimeout') || 'Processing is taking longer than expected. Please refresh the page.')
    }, 10 * 60 * 1000) // 10 minutes

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isProcessing, lectureId, token, t, navigate])

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect here as other components might be using it
      // The service manages its own lifecycle
    }
  }, [])

  // Step 3: Record Audio
  const [lecture, setLecture] = useState<LectureDetail | null>(null)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isLoadingLecture, setIsLoadingLecture] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<PdfRenderTask | null>(null)

  // Load lecture when lectureId is available
  useEffect(() => {
    if (!lectureId || !token) return

    let active = true
    setIsLoadingLecture(true)

    lectureService
      .getLectureDetail(lectureId, token)
      .then((data) => {
        if (!active) return
        setLecture(data)
        if (data.slideDeck?.pages && data.slideDeck.pages.length > 0) {
          setCurrentPageIndex(0)
        }
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to load lecture', err)
      })
      .finally(() => {
        if (active) {
          setIsLoadingLecture(false)
        }
      })

    return () => {
      active = false
    }
  }, [lectureId, token])

  // Render PDF when lecture or page changes
  useEffect(() => {
    if (!lecture?.slideDeck?.signedUrl || !canvasRef.current) return

    const renderPdf = async () => {
      setIsPdfLoading(true)
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }

        if (!pdfRef.current) {
          const loadingTask = getDocument(lecture.slideDeck!.signedUrl!)
          pdfRef.current = await loadingTask.promise
          // Total pages available in pdfRef.current.numPages
        }

        const page = await pdfRef.current.getPage(currentPageIndex + 1)
        const canvas = canvasRef.current!
        const context = canvas.getContext('2d')!
        const viewport = page.getViewport({ scale: VIEWER_SCALE })

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const task = page.render(renderContext)
        renderTaskRef.current = { cancel: task.cancel, promise: task.promise }

        await task.promise
      } catch (err) {
        console.error('Failed to render PDF', err)
      } finally {
        setIsPdfLoading(false)
      }
    }

    renderPdf()
  }, [lecture?.slideDeck?.signedUrl, currentPageIndex])

  // Step 1: Create Lecture
  const handleCreateLecture = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      setCreateError(t('lecture.errors.sessionExpired'))
      return
    }

    if (!form.title.trim()) {
      setCreateError(`${t('lecture.form.name')} ${t('common.required')}`)
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const lecture = await lectureService.createLecture(
        {
          title: form.title,
          description: [form.datetime, form.participants, form.memo].filter(Boolean).join(' / '),
        },
        token,
      )
      setLectureId(lecture.id)
      setCurrentStep(2)
      // Update URL
      navigate(`/app/lectures/new?lectureId=${lecture.id}`, { replace: true })
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : t('lecture.errors.createFailed')
      setCreateError(message)
    } finally {
      setIsCreating(false)
    }
  }

  // Step 2: Upload Slide
  const handleUploadSlide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lectureId || !file) {
      setUploadError(t('slides.errors.missingFields'))
      return
    }

    if (!token) {
      setUploadError(t('slides.errors.sessionExpired'))
      return
    }

    const formData = new FormData()
    formData.append('lectureId', String(lectureId))
    formData.append('file', file)

    setIsUploading(true)
    setUploadError(null)
    setUploadStatus(t('slides.uploading'))

    try {
      await slideService.uploadSlideDeck(formData, token)
      setUploadStatus(t('slides.uploadSuccess'))
      setIsProcessing(true)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Note: WebSocket will notify when processing is complete
      // User can now navigate away if needed
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : t('slides.errors.uploadFailed')
      setUploadError(message)
      setUploadStatus(null)
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

  const handlePrevPage = () => {
    setCurrentPageIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleNextPage = () => {
    if (lecture?.slideDeck?.pages) {
      const maxIndex = lecture.slideDeck.pages.length - 1
      setCurrentPageIndex((prev) => Math.min(prev + 1, maxIndex))
    }
  }

  const currentPage = lecture?.slideDeck?.pages?.[currentPageIndex] ?? null
  const currentPageSummary = currentPage?.summary ?? currentPage?.contentSummary ?? null

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('lectureWizard.breadcrumb')}</p>
          <h1>{t('lectureWizard.title')}</h1>
        </div>
      </section>

      <section className="page-content-wrapper">
        <div className="page-content-container lecture-wizard">
          {/* Step Indicator */}
          <div className="wizard-steps" data-step={currentStep}>
        <div className={`step-indicator ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">{t('lectureWizard.steps.create')}</div>
        </div>
        <div className={`step-indicator ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">{t('lectureWizard.steps.upload')}</div>
        </div>
        <div className={`step-indicator ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">{t('lectureWizard.steps.record')}</div>
        </div>
      </div>

      {/* Step 1: Create Lecture */}
      {currentStep === 1 && (
        <div className="wizard-step-content">
          <h2>{t('lectureWizard.step1.title')}</h2>
          <form className="form-grid" onSubmit={handleCreateLecture}>
            <label>
              {t('lecture.form.name')}
              <input
                type="text"
                placeholder={t('lecture.form.placeholders.title')}
                value={form.title}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                  if (createError) setCreateError(null)
                }}
                required
              />
            </label>

            <label>
              {t('lecture.form.datetime')}
              <input
                type="datetime-local"
                value={form.datetime}
                onChange={(event) => setForm((prev) => ({ ...prev, datetime: event.target.value }))}
              />
            </label>

            <label>
              {t('lecture.form.participants')}
              <input
                type="text"
                placeholder={t('lecture.form.placeholders.participants')}
                value={form.participants}
                onChange={(event) => setForm((prev) => ({ ...prev, participants: event.target.value }))}
              />
            </label>

            <label>
              {t('lecture.form.memo')}
              <textarea
                rows={4}
                placeholder={t('lecture.form.placeholders.memo')}
                value={form.memo}
                onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
              />
            </label>

            {createError && (
              <div className="form-error-container">
                <p className="form-error">{createError}</p>
              </div>
            )}

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => navigate('/app/dashboard')}>
                {t('lecture.form.cancel')}
              </button>
              <button className="primary-button" type="submit" disabled={isCreating}>
                {isCreating ? t('lecture.form.submitting') : t('lectureWizard.step1.next')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Upload Slide */}
      {currentStep === 2 && (
        <div className="wizard-step-content">
          <h2>{t('lectureWizard.step2.title')}</h2>
          {uploadStatus && (
            <p className={`upload-status ${isProcessing ? 'processing' : ''}`}>
              {uploadStatus}
              {isProcessing && <span className="processing-spinner">⏳</span>}
            </p>
          )}
          <form className="form-grid" onSubmit={handleUploadSlide}>
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
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null
                  setFile(selectedFile)
                  if (uploadError) setUploadError(null)
                }}
                hidden
              />
              {file && <span className="selected-file-name">{t('slides.selectedFile', { fileName: file.name })}</span>}
            </label>

            {uploadError && (
              <div className="form-error-container">
                <p className="form-error">{uploadError}</p>
              </div>
            )}

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setCurrentStep(1)}>
                {t('lectureWizard.back')}
              </button>
              <button className="secondary-button" type="reset" onClick={() => setFile(null)}>
                {t('slides.reset')}
              </button>
              <button className="primary-button" type="submit" disabled={isUploading || !file}>
                {isUploading ? t('slides.uploading') : t('lectureWizard.step2.upload')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Record Audio */}
      {currentStep === 3 && lecture && (
        <div className="wizard-step-content">
          <h2>{t('lectureWizard.step3.title')}</h2>
          {isLoadingLecture && <p>{t('common.loading')}</p>}
          {lecture.slideDeck && lecture.slideDeck.pages && lecture.slideDeck.pages.length > 0 ? (
            <div className="wizard-record-layout">
              {/* Slide Viewer */}
              <div className="wizard-slide-viewer">
                <div className="slide-viewer-controls">
                  <button
                    type="button"
                    className="nav-button"
                    onClick={handlePrevPage}
                    disabled={currentPageIndex === 0}
                  >
                    {t('lectureDetail.viewer.prev')}
                  </button>
                  <span className="page-indicator">
                    {t('lectureDetail.viewer.pageLabel', {
                      current: currentPageIndex + 1,
                      total: lecture.slideDeck.pages.length,
                    })}
                  </span>
                  <button
                    type="button"
                    className="nav-button"
                    onClick={handleNextPage}
                    disabled={currentPageIndex >= lecture.slideDeck.pages.length - 1}
                  >
                    {t('lectureDetail.viewer.next')}
                  </button>
                </div>
                <div className="slide-canvas-container">
                  <canvas ref={canvasRef} className="slide-canvas" />
                  {isPdfLoading && <div className="loading-overlay">{t('common.loading')}</div>}
                </div>
              </div>

              {/* Transcription Panel */}
              <div className="wizard-transcription-panel">
                <SlideTranscriptionPanel
                  lectureId={lectureId!}
                  slidePageNumber={currentPage?.pageNumber ?? undefined}
                  keywords={currentPage?.keywords ?? []}
                />
              </div>
            </div>
          ) : (
            <p>{t('lectureWizard.step3.noSlides')}</p>
          )}

          {/* Analysis Panel */}
          {currentPage && (
            <div className="wizard-analysis-panel">
              <RecordingAnalysisPanel
                recording={null}
                slideContent={currentPageSummary || ''}
                slideKeywords={currentPage.keywords || []}
                lectureId={lectureId!}
                slidePageNumber={currentPage.pageNumber ?? undefined}
              />
            </div>
          )}

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => setCurrentStep(2)}>
              {t('lectureWizard.back')}
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => navigate(`/app/lectures/${lectureId}`)}
            >
              {t('lectureWizard.step3.finish')}
            </button>
          </div>
        </div>
      )}
        </div>
      </section>
    </>
  )
}

export default LectureWizardPage

