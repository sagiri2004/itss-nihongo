import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../hooks/useAuth'
import { historyService } from '../../services/historyService'
import type { History } from '../../types/history'
import { HistorySearch } from './components/HistorySearch'
import { HistoryFilters } from './components/HistoryFilters'
import { HistoryDayGroup } from './components/HistoryDayGroup'
import '../../styles/history.css'

const HistoryPage = () => {
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const [histories, setHistories] = useState<History[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('ALL')

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

  const actionLabels = useMemo(
    () => ({
      CREATED: t('history.actions.CREATED'),
      UPDATED: t('history.actions.UPDATED'),
      DELETED: t('history.actions.DELETED'),
      SLIDE_UPLOADED: t('history.actions.SLIDE_UPLOADED'),
      SLIDE_PROCESSED: t('history.actions.SLIDE_PROCESSED'),
      RECORDING_STARTED: t('history.actions.RECORDING_STARTED'),
      RECORDING_COMPLETED: t('history.actions.RECORDING_COMPLETED'),
    }),
    [t],
  )

  const getActionIcon = (action: History['action']) => {
    switch (action) {
      case 'CREATED':
        return '✨'
      case 'UPDATED':
        return '📝'
      case 'DELETED':
        return '🗑️'
      case 'SLIDE_UPLOADED':
        return '📤'
      case 'SLIDE_PROCESSED':
        return '⚙️'
      case 'RECORDING_STARTED':
        return '🎙️'
      case 'RECORDING_COMPLETED':
        return '✅'
      default:
        return '📋'
    }
  }

  const getActionColor = (action: History['action']) => {
    switch (action) {
      case 'CREATED':
        return 'var(--color-primary)'
      case 'UPDATED':
        return 'var(--color-info)'
      case 'DELETED':
        return 'var(--color-danger)'
      case 'SLIDE_UPLOADED':
        return 'var(--color-success)'
      case 'SLIDE_PROCESSED':
        return 'var(--color-warning)'
      case 'RECORDING_STARTED':
        return 'var(--color-primary)'
      case 'RECORDING_COMPLETED':
        return 'var(--color-success)'
      default:
        return 'var(--color-text-secondary)'
    }
  }

  // Filter and search histories
  const filteredHistories = useMemo(() => {
    let filtered = histories

    // Filter by action type
    if (selectedFilter !== 'ALL') {
      filtered = filtered.filter((h) => h.action === selectedFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (h) =>
          h.lectureTitle?.toLowerCase().includes(query) ||
          h.description?.toLowerCase().includes(query) ||
          actionLabels[h.action]?.toLowerCase().includes(query) ||
          String(h.lectureId)?.includes(query),
      )
    }

    return filtered
  }, [histories, selectedFilter, searchQuery, actionLabels])

  // Group filtered histories by date
  const groupedHistories = useMemo(() => {
    const groups: Record<string, History[]> = {}
    filteredHistories.forEach((history) => {
      const date = new Date(history.createdAt)
      const dateKey = date.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(history)
    })
    return groups
  }, [filteredHistories])

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedHistories).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
  }, [groupedHistories])

  useEffect(() => {
    if (!token) return

    let active = true
    setIsLoading(true)
    setError(null)

    historyService
      .getHistory(token, 100)
      .then((data) => {
        if (!active) return
        setHistories(data)
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
  }, [token])

  if (isLoading) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{t('history.breadcrumb')}</p>
            <h1>{t('history.title')}</h1>
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
            <p className="topbar__bread">{t('history.breadcrumb')}</p>
            <h1>{t('history.title')}</h1>
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

  const hasNoResults = !isLoading && !error && filteredHistories.length === 0
  const hasNoData = !isLoading && !error && histories.length === 0

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('history.breadcrumb')}</p>
          <h1>{t('history.title')}</h1>
        </div>
      </section>

      <section className="history-wrapper">
        <div className="history-container">
          {/* Search and Filters Section */}
          <div className="history-controls">
            <HistorySearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            <HistoryFilters selectedFilter={selectedFilter} onFilterChange={setSelectedFilter} />
          </div>

          {/* Results Count */}
          {!hasNoData && !hasNoResults && (
            <div className="history-results-count">
              {t('history.resultsCount').replace('{count}', String(filteredHistories.length))}
            </div>
          )}

          {/* Empty States */}
          {hasNoData && (
            <div className="history-empty">
              <div className="empty-icon">📜</div>
              <p>{t('history.empty')}</p>
            </div>
          )}

          {hasNoResults && !hasNoData && (
            <div className="history-empty">
              <div className="empty-icon">🔍</div>
              <p>{t('history.noResults')}</p>
              <button
                className="clear-filters-button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedFilter('ALL')
                }}
              >
                {t('history.clearFilters')}
              </button>
            </div>
          )}

          {/* Timeline */}
          {!hasNoData && !hasNoResults && (
            <div className="history-timeline">
              {sortedDateKeys.map((dateKey) => (
                <HistoryDayGroup
                  key={dateKey}
                  dateKey={dateKey}
                  dayHistories={groupedHistories[dateKey]}
                  actionLabels={actionLabels}
                  getActionIcon={getActionIcon}
                  getActionColor={getActionColor}
                  dateOnlyFormatter={dateOnlyFormatter}
                  timeFormatter={timeFormatter}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default HistoryPage
