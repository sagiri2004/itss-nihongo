import { useLanguage } from '../../../context/LanguageContext'

interface LectureSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const LectureSearch = ({ searchQuery, onSearchChange }: LectureSearchProps) => {
  const { t } = useLanguage()

  return (
    <div className="history-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={t('myLectures.search.placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => onSearchChange('')}
            aria-label={t('myLectures.search.clear')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

