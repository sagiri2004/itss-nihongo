import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'

const IntroPage = () => {
  const { t } = useLanguage()

  return (
    <section className="marketing-hero">
      <div>
        <p className="eyebrow">{t('intro.eyebrow')}</p>
        <h1>{t('intro.title')}</h1>
        <p>{t('intro.description')}</p>
        <div className="hero-actions">
          <Link className="primary-btn" to="/login">
            {t('intro.accessNow')}
          </Link>
          <Link className="text-btn" to="/register">
            {t('intro.createAccount')}
          </Link>
        </div>
      </div>
      <div className="highlight-panel">
        <ul>
          <li>
            <strong>{t('intro.features.sync.title')}</strong>
            <span>{t('intro.features.sync.description')}</span>
          </li>
          <li>
            <strong>{t('intro.features.monitoring.title')}</strong>
            <span>{t('intro.features.monitoring.description')}</span>
          </li>
          <li>
            <strong>{t('intro.features.security.title')}</strong>
            <span>{t('intro.features.security.description')}</span>
          </li>
        </ul>
      </div>
    </section>
  )
}

export default IntroPage


