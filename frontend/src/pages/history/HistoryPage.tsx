import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../hooks/useAuth'
import { historyService } from '../../services/historyService'
import type { History } from '../../types/history'

const HistoryPage = () => {
  const { token } = useAuth()
  const { t, language } = useLanguage()
  const [histories, setHistories] = useState<History[]>([])
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

  useEffect(() => {
    if (!token) return

    let active = true
    setIsLoading(true)
    setError(null)

    historyService
      .getHistory(token, 50)
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

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('history.breadcrumb')}</p>
          <h1>{t('history.title')}</h1>
        </div>
      </section>

      <section className="history-list">
        {isLoading && <p>{t('common.loading')}</p>}
        {error && !isLoading && <p className="form-error">{error}</p>}
        {!isLoading && !error && histories.length === 0 && (
          <p className="empty-state">{t('history.empty')}</p>
        )}
        {!isLoading &&
          !error &&
          histories.map((history) => (
            <article key={history.id} className="history-card">
              <div className="history-meta">
                <h3>
                  {actionLabels[history.action] || history.action}
                  {history.lectureTitle && `: ${history.lectureTitle}`}
                </h3>
                {history.description && <p>{history.description}</p>}
                <small>{dateFormatter.format(new Date(history.createdAt))}</small>
              </div>
            </article>
          ))}
      </section>
    </>
  )
}

export default HistoryPage

