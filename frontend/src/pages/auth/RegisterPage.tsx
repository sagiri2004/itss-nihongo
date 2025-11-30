import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
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
      const message = submissionError instanceof Error ? submissionError.message : 'Đăng ký thất bại, thử lại sau.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-content">
      <h2>Đăng ký tài khoản</h2>
      <p>Tạo hồ sơ nội bộ để truy cập tài nguyên ITSS Nihongo.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Tên đăng nhập
          <input
            type="text"
            name="username"
            placeholder="vd: tanaka123"
            minLength={3}
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
            placeholder="Tối thiểu 6 ký tự"
            minLength={6}
            required
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Hoàn tất đăng ký'}
        </button>
      </form>
      <p className="auth-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </section>
  )
}

export default RegisterPage
