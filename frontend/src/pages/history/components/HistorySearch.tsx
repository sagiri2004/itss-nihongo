import { useLanguage } from '../../../context/LanguageContext'

interface HistorySearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const HistorySearch = ({ searchQuery, onSearchChange }: HistorySearchProps) => {
  const { t } = useLanguage()

  return (
    <div className="history-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={t('history.search.placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => onSearchChange('')}
            aria-label={t('history.search.clear')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

