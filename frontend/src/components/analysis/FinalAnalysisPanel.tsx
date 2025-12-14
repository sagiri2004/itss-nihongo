import { useEffect, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../hooks/useAuth'
import { finalAnalysisService } from '../../services/finalAnalysisService'
import type { FinalAnalysisResponse } from '../../types/lecture'
import '../../styles/final-analysis.css'
import '../../styles/lecture-detail.css'

interface FinalAnalysisPanelProps {
  lectureId: number
  status: string
  onAnalysisComplete?: () => void
}

const FinalAnalysisPanel = ({ lectureId, status, onAnalysisComplete }: FinalAnalysisPanelProps) => {
  const { t } = useLanguage()
  const { token } = useAuth()
  const [analysis, setAnalysis] = useState<FinalAnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'ANALYZING' || status === 'COMPLETED') {
      loadAnalysis()
    }
  }, [lectureId, status, token])

  const loadAnalysis = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await finalAnalysisService.getFinalAnalysis(lectureId, token)
      console.log('Final Analysis Data received:', result)
      if (result) {
        console.log('Setting analysis with data:', {
          overallScore: result.overallScore,
          overallFeedback: result.overallFeedback,
          contentCoverage: result.contentCoverage,
          slideAnalysesCount: result.slideAnalyses?.length
        })
        setAnalysis(result)
      }
    } catch (err) {
      console.error('Failed to load final analysis', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const performAnalysis = async () => {
    if (!token) {
      setError('Not logged in')
      return
    }

    try {
      setIsAnalyzing(true)
      setError(null)
      const result = await finalAnalysisService.performFinalAnalysis(lectureId, token)
      console.log('Final Analysis Result:', result)
      console.log('Analysis scores:', {
        overallScore: result.overallScore,
        contentCoverage: result.contentCoverage,
        structureQuality: result.structureQuality,
        clarityScore: result.clarityScore,
        engagementScore: result.engagementScore,
        timeManagement: result.timeManagement
      })
      setAnalysis(result)
      if (onAnalysisComplete) {
        onAnalysisComplete()
      }
    } catch (err) {
      console.error('Failed to perform final analysis', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDeleteAnalysis = async () => {
    if (!token) {
      setError('Not logged in')
      return
    }

    if (!confirm(t('lectureDetail.finalAnalysis.confirmDelete') || 'Bạn có chắc chắn muốn xóa phân tích này và phân tích lại?')) {
      return
    }

    try {
      setIsDeleting(true)
      setError(null)
      await finalAnalysisService.deleteFinalAnalysis(lectureId, token)
      setAnalysis(null)
      if (onAnalysisComplete) {
        onAnalysisComplete()
      }
    } catch (err) {
      console.error('Failed to delete final analysis', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const formatScore = (score: number | null | undefined): number => {
    if (score == null || isNaN(score)) {
      return 0
    }
    return Math.round(score * 100)
  }

  const getScoreColor = (score: number | null | undefined): string => {
    if (score == null || isNaN(score)) {
      return '#ef4444' // red for invalid scores
    }
    if (score >= 0.8) return '#10b981' // green
    if (score >= 0.6) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  if (status !== 'ANALYZING' && status !== 'COMPLETED') {
    return null
  }

  return (
    <div className="final-analysis-panel">
      <div className="final-analysis-header">
        <h3>{t('lectureDetail.finalAnalysis.title')}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {status === 'COMPLETED' && analysis && (
            <button
              onClick={handleDeleteAnalysis}
              disabled={isDeleting}
              className="secondary-button"
              style={{ color: '#ef4444' }}
            >
              {isDeleting ? t('common.loading') : t('lectureDetail.finalAnalysis.deleteAnalysis')}
            </button>
          )}
          {status === 'ANALYZING' && !analysis && (
            <button
              onClick={performAnalysis}
              disabled={isAnalyzing}
              className="btn-primary"
            >
              {isAnalyzing ? t('lectureDetail.finalAnalysis.analyzing') : t('lectureDetail.finalAnalysis.performAnalysis')}
            </button>
          )}
        </div>
      </div>

      {isLoading && <div className="loading">{t('common.loading')}</div>}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {analysis && (
        <div className="final-analysis-content">
          {/* Overall Score */}
          <div className="overall-score-section">
            <div className="score-circle" style={{ borderColor: getScoreColor(analysis.overallScore) }}>
              <div className="score-value" style={{ color: getScoreColor(analysis.overallScore) }}>
                {formatScore(analysis.overallScore)}%
              </div>
              <div className="score-label">{t('lectureDetail.finalAnalysis.overallScore')}</div>
            </div>
            <div className="overall-feedback">
              <h4>{t('lectureDetail.finalAnalysis.overallFeedback')}</h4>
              <p>{analysis.overallFeedback || t('common.noData')}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-label">{t('lectureDetail.finalAnalysis.metrics.contentCoverage')}</div>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${formatScore(analysis.contentCoverage)}%`,
                    backgroundColor: getScoreColor(analysis.contentCoverage),
                  }}
                />
              </div>
              <div className="metric-value">{formatScore(analysis.contentCoverage)}%</div>
            </div>

            <div className="metric-item">
              <div className="metric-label">{t('lectureDetail.finalAnalysis.metrics.structureQuality')}</div>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${formatScore(analysis.structureQuality)}%`,
                    backgroundColor: getScoreColor(analysis.structureQuality),
                  }}
                />
              </div>
              <div className="metric-value">{formatScore(analysis.structureQuality)}%</div>
            </div>

            <div className="metric-item">
              <div className="metric-label">{t('lectureDetail.finalAnalysis.metrics.clarity')}</div>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${formatScore(analysis.clarityScore)}%`,
                    backgroundColor: getScoreColor(analysis.clarityScore),
                  }}
                />
              </div>
              <div className="metric-value">{formatScore(analysis.clarityScore)}%</div>
            </div>

            <div className="metric-item">
              <div className="metric-label">{t('lectureDetail.finalAnalysis.metrics.engagement')}</div>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${formatScore(analysis.engagementScore)}%`,
                    backgroundColor: getScoreColor(analysis.engagementScore),
                  }}
                />
              </div>
              <div className="metric-value">{formatScore(analysis.engagementScore)}%</div>
            </div>

            <div className="metric-item">
              <div className="metric-label">{t('lectureDetail.finalAnalysis.metrics.timeManagement')}</div>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${formatScore(analysis.timeManagement)}%`,
                    backgroundColor: getScoreColor(analysis.timeManagement),
                  }}
                />
              </div>
              <div className="metric-value">{formatScore(analysis.timeManagement)}%</div>
            </div>
          </div>

          {/* Strengths */}
          <div className="analysis-section">
            <h4>{t('lectureDetail.finalAnalysis.strengths')}</h4>
            {analysis.strengths && analysis.strengths.length > 0 ? (
              <ul className="analysis-list">
                {analysis.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>{t('common.noData')}</p>
            )}
          </div>

          {/* Improvements */}
          <div className="analysis-section">
            <h4>{t('lectureDetail.finalAnalysis.improvements')}</h4>
            {analysis.improvements && analysis.improvements.length > 0 ? (
              <ul className="analysis-list">
                {analysis.improvements.map((improvement, index) => (
                  <li key={index}>{improvement}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>{t('common.noData')}</p>
            )}
          </div>

          {/* Recommendations */}
          <div className="analysis-section">
            <h4>{t('lectureDetail.finalAnalysis.recommendations')}</h4>
            {analysis.recommendations && analysis.recommendations.length > 0 ? (
              <ul className="analysis-list">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>{t('common.noData')}</p>
            )}
          </div>

          {/* Slide Analyses */}
          <div className="analysis-section">
            <h4>{t('lectureDetail.finalAnalysis.slideAnalysis')}</h4>
            {analysis.slideAnalyses && analysis.slideAnalyses.length > 0 ? (
              <div className="slide-analyses">
                {[...analysis.slideAnalyses]
                  .sort((a, b) => (a.slidePageNumber || 0) - (b.slidePageNumber || 0))
                  .map((slideAnalysis, index) => (
                    <div key={slideAnalysis.slidePageNumber || index} className="slide-analysis-item">
                      <div className="slide-analysis-header">
                        <span className="slide-number">
                          {t('lectureDetail.finalAnalysis.slidePage', { page: slideAnalysis.slidePageNumber })}
                        </span>
                        <span className="slide-score" style={{ color: getScoreColor(slideAnalysis.score) }}>
                          {formatScore(slideAnalysis.score)}%
                        </span>
                      </div>
                      {slideAnalysis.feedback && (
                        <p className="slide-feedback">{slideAnalysis.feedback}</p>
                      )}
                      {slideAnalysis.strengths && slideAnalysis.strengths.length > 0 && (
                        <div className="slide-details">
                          <strong>{t('lectureDetail.finalAnalysis.strengths')}:</strong>
                          <ul>
                            {slideAnalysis.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {slideAnalysis.improvements && slideAnalysis.improvements.length > 0 && (
                        <div className="slide-details">
                          <strong>{t('lectureDetail.finalAnalysis.improvements')}:</strong>
                          <ul>
                            {slideAnalysis.improvements.map((imp, i) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>{t('common.noData')}</p>
            )}
          </div>
        </div>
      )}

      {status === 'ANALYZING' && !analysis && !isLoading && (
        <div className="no-analysis">
          <p>{t('lectureDetail.finalAnalysis.noAnalysis')}</p>
        </div>
      )}
    </div>
  )
}

export default FinalAnalysisPanel

