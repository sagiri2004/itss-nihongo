import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lectureService } from '../../services/lectureService'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'

const LectureCreatePage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [form, setForm] = useState({
    title: '',
    datetime: '',
    participants: '',
    memo: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdLectureId, setCreatedLectureId] = useState<number | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      setError(t('lecture.errors.sessionExpired'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const lecture = await lectureService.createLecture(
        {
          title: form.title,
          description: [form.datetime, form.participants, form.memo].filter(Boolean).join(' / '),
        },
        token,
      )
      setCreatedLectureId(lecture.id)
      setForm({ title: '', datetime: '', participants: '', memo: '' })
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : t('lecture.errors.createFailed')
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
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('lecture.breadcrumb')}</p>
          <h1>{t('lecture.title')}</h1>
        </div>
      </section>

      <section className="form-section">
        <h2>{t('lecture.form.heading')}</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            {t('lecture.form.name')}
            <input
              type="text"
              placeholder={t('lecture.form.placeholders.title')}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>

          <label>
            {t('lecture.form.datetime')}
            <input
              type="datetime-local"
              value={form.datetime}
              onChange={(event) => setForm((prev) => ({ ...prev, datetime: event.target.value }))}
            />
          </label>

          <label>
            {t('lecture.form.participants')}
            <input
              type="text"
              placeholder={t('lecture.form.placeholders.participants')}
              value={form.participants}
              onChange={(event) => setForm((prev) => ({ ...prev, participants: event.target.value }))}
            />
          </label>

          <label>
            {t('lecture.form.memo')}
            <textarea
              rows={4}
              placeholder={t('lecture.form.placeholders.memo')}
              value={form.memo}
              onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => navigate('/app/dashboard')}>
              {t('lecture.form.cancel')}
            </button>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('lecture.form.submitting') : t('lecture.form.submit')}
            </button>
          </div>
        </form>
      </section>

      {createdLectureId && (
        <section className="form-section">
          <h2>{t('lecture.form.createdHeading')}</h2>
          <p>ID: {createdLectureId}</p>
          <button className="primary-button" type="button" onClick={goToUpload}>
            {t('lecture.form.goToSlides')}
          </button>
        </section>
      )}
    </>
  )
}

export default LectureCreatePage

