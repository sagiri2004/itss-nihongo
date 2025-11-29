import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app/dashboard'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(form)
      navigate(redirectTo, { replace: true })
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Đăng nhập thất bại, thử lại sau.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-content">
      <h2>Đăng nhập</h2>
      <p>Tiếp tục quản trị khoá học chỉ với vài giây.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Tên đăng nhập
          <input
            type="text"
            name="username"
            placeholder="vd: admin"
            required
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            required
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
      </form>
      <p className="auth-switch">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </section>
  )
}

export default LoginPage
