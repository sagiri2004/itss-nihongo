import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useLanguage } from '../../context/LanguageContext'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPassword.invalidToken'))
    }
  }, [token, t])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError(t('auth.resetPassword.passwordMismatch'))
      return
    }

    if (form.password.length < 6) {
      setError(t('auth.resetPassword.passwordTooShort'))
      return
    }

    if (!token) {
      setError(t('auth.resetPassword.invalidToken'))
      return
    }

    setIsSubmitting(true)
    try {
      await authService.resetPassword({ token, newPassword: form.password })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : t('auth.resetPassword.error')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="login-card">
        <header>
          <h1>{t('auth.resetPassword.title')}</h1>
          <p>{t('auth.resetPassword.successMessage')}</p>
        </header>
        <div className="login-footer">
          <Link to="/login">{t('auth.resetPassword.backToLogin')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-card">
      <header>
        <h1>{t('auth.resetPassword.title')}</h1>
        <p>{t('auth.resetPassword.subtitle')}</p>
      </header>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span>{t('auth.resetPassword.newPasswordLabel')}</span>
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
              autoComplete="new-password"
              placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
              minLength={6}
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>
        </div>

        <div className="input-group">
          <span>{t('auth.resetPassword.confirmPasswordLabel')}</span>
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
              autoComplete="new-password"
              placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
              minLength={6}
              required
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button" type="submit" disabled={isSubmitting || !token}>
          {isSubmitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
        </button>
      </form>

      <div className="login-footer">
        <Link to="/login">{t('auth.resetPassword.backToLogin')}</Link>
      </div>
    </div>
  )
}

export default ResetPasswordPage

