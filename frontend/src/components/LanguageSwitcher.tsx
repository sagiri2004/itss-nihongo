import { useLanguage } from '../context/LanguageContext'

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="language-switcher" aria-label={t('common.language.switchLabel')}>
      <button
        type="button"
        className={`language-switcher__option ${language === 'ja' ? 'active' : ''}`}
        onClick={() => setLanguage('ja')}
      >
        {t('common.language.japanese')}
      </button>
      <button
        type="button"
        className={`language-switcher__option ${language === 'vi' ? 'active' : ''}`}
        onClick={() => setLanguage('vi')}
      >
        {t('common.language.vietnamese')}
      </button>
    </div>
  )
}

export default LanguageSwitcher


