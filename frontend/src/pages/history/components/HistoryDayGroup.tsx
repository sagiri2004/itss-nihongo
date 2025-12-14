import { useLanguage } from '../../../context/LanguageContext'
import type { History } from '../../../types/history'
import { HistoryItem } from './HistoryItem'

interface HistoryDayGroupProps {
  dateKey: string
  dayHistories: History[]
  actionLabels: Record<string, string>
  getActionIcon: (action: History['action']) => string
  getActionColor: (action: History['action']) => string
  dateOnlyFormatter: Intl.DateTimeFormat
  timeFormatter: Intl.DateTimeFormat
}

export const HistoryDayGroup = ({
  dateKey,
  dayHistories,
  actionLabels,
  getActionIcon,
  getActionColor,
  dateOnlyFormatter,
  timeFormatter,
}: HistoryDayGroupProps) => {
  const date = new Date(dateKey)

  return (
    <div className="history-day-group">
      <div className="history-day-header">
        <div className="day-line"></div>
        <h2 className="day-title">{dateOnlyFormatter.format(date)}</h2>
        <div className="day-line"></div>
      </div>

      <div className="history-items">
        {dayHistories.map((history) => (
          <HistoryItem
            key={history.id}
            history={history}
            actionLabels={actionLabels}
            getActionIcon={getActionIcon}
            getActionColor={getActionColor}
            timeFormatter={timeFormatter}
          />
        ))}
      </div>
    </div>
  )
}

