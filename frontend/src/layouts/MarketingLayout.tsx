import { Link, Outlet } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

const MarketingLayout = () => {
  const { t } = useLanguage()

  return (
    <div className="marketing-layout">
      <header className="marketing-header">
        <span className="brand">ITSS Nihongo</span>
        <nav className="marketing-nav">
          <LanguageSwitcher />
          <Link to="/login">{t('intro.nav.login')}</Link>
          <Link className="primary-btn" to="/register">
            {t('intro.nav.register')}
          </Link>
        </nav>
      </header>
      <main className="marketing-main">
        <Outlet />
      </main>
    </div>
  )
}

export default MarketingLayout


