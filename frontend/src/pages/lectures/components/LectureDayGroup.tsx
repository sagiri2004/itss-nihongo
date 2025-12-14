import type { LectureSummary } from '../../../types/lecture'
import { LectureItem } from './LectureItem'

interface LectureDayGroupProps {
  dateKey: string
  dayLectures: LectureSummary[]
  statusLabels: Record<string, string>
  dateOnlyFormatter: Intl.DateTimeFormat
  timeFormatter: Intl.DateTimeFormat
  dateFormatter: Intl.DateTimeFormat
  onDelete: (lectureId: number) => void
  getStatusIcon: (status: string) => string
  getStatusColor: (status: string) => string
}

export const LectureDayGroup = ({
  dateKey,
  dayLectures,
  statusLabels,
  dateOnlyFormatter,
  timeFormatter,
  dateFormatter,
  onDelete,
  getStatusIcon,
  getStatusColor,
}: LectureDayGroupProps) => {
  const date = new Date(dateKey)

  return (
    <div className="history-day-group">
      <div className="history-day-header">
        <div className="day-line"></div>
        <h2 className="day-title">{dateOnlyFormatter.format(date)}</h2>
        <div className="day-line"></div>
      </div>

      <div className="history-items">
        {dayLectures.map((lecture) => (
          <LectureItem
            key={lecture.id}
            lecture={lecture}
            statusLabels={statusLabels}
            dateFormatter={dateFormatter}
            timeFormatter={timeFormatter}
            onDelete={onDelete}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
          />
        ))}
      </div>
    </div>
  )
}

