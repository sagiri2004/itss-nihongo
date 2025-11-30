import { Outlet } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const AuthLayout = () => {
  const { t } = useLanguage()

  return (
    <div className="auth-shell">
      <div className="auth-illustration">
        <span>{t('common.brand')}</span>
      </div>
      <div className="auth-panel">
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout


