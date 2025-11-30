import { useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import { classNames } from '../utils/classNames'

const MainLayout = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { t } = useLanguage()

  const navItems = useMemo(
    () => [
      { label: t('nav.home'), to: '/app/dashboard' },
      { label: t('nav.createSession'), to: '/app/lectures/new' },
      { label: t('nav.manageSlides'), to: '/app/slides/upload' },
      { label: t('nav.transcription'), to: '/app/transcription' },
    ],
    [t],
  )

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell-modern">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="icon-button" aria-hidden="true">
            ロゴ
          </span>
          <span>{t('common.brand')}</span>
        </div>
        <nav className="topbar__nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => classNames(isActive && 'active')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar__actions">
          <LanguageSwitcher />
          <span className="icon-button" aria-hidden="true">
            🔔
          </span>
          <span className="icon-button" aria-hidden="true">
            📩
          </span>
          {user && <div className="user-pill">{user.username}</div>}
          <button type="button" className="secondary-button" onClick={handleLogout}>
            {t('common.logout')}
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="page-container">
          <Outlet />
          <div className="page-footer-links">
            <a href="#faq">{t('common.faq')}</a>
            <a href="#privacy">{t('common.privacy')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainLayout

