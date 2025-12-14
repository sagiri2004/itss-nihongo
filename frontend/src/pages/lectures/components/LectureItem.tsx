import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../../context/LanguageContext'
import type { LectureSummary } from '../../../types/lecture'

interface LectureItemProps {
  lecture: LectureSummary
  statusLabels: Record<string, string>
  dateFormatter: Intl.DateTimeFormat
  timeFormatter: Intl.DateTimeFormat
  onDelete: (lectureId: number) => void
  getStatusIcon: (status: string) => string
  getStatusColor: (status: string) => string
}

export const LectureItem = ({
  lecture,
  statusLabels,
  dateFormatter,
  timeFormatter,
  onDelete,
  getStatusIcon,
  getStatusColor,
}: LectureItemProps) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const lectureDate = new Date(lecture.createdAt)

  const handleView = () => {
    navigate(`/app/lectures/${lecture.id}`)
  }

  const handleDelete = () => {
    if (window.confirm(t('myLectures.confirmDelete'))) {
      onDelete(lecture.id)
    }
  }

  const statusLabel = statusLabels[lecture.status as keyof typeof statusLabels] || lecture.status

  return (
    <div className="history-item">
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
          <span className="history-time">{timeFormatter.format(lectureDate)}</span>
        </div>

        {lecture.description && (
          <p className="history-description">{lecture.description}</p>
        )}

        <div className="history-meta">
          <span className="meta-badge" style={{ backgroundColor: getStatusColor(lecture.status) + '20', borderColor: getStatusColor(lecture.status) }}>
            {statusLabel}
          </span>
          {lecture.slideDeck && (
            <span className="meta-badge">
              {lecture.slideDeck.pageCount} {t('myLectures.slides')}
            </span>
          )}
          <span className="meta-badge">ID: {lecture.id}</span>
        </div>

        <div className="lecture-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleView}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {t('dashboard.actions.viewDetail')}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={handleDelete}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {t('myLectures.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

