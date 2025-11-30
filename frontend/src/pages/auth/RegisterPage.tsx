import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState({ username: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register(form)
      navigate('/app/dashboard', { replace: true })
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : t('auth.register.error')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-card">
      <header>
        <h1>{t('auth.register.title')}</h1>
        <p>{t('auth.register.subtitle')}</p>
      </header>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span>{t('auth.register.usernameLabel')}</span>
          <div className="input-wrapper">
            <input
              type="text"
              name="username"
              placeholder={t('auth.register.usernamePlaceholder')}
              minLength={3}
              required
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            />
          </div>
        </div>
        <div className="input-group">
          <span>{t('auth.register.passwordLabel')}</span>
          <div className="input-wrapper">
            <input
              type="password"
              name="password"
              placeholder={t('auth.register.passwordPlaceholder')}
              minLength={6}
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>
      <div className="login-footer">
        <span>{t('auth.register.loginPrompt')}</span>
        <Link to="/login">{t('auth.register.loginLink')}</Link>
      </div>
    </div>
  )
}

export default RegisterPage
