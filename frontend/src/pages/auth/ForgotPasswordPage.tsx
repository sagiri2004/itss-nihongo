import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/authService'
import { useLanguage } from '../../context/LanguageContext'

const ForgotPasswordPage = () => {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.forgotPassword({ email })
      setSuccess(true)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : t('auth.forgotPassword.error')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="login-card">
        <header>
          <h1>{t('auth.forgotPassword.title')}</h1>
          <p>{t('auth.forgotPassword.successMessage')}</p>
        </header>
        <div className="login-footer">
          <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-card">
      <header>
        <h1>{t('auth.forgotPassword.title')}</h1>
        <p>{t('auth.forgotPassword.subtitle')}</p>
      </header>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span>{t('auth.forgotPassword.emailLabel')}</span>
          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8 5-8-5m16 10H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v8a2 2 0 01-2 2z"
              />
            </svg>
            <input
              type="email"
              autoComplete="email"
              placeholder={t('auth.forgotPassword.emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
        </button>
      </form>

      <div className="login-footer">
        <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage

