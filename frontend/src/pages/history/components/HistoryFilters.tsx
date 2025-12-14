import { useLanguage } from '../../../context/LanguageContext'
import type { History } from '../../../types/history'

interface HistoryFiltersProps {
  selectedFilter: string
  onFilterChange: (filter: string) => void
}

export const HistoryFilters = ({ selectedFilter, onFilterChange }: HistoryFiltersProps) => {
  const { t } = useLanguage()

  const filters = [
    { key: 'ALL', label: t('history.filters.all') },
    { key: 'CREATED', label: t('history.filters.created') },
    { key: 'UPDATED', label: t('history.filters.updated') },
    { key: 'SLIDE_UPLOADED', label: t('history.filters.slideUploaded') },
    { key: 'SLIDE_PROCESSED', label: t('history.filters.slideProcessed') },
    { key: 'RECORDING_STARTED', label: t('history.filters.recordingStarted') },
    { key: 'RECORDING_COMPLETED', label: t('history.filters.recordingCompleted') },
    { key: 'DELETED', label: t('history.filters.deleted') },
  ]

  return (
    <div className="history-filters">
      <div className="filters-scroll">
        {filters.map((filter) => (
          <button
            key={filter.key}
            className={`filter-button ${selectedFilter === filter.key ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}

