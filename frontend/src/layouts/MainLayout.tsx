import { useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import NotificationBell from '../components/notifications/NotificationBell'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import { classNames } from '../utils/classNames'

const MainLayout = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { t } = useLanguage()

  const isAdmin = useMemo(() => {
    return user?.roles?.includes('ROLE_ADMIN') ?? false
  }, [user])

  const navItems = useMemo(
    () => {
      const items = [
        { label: t('nav.home'), to: '/app/dashboard' },
        { label: t('nav.createSession'), to: '/app/lectures/new' },
        { label: t('nav.myLectures'), to: '/app/lectures/my' },
        { label: t('nav.transcription'), to: '/app/transcription' },
        { label: t('nav.history'), to: '/app/history' },
      ]
      if (isAdmin) {
        items.push({ label: t('nav.admin'), to: '/app/admin' })
      }
      return items
    },
    [t, isAdmin],
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
          <NotificationBell />
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

