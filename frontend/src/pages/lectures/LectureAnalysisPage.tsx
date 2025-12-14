import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import { lectureService } from '../../services/lectureService'
import { finalAnalysisService } from '../../services/finalAnalysisService'
import type { LectureDetail, FinalAnalysisResponse } from '../../types/lecture'
import FinalAnalysisPanel from '../../components/analysis/FinalAnalysisPanel'
import '../../styles/lecture-detail.css'

const LectureAnalysisPage = () => {
  const { lectureId } = useParams<{ lectureId: string }>()
  const numericLectureId = Number(lectureId)
  const { token } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [lecture, setLecture] = useState<LectureDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!numericLectureId || !token) {
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)

    lectureService
      .getLectureDetail(numericLectureId, token)
      .then((data) => {
        if (!active) return
        setLecture(data)
      })
      .catch((fetchError) => {
        if (!active) return
        const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
        setError(message)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [numericLectureId, token])

  const handleAnalysisComplete = () => {
    // Reload lecture to get updated status
    if (token) {
      lectureService
        .getLectureDetail(numericLectureId, token)
        .then((data) => {
          setLecture(data)
        })
        .catch((err) => {
          console.error('Failed to reload lecture', err)
        })
    }
  }

  const handleBack = () => {
    navigate(`/app/lectures/${numericLectureId}`)
  }

  const breadcrumbParts = (
    <>
      <span onClick={() => navigate('/app/dashboard')} className="breadcrumb-link">
        {t('nav.home')}
      </span>
      {' > '}
      <span onClick={handleBack} className="breadcrumb-link">
        {t('lectureDetail.title')}
      </span>
      {' > '}
      <span>{t('lectureDetail.finalAnalysis.title')}</span>
    </>
  )

  if (isLoading) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{breadcrumbParts}</p>
            <h1>{t('lectureDetail.finalAnalysis.title')}</h1>
          </div>
        </section>
        <section className="page-content-wrapper">
          <div className="page-content-container">
            <div className="loading">{t('common.loading')}</div>
          </div>
        </section>
      </>
    )
  }

  if (error) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{breadcrumbParts}</p>
            <h1>{t('lectureDetail.finalAnalysis.title')}</h1>
          </div>
        </section>
        <section className="page-content-wrapper">
          <div className="page-content-container">
            <div className="error-message">{error}</div>
            <button onClick={handleBack} className="btn-primary">
              {t('common.back')}
            </button>
          </div>
        </section>
      </>
    )
  }

  if (!lecture) {
    return null
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{breadcrumbParts}</p>
          <h1>{t('lectureDetail.finalAnalysis.title')}</h1>
          <div className="hero-meta">
            <span>
              {t('lectureDetail.meta.lectureTitle')}: <strong>{lecture.title}</strong>
            </span>
            <span>
              {t('lectureDetail.meta.status')}: <strong>{t(`lectureStatus.${lecture.status}`)}</strong>
            </span>
          </div>
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={handleBack}>
            {t('common.back')}
          </button>
        </div>
      </section>
      <section className="page-content-wrapper">
        <div className="page-content-container">
          <FinalAnalysisPanel
            lectureId={numericLectureId}
            status={lecture.status}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </div>
      </section>
    </>
  )
}

export default LectureAnalysisPage

