import { useLanguage } from '../../../context/LanguageContext'

interface LectureFiltersProps {
  selectedFilter: string
  onFilterChange: (filter: string) => void
}

export const LectureFilters = ({ selectedFilter, onFilterChange }: LectureFiltersProps) => {
  const { t } = useLanguage()

  const filters = [
    { key: 'ALL', label: t('myLectures.filter.all') },
    { key: 'INFO_INPUT', label: t('myLectures.status.INFO_INPUT') },
    { key: 'SLIDE_UPLOAD', label: t('myLectures.status.SLIDE_UPLOAD') },
    { key: 'RECORDING', label: t('myLectures.status.RECORDING') },
    { key: 'COMPLETED', label: t('myLectures.status.COMPLETED') },
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

