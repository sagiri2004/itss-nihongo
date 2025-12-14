import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import { lectureService } from '../../services/lectureService'
import type { LectureSummary } from '../../types/lecture'
import '../../styles/history.css'

const DashboardPage = () => {
  const { data, refresh } = useDashboardData()
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [language],
  )

  const dateOnlyFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        dateStyle: 'long',
      }),
    [language],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language],
  )

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

  const lectureStatusLabels = useMemo(
    () => ({
      INFO_INPUT: t('myLectures.status.INFO_INPUT'),
      SLIDE_UPLOAD: t('myLectures.status.SLIDE_UPLOAD'),
      RECORDING: t('myLectures.status.RECORDING'),
      COMPLETED: t('myLectures.status.COMPLETED'),
    }),
    [t],
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'INFO_INPUT':
        return '📝'
      case 'SLIDE_UPLOAD':
        return '📤'
      case 'RECORDING':
        return '🎙️'
      case 'COMPLETED':
        return '✅'
      default:
        return '📋'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INFO_INPUT':
        return 'var(--color-info)'
      case 'SLIDE_UPLOAD':
        return 'var(--color-warning)'
      case 'RECORDING':
        return 'var(--color-primary)'
      case 'COMPLETED':
        return 'var(--color-success)'
      default:
        return 'var(--color-text-secondary)'
    }
  }

  // Calculate status breakdown
  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      INFO_INPUT: 0,
      SLIDE_UPLOAD: 0,
      RECORDING: 0,
      COMPLETED: 0,
    }

    data.recentLectures.forEach((lecture) => {
      const status = lecture.status as keyof typeof breakdown
      if (status && breakdown[status] !== undefined) {
        breakdown[status]++
      }
    })

    return breakdown
  }, [data.recentLectures])

  // Group recent lectures by date
  const groupedLectures = useMemo(() => {
    const groups: Record<string, LectureSummary[]> = {}
    data.recentLectures.forEach((lecture) => {
      const date = new Date(lecture.createdAt)
      const dateKey = date.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(lecture)
    })
    return groups
  }, [data.recentLectures])

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedLectures).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
  }, [groupedLectures])

  const handleCreateSession = () => {
    navigate('/app/lectures/new')
  }

  const handleViewLecture = (lectureId: number) => {
    navigate(`/app/lectures/${lectureId}`)
  }

  const handleDeleteLecture = async (lectureId: number) => {
    if (!token) return
    if (!window.confirm(t('myLectures.confirmDelete'))) return

    try {
      await lectureService.deleteLecture(lectureId, token)
      refresh(token)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    }
  }

  if (isLoading && data.recentLectures.length === 0) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{t('dashboard.breadcrumb')}</p>
            <h1>{t('dashboard.title')}</h1>
          </div>
        </section>
        <section className="history-wrapper">
          <div className="history-container">
            <div className="history-loading">
              <div className="spinner"></div>
              <p>{t('common.loading')}</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('dashboard.breadcrumb')}</p>
          <h1>{t('dashboard.title')}</h1>
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

      <section className="history-wrapper">
        <div className="history-container">
          {/* Main Metrics */}
          <div className="metrics-row" style={{ marginBottom: '2rem' }}>
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📚</span>
                <span style={{ color: '#fff' }}>{t('dashboard.counts.lectures')}</span>
              </div>
              <strong style={{ color: '#fff', fontSize: '2rem' }}>{data.totalLectures}</strong>
            </div>
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <span style={{ color: '#fff' }}>{t('dashboard.counts.slides')}</span>
              </div>
              <strong style={{ color: '#fff', fontSize: '2rem' }}>{data.totalSlideDecks}</strong>
            </div>
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎙️</span>
                <span style={{ color: '#fff' }}>{t('dashboard.counts.transcripts')}</span>
              </div>
              <strong style={{ color: '#fff', fontSize: '2rem' }}>{data.totalTranscriptionRecords}</strong>
            </div>
          </div>

          {/* Status Breakdown */}
          {data.recentLectures.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {t('dashboard.statusBreakdown')}
              </h2>
              <div className="metrics-row">
                {Object.entries(statusBreakdown).map(([status, count]) => {
                  if (count === 0) return null
                  return (
                    <div
                      key={status}
                      className="metric-card"
                      style={{
                        background: '#fff',
                        border: `2px solid ${getStatusColor(status)}`,
                        borderLeft: `4px solid ${getStatusColor(status)}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{getStatusIcon(status)}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                          {lectureStatusLabels[status as keyof typeof lectureStatusLabels]}
                        </span>
                      </div>
                      <strong style={{ color: getStatusColor(status), fontSize: '1.75rem' }}>{count}</strong>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !isLoading && (
            <div className="history-error" style={{ marginBottom: '2rem' }}>
              <p className="error-message">{error}</p>
            </div>
          )}

          {/* Recent Lectures */}
          <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              {t('dashboard.recentTitle')}
            </h2>

            {!isLoading && !error && data.recentLectures.length === 0 && (
              <div className="history-empty">
                <div className="empty-icon">📚</div>
                <p>{t('dashboard.empty')}</p>
                <button
                  className="clear-filters-button"
                  onClick={handleCreateSession}
                  style={{ marginTop: '1rem' }}
                >
                  {t('dashboard.actions.primary')}
                </button>
              </div>
            )}

            {!isLoading && !error && data.recentLectures.length > 0 && (
              <div className="history-timeline">
                {sortedDateKeys.map((dateKey) => (
                  <div key={dateKey} className="history-day-group">
                    <div className="history-day-header">
                      <div className="day-line"></div>
                      <h2 className="day-title">{dateOnlyFormatter.format(new Date(dateKey))}</h2>
                      <div className="day-line"></div>
                    </div>

                    <div className="history-items">
                      {groupedLectures[dateKey].map((lecture) => (
                        <div key={lecture.id} className="history-item">
                          <div className="history-timeline-line">
                            <div
                              className="history-icon"
                              style={{ backgroundColor: getStatusColor(lecture.status) }}
                            >
                              {getStatusIcon(lecture.status)}
                            </div>
                          </div>

                          <div className="history-content">
                            <div className="history-header">
                              <h3 className="history-action">{lecture.title}</h3>
                              <span className="history-time">{timeFormatter.format(new Date(lecture.createdAt))}</span>
                            </div>

                            {lecture.description && (
                              <p className="history-description">{lecture.description}</p>
                            )}

                            <div className="history-meta">
                              <span
                                className="meta-badge"
                                style={{
                                  backgroundColor: getStatusColor(lecture.status) + '20',
                                  borderColor: getStatusColor(lecture.status),
                                }}
                              >
                                {lectureStatusLabels[lecture.status as keyof typeof lectureStatusLabels] ||
                                  lecture.status}
                              </span>
                              {lecture.slideDeck && (
                                <span className="meta-badge">
                                  {lecture.slideDeck.pageCount} {t('myLectures.slides')}
                                </span>
                              )}
                              <span className="meta-badge">ID: {lecture.id}</span>
                            </div>

                            <div
                              className="lecture-actions"
                              style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                            >
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleViewLecture(lecture.id)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                              >
                                {t('dashboard.actions.viewDetail')}
                              </button>
                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => handleDeleteLecture(lecture.id)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                              >
                                {t('dashboard.actions.delete')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default DashboardPage
