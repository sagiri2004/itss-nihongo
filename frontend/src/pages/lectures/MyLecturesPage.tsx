import { useEffect, useMemo, useState } from 'react'
import { lectureService } from '../../services/lectureService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import type { LectureSummary } from '../../types/lecture'
import { LectureSearch } from './components/LectureSearch'
import { LectureFilters } from './components/LectureFilters'
import { LectureDayGroup } from './components/LectureDayGroup'
import '../../styles/history.css'

const MyLecturesPage = () => {
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const [lectures, setLectures] = useState<LectureSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

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
      case 'DRAFT':
        return '📄'
      case 'PROCESSING':
        return '⚙️'
      case 'PUBLISHED':
        return '📢'
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
      case 'DRAFT':
        return 'var(--color-text-secondary)'
      case 'PROCESSING':
        return 'var(--color-warning)'
      case 'PUBLISHED':
        return 'var(--color-success)'
      default:
        return 'var(--color-text-secondary)'
    }
  }

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

  // Filter and search lectures
  const filteredLectures = useMemo(() => {
    let filtered = lectures

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.title?.toLowerCase().includes(query) ||
          l.description?.toLowerCase().includes(query) ||
          statusLabels[l.status as keyof typeof statusLabels]?.toLowerCase().includes(query) ||
          String(l.id)?.includes(query),
      )
    }

    return filtered
  }, [lectures, searchQuery, statusLabels])

  // Group filtered lectures by date
  const groupedLectures = useMemo(() => {
    const groups: Record<string, LectureSummary[]> = {}
    filteredLectures.forEach((lecture) => {
      const date = new Date(lecture.createdAt)
      const dateKey = date.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(lecture)
    })
    return groups
  }, [filteredLectures])

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedLectures).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
  }, [groupedLectures])

  const handleDeleteLecture = async (lectureId: number) => {
    if (!token) return

    try {
      await lectureService.deleteLecture(lectureId, token)
      setLectures((prev) => prev.filter((l) => l.id !== lectureId))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('myLectures.deleteError')
      alert(message)
    }
  }

  if (isLoading) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{t('myLectures.breadcrumb')}</p>
            <h1>{t('myLectures.title')}</h1>
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

  if (error && !isLoading) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{t('myLectures.breadcrumb')}</p>
            <h1>{t('myLectures.title')}</h1>
          </div>
        </section>
        <section className="history-wrapper">
          <div className="history-container">
            <div className="history-error">
              <p className="error-message">{error}</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  const hasNoResults = !isLoading && !error && filteredLectures.length === 0
  const hasNoData = !isLoading && !error && lectures.length === 0

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('myLectures.breadcrumb')}</p>
          <h1>{t('myLectures.title')}</h1>
        </div>
      </section>

      <section className="history-wrapper">
        <div className="history-container">
          {/* Search and Filters Section */}
          <div className="history-controls">
            <LectureSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            <LectureFilters selectedFilter={statusFilter} onFilterChange={setStatusFilter} />
          </div>

          {/* Results Count */}
          {!hasNoData && !hasNoResults && (
            <div className="history-results-count">
              {t('myLectures.resultsCount').replace('{count}', String(filteredLectures.length))}
            </div>
          )}

          {/* Empty States */}
          {hasNoData && (
            <div className="history-empty">
              <div className="empty-icon">📚</div>
              <p>{t('myLectures.empty')}</p>
            </div>
          )}

          {hasNoResults && !hasNoData && (
            <div className="history-empty">
              <div className="empty-icon">🔍</div>
              <p>{t('myLectures.noResults')}</p>
              <button
                className="clear-filters-button"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                }}
              >
                {t('myLectures.clearFilters')}
              </button>
            </div>
          )}

          {/* Timeline */}
          {!hasNoData && !hasNoResults && (
            <div className="history-timeline">
              {sortedDateKeys.map((dateKey) => (
                <LectureDayGroup
                  key={dateKey}
                  dateKey={dateKey}
                  dayLectures={groupedLectures[dateKey]}
                  statusLabels={statusLabels}
                  dateOnlyFormatter={dateOnlyFormatter}
                  timeFormatter={timeFormatter}
                  dateFormatter={dateFormatter}
                  onDelete={handleDeleteLecture}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default MyLecturesPage
