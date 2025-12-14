import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lectureService } from '../../services/lectureService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import type { LectureSummary } from '../../types/lecture'

const MyLecturesPage = () => {
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [lectures, setLectures] = useState<LectureSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [language],
  )

  useEffect(() => {
    if (!token) return

    let active = true
    setIsLoading(true)
    setError(null)

    const status = statusFilter === 'ALL' ? undefined : statusFilter
    lectureService
      .listLectures(token, undefined, status)
      .then((data) => {
        if (!active) return
        setLectures(data)
      })
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
  }, [token, statusFilter])

  const handleViewLecture = (lectureId: number) => {
    navigate(`/app/lectures/${lectureId}`)
  }

  const handleDeleteLecture = async (lectureId: number) => {
    if (!token) return
    if (!window.confirm(t('myLectures.confirmDelete'))) return

    try {
      await lectureService.deleteLecture(lectureId, token)
      setLectures((prev) => prev.filter((l) => l.id !== lectureId))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('myLectures.deleteError')
      alert(message)
    }
  }

  const statusLabels = useMemo(
    () => ({
      INFO_INPUT: t('myLectures.status.INFO_INPUT'),
      SLIDE_UPLOAD: t('myLectures.status.SLIDE_UPLOAD'),
      RECORDING: t('myLectures.status.RECORDING'),
      COMPLETED: t('myLectures.status.COMPLETED'),
      // Legacy statuses for backward compatibility
      DRAFT: t('myLectures.status.DRAFT'),
      PROCESSING: t('myLectures.status.PROCESSING'),
      PUBLISHED: t('myLectures.status.PUBLISHED'),
    }),
    [t],
  )

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('myLectures.breadcrumb')}</p>
          <h1>{t('myLectures.title')}</h1>
        </div>
        <div className="hero-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">{t('myLectures.filter.all')}</option>
            <option value="INFO_INPUT">{t('myLectures.status.INFO_INPUT')}</option>
            <option value="SLIDE_UPLOAD">{t('myLectures.status.SLIDE_UPLOAD')}</option>
            <option value="RECORDING">{t('myLectures.status.RECORDING')}</option>
            <option value="COMPLETED">{t('myLectures.status.COMPLETED')}</option>
          </select>
        </div>
      </section>

      <section className="session-list">
        {isLoading && <p>{t('common.loading')}</p>}
        {error && !isLoading && <p className="form-error">{error}</p>}
        {!isLoading && !error && lectures.length === 0 && (
          <p className="empty-state">{t('myLectures.empty')}</p>
        )}
        {!isLoading &&
          !error &&
          lectures.map((lecture) => (
            <article key={lecture.id} className="session-card">
              <div className="session-meta">
                <h3>{lecture.title}</h3>
                {lecture.description && <p>{lecture.description}</p>}
                <small>
                  {statusLabels[lecture.status as keyof typeof statusLabels] || lecture.status} ·{' '}
                  {dateFormatter.format(new Date(lecture.createdAt))}
                </small>
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
                  className="danger-button"
                  onClick={() => handleDeleteLecture(lecture.id)}
                >
                  {t('myLectures.delete')}
                </button>
              </div>
            </article>
          ))}
      </section>
    </>
  )
}

export default MyLecturesPage

