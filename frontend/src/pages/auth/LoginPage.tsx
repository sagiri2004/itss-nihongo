import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app/dashboard'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ username: form.username, password: form.password })
      navigate(redirectTo, { replace: true })
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : t('auth.login.error')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-card">
      <header>
        <h1>{t('auth.login.title')}</h1>
        <p>{t('auth.login.subtitle')}</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span>{t('auth.login.usernameLabel')}</span>
          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8 5-8-5m16 10H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v8a2 2 0 01-2 2z"
              />
            </svg>
            <input
              type="text"
              autoComplete="username"
              placeholder={t('auth.login.usernamePlaceholder')}
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <span>{t('auth.login.passwordLabel')}</span>
          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a2 2 0 100-4 2 2 0 000 4z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 8V7a6 6 0 1112 0v1m-1 0H7a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2z"
              />
            </svg>
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t('auth.login.passwordPlaceholder')}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>
        </div>

        <div className="form-inline">
          <label>
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm((prev) => ({ ...prev, remember: event.target.checked }))}
            />
            {t('auth.login.remember')}
          </label>
          <Link to="/forgot-password" className="link-button">
            {t('auth.login.forgot')}
          </Link>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('auth.login.signingIn') : t('auth.login.signIn')}
        </button>
      </form>

      <div className="divider">{t('auth.login.divider')}</div>

      <div className="oauth-grid">
        <button type="button" className="oauth-button">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.675 0h-21.35C.6 0 0 .6 0 1.325v21.351C0 23.4.6 24 1.325 24h11.495v-9.294H9.691v-3.622h3.129V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24h-1.918c-1.504 0-1.796.715-1.796 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.676V1.325C24 .6 23.4 0 22.675 0z" />
          </svg>
          {t('auth.login.facebook')}
        </button>
        <button type="button" className="oauth-button">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M21.8 10.23h-9.62v3.55h5.53c-.24 1.38-1.42 4.05-5.53 4.05-3.33 0-6.05-2.75-6.05-6.14 0-3.38 2.72-6.14 6.05-6.14 1.9 0 3.18.82 3.9 1.52l2.66-2.58C17.26 2.95 15.1 1.9 12.18 1.9 6.84 1.9 2.5 6.28 2.5 11.69c0 5.41 4.34 9.79 9.68 9.79 5.59 0 9.29-3.93 9.29-9.46 0-.72-.08-1.27-.17-1.79z"
              fill="currentColor"
            />
          </svg>
          {t('auth.login.google')}
        </button>
      </div>

      <div className="login-footer">
        <span>{t('auth.login.registerPrompt')}</span>
        <Link to="/register">{t('auth.login.registerLink')}</Link>
      </div>
    </div>
  )
}

export default LoginPage
