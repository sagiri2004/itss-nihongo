import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'

const DashboardPage = () => {
  const { data, refresh } = useDashboardData()
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    let active = true
    setIsLoading(true)
    setError(null)

    refresh(token)
      .catch((err) => {
        if (!active) return
        const message = err instanceof Error ? err.message : String(err)
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
  }, [refresh, token])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [language],
  )

  const handleCreateSession = () => {
    navigate('/app/lectures/new')
  }

  const handleViewLecture = (lectureId: number) => {
    navigate(`/app/lectures/${lectureId}`)
  }

  const handleUploadSlides = (lectureId: number) => {
    navigate(`/app/slides/upload?lectureId=${lectureId}`)
  }

  const statusLabels = useMemo(
    () => ({
      UPLOADED: t('slides.statusLabels.UPLOADED'),
      PROCESSING: t('slides.statusLabels.PROCESSING'),
      READY: t('slides.statusLabels.READY'),
      FAILED: t('slides.statusLabels.FAILED'),
    }),
    [t],
  )

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('dashboard.breadcrumb')}</p>
          <h1>{t('dashboard.title')}</h1>
          <div className="session-highlight">
            <span>{t('dashboard.actions.create')}</span>
            <span>{t('dashboard.actions.delete')}</span>
          </div>
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={handleCreateSession}>
            {t('dashboard.actions.primary')}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              if (!token) return
              setIsLoading(true)
              refresh(token)
                .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                .finally(() => setIsLoading(false))
            }}
          >
            {t('dashboard.actions.refresh')}
          </button>
        </div>
      </section>

      <section className="metrics-row">
        <div className="metric-card">
          <span>{t('dashboard.counts.lectures')}</span>
          <strong>{data.totalLectures}</strong>
        </div>
        <div className="metric-card">
          <span>{t('dashboard.counts.slides')}</span>
          <strong>{data.totalSlideDecks}</strong>
        </div>
        <div className="metric-card">
          <span>{t('dashboard.counts.transcripts')}</span>
          <strong>{data.totalTranscriptionRecords}</strong>
        </div>
      </section>

      <section className="session-list">
        <h2>{t('dashboard.recentTitle')}</h2>
        {isLoading && <p>{t('common.loading')}</p>}
        {error && !isLoading && <p className="form-error">{error}</p>}
        {!isLoading && !error && data.recentLectures.length === 0 && (
          <p className="empty-state">{t('dashboard.empty')}</p>
        )}
        {!isLoading &&
          !error &&
          data.recentLectures.map((lecture) => (
            <article key={lecture.id} className="session-card">
              <div className="session-meta">
                <h3>{lecture.title}</h3>
                {lecture.description && <p>{lecture.description}</p>}
                <small>{dateFormatter.format(new Date(lecture.createdAt))}</small>
              </div>
              <div className="session-actions">
                {lecture.slideDeck && (
                  <span className="session-tag">
                    {statusLabels[lecture.slideDeck.uploadStatus as keyof typeof statusLabels] ??
                      lecture.slideDeck.uploadStatus}{' '}
                    · {lecture.slideDeck.pageCount}
                  </span>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleViewLecture(lecture.id)}
                >
                  {t('dashboard.actions.viewDetail')}
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => handleUploadSlides(lecture.id)}
                >
                  {t('dashboard.actions.uploadSlides')}
                </button>
              </div>
            </article>
          ))}
      </section>
    </>
  )
}

export default DashboardPage

