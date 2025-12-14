import { useLanguage } from '../../../context/LanguageContext'
import type { History } from '../../../types/history'

interface HistoryItemProps {
  history: History
  actionLabels: Record<string, string>
  getActionIcon: (action: History['action']) => string
  getActionColor: (action: History['action']) => string
  timeFormatter: Intl.DateTimeFormat
}

export const HistoryItem = ({
  history,
  actionLabels,
  getActionIcon,
  getActionColor,
  timeFormatter,
}: HistoryItemProps) => {
  const { t } = useLanguage()
  const historyDate = new Date(history.createdAt)

  return (
    <div className="history-item">
      <div className="history-timeline-line">
        <div
          className="history-icon"
          style={{ backgroundColor: getActionColor(history.action) }}
        >
          {getActionIcon(history.action)}
        </div>
      </div>

      <div className="history-content">
        <div className="history-header">
          <h3 className="history-action">
            {actionLabels[history.action] || history.action}
          </h3>
          <span className="history-time">
            {timeFormatter.format(historyDate)}
          </span>
        </div>

        {history.lectureTitle && (
          <div className="history-lecture">
            <span className="lecture-label">{t('history.lecture')}:</span>
            <span className="lecture-title">{history.lectureTitle}</span>
          </div>
        )}

        {history.description && (
          <p className="history-description">{history.description}</p>
        )}

        {history.lectureId && (
          <div className="history-meta">
            <span className="meta-badge">ID: {history.lectureId}</span>
          </div>
        )}
      </div>
    </div>
  )
}

