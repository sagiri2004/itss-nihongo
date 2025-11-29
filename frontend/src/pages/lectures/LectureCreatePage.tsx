import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lectureService } from '../../services/lectureService'
import { useAuth } from '../../hooks/useAuth'

const LectureCreatePage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdLectureId, setCreatedLectureId] = useState<number | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      setError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const lecture = await lectureService.createLecture(
        { title: form.title, description: form.description || undefined },
        token,
      )
      setCreatedLectureId(lecture.id)
      setForm({ title: '', description: '' })
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Tạo lecture thất bại.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToUpload = () => {
    if (!createdLectureId) return
    navigate(`/app/slides/upload?lectureId=${createdLectureId}`)
  }

  return (
    <section className="slide-upload">
      <header className="page-header">
        <div>
          <p className="eyebrow">Quản trị bài giảng</p>
          <h1>Tạo lecture mới</h1>
          <p className="subtitle">Điền tiêu đề & mô tả ngắn. Sau khi tạo xong bạn có thể upload slide cho lecture đó.</p>
        </div>
      </header>

      <div className="upload-card">
        <form className="slide-form" onSubmit={handleSubmit}>
          <label className="form-field">
            Tiêu đề
            <input
              type="text"
              placeholder="Ví dụ: Bài 1 - Giới thiệu tiếng Nhật"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>

          <label className="form-field">
            Mô tả
            <textarea
              placeholder="Ghi chú nội dung chính, tài nguyên đính kèm..."
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo...' : 'Tạo lecture'}
          </button>
        </form>
      </div>

      {createdLectureId && (
        <div className="upload-card success">
          <h2>Lecture đã tạo</h2>
          <ul className="upload-meta">
            <li>
              <span>ID</span>
              <strong>{createdLectureId}</strong>
            </li>
          </ul>
          <button className="primary-btn" type="button" onClick={goToUpload}>
            Upload slide cho lecture này
          </button>
        </div>
      )}
    </section>
  )
}

export default LectureCreatePage


