import { useEffect, useMemo, useState } from 'react'
import { recordingAnalysisService, type RecordingAnalysisResponse } from '../../services/recordingAnalysisService'
import { slideRecordingService, type SlideRecordingResponse } from '../../services/slideRecordingService'
import { useAuth } from '../../hooks/useAuth'
import '../../styles/analysis.css'

interface RecordingAnalysisPanelProps {
  recording: SlideRecordingResponse | null
  slideContent?: string
  slideKeywords?: string[]
  lectureId: number
  slidePageNumber?: number
}

// Ngưỡng tốc độ nói (words per minute)
const SPEECH_RATE_THRESHOLDS = {
  SLOW: 100, // Dưới 100 WPM là chậm
  NORMAL_MIN: 100,
  NORMAL_MAX: 180, // 100-180 WPM là bình thường
  FAST: 180, // Trên 180 WPM là nhanh
}

const RecordingAnalysisPanel = ({ recording, slideContent = '', slideKeywords = [], lectureId, slidePageNumber }: RecordingAnalysisPanelProps) => {
  const { token } = useAuth()
  const [currentRecording, setCurrentRecording] = useState<SlideRecordingResponse | null>(recording)
  const [analysis, setAnalysis] = useState<RecordingAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load toàn bộ data khi slidePageNumber thay đổi hoặc recording prop thay đổi
  useEffect(() => {
    const loadAllData = async () => {
      // Nếu có recording prop và khớp với slide hiện tại, sử dụng nó
      if (recording && recording.slide_page_number === slidePageNumber) {
        setCurrentRecording(recording)
        // Load analysis cho recording này
        if (recording.id && token) {
          try {
            const analysisData = await recordingAnalysisService.getAnalysis(recording.id, token)
            setAnalysis(analysisData)
          } catch (analysisErr) {
            // Analysis không tồn tại là OK
            setAnalysis(null)
          }
        }
        return
      }

      // Nếu không có recording prop hoặc không khớp, reset và load từ API
      setCurrentRecording(null)
      setAnalysis(null)
      setError(null)

      if (!lectureId || slidePageNumber === undefined || !token) {
        return
      }

      try {
        // 1. Load recording cho slide hiện tại
        const recordingData = await slideRecordingService.getRecording(lectureId, token, slidePageNumber)
        
        if (recordingData) {
          setCurrentRecording(recordingData)
          
          // 2. Nếu có recording, load analysis
          try {
            const analysisData = await recordingAnalysisService.getAnalysis(recordingData.id, token)
            setAnalysis(analysisData)
          } catch (analysisErr) {
            // Analysis không tồn tại là OK
            setAnalysis(null)
          }
        } else {
          // Không có recording cho slide này
          setCurrentRecording(null)
          setAnalysis(null)
        }
      } catch (err) {
        console.error('Failed to load recording/analysis', err)
        setCurrentRecording(null)
        setAnalysis(null)
      }
    }

    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId, slidePageNumber, token, recording])


  // Đếm từ cho tiếng Nhật (không có space)
  const countWords = (text: string, languageCode: string): number => {
    if (!text || text.trim().length === 0) return 0

    // Tiếng Nhật: đếm ký tự (mỗi ký tự ~ 1 từ trong tiếng Nhật)
    if (languageCode.startsWith('ja')) {
      // Loại bỏ space, punctuation và đếm ký tự
      const cleaned = text.replace(/[\s\.,!?。、！？]/g, '')
      return cleaned.length
    }

    // Tiếng Việt/Anh: đếm từ bằng space
    const words = text.trim().split(/\s+/).filter(w => w.length > 0)
    return words.length
  }

  // Tính tốc độ nói và vẽ biểu đồ
  const speechRateData = useMemo(() => {
    if (!currentRecording || !currentRecording.messages || currentRecording.messages.length === 0) {
      return null
    }

    const messages = currentRecording.messages
    const durationMinutes = currentRecording.recording_duration_sec / 60
    const languageCode = currentRecording.language_code || 'ja-JP'

    // Tính tổng số từ (theo ngôn ngữ)
    const totalWords = messages.reduce((total, msg) => {
      return total + countWords(msg.text, languageCode)
    }, 0)

    // Tốc độ nói trung bình (WPM)
    const averageWPM = durationMinutes > 0 ? totalWords / durationMinutes : 0

    // Tính tốc độ nói theo từng khoảng thời gian (mỗi 10 giây)
    const timeWindows: Array<{ time: number; wpm: number; words: number }> = []
    const windowSize = 10 // 10 giây

    for (let startTime = 0; startTime < currentRecording.recording_duration_sec; startTime += windowSize) {
      const endTime = Math.min(startTime + windowSize, currentRecording.recording_duration_sec)
      const windowMessages = messages.filter(
        msg => msg.relative_time_sec >= startTime && msg.relative_time_sec < endTime
      )

      const windowWords = windowMessages.reduce((total, msg) => {
        return total + countWords(msg.text, languageCode)
      }, 0)

      const windowMinutes = (endTime - startTime) / 60
      const windowWPM = windowMinutes > 0 ? windowWords / windowMinutes : 0

      timeWindows.push({
        time: startTime,
        wpm: windowWPM,
        words: windowWords,
      })
    }

    // Đánh giá tốc độ
    let rateStatus: 'slow' | 'normal' | 'fast' = 'normal'
    let rateLabel = 'Bình thường'
    if (averageWPM < SPEECH_RATE_THRESHOLDS.SLOW) {
      rateStatus = 'slow'
      rateLabel = 'Chậm'
    } else if (averageWPM > SPEECH_RATE_THRESHOLDS.FAST) {
      rateStatus = 'fast'
      rateLabel = 'Nhanh'
    }

    return {
      averageWPM: Math.round(averageWPM),
      totalWords,
      durationMinutes,
      rateStatus,
      rateLabel,
      timeWindows,
    }
  }, [currentRecording])



  const handleAnalyze = async () => {
    if (!currentRecording || !token || !slideContent) {
      setError('Thiếu thông tin để phân tích. Vui lòng ghi âm và lưu trước.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      // Gọi FastAPI để phân tích với Gemini
      const transcriptTexts = currentRecording.messages.map(msg => msg.text)
      const analysisResult = await recordingAnalysisService.analyzeRecording({
        lecture_id: lectureId,
        slide_page_number: slidePageNumber || 0,
        slide_content: slideContent,
        slide_keywords: slideKeywords,
        transcript_texts: transcriptTexts,
        language_code: currentRecording.language_code,
      })

      // Tính tốc độ nói
      const averageWPM = speechRateData?.averageWPM || 0

      // Lưu vào backend
      const savedAnalysis = await recordingAnalysisService.saveAnalysis(
        {
          recording_id: currentRecording.id,
          context_accuracy: analysisResult.context_accuracy,
          content_completeness: analysisResult.content_completeness,
          context_relevance: analysisResult.context_relevance,
          average_speech_rate: averageWPM,
          feedback: analysisResult.feedback,
          suggestions: analysisResult.suggestions,
        },
        token
      )

      setAnalysis(savedAnalysis)
    } catch (err: any) {
      console.error('Analysis failed', err)
      setError(err?.message || 'Phân tích thất bại')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!currentRecording) {
    return (
      <div className="recording-analysis-panel">
        <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
          Chưa có recording. Vui lòng ghi âm và lưu để phân tích.
        </p>
      </div>
    )
  }

  return (
    <div className="recording-analysis-panel">
      <header className="analysis-header">
        <h3>📊 Phân tích thuyết trình</h3>
        {!analysis && (
          <button
            type="button"
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !slideContent}
          >
            {isAnalyzing ? '⏳ Đang phân tích...' : '🔍 Phân tích'}
          </button>
        )}
      </header>

      {error && <div className="analysis-error">⚠️ {error}</div>}

      {/* Tốc độ nói */}
      {speechRateData && (
        <div className="speech-rate-section">
          <h4>🎤 Tốc độ nói</h4>
          <div className="speech-rate-stats">
            <div className="stat-item">
              <span className="stat-label">Trung bình:</span>
              <span className={`stat-value ${speechRateData.rateStatus}`}>
                {speechRateData.averageWPM} WPM
              </span>
              <span className={`rate-badge ${speechRateData.rateStatus}`}>
                {speechRateData.rateLabel}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tổng từ:</span>
              <span className="stat-value">{speechRateData.totalWords} từ</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Thời gian:</span>
              <span className="stat-value">
                {Math.floor(speechRateData.durationMinutes)} phút{' '}
                {Math.round((speechRateData.durationMinutes % 1) * 60)} giây
              </span>
            </div>
          </div>

          {/* Biểu đồ tốc độ nói */}
          {speechRateData.timeWindows.length > 0 && (
            <div className="speech-rate-chart">
              <h5>Biểu đồ tốc độ nói theo thời gian</h5>
              <div className="chart-container">
                <div className="chart-wrapper">
                  <svg className="chart-svg" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
                    {/* Y-axis labels */}
                    {[0, 50, 100, 150, 200, 250].map((y) => (
                      <g key={y}>
                        <line
                          x1="40"
                          y1={200 - (y / 250) * 180}
                          x2="760"
                          y2={200 - (y / 250) * 180}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                        />
                        <text
                          x="35"
                          y={200 - (y / 250) * 180 + 4}
                          fontSize="10"
                          fill="#64748b"
                          textAnchor="end"
                        >
                          {y}
                        </text>
                      </g>
                    ))}

                    {/* Threshold lines */}
                    <line
                      x1="40"
                      y1={200 - (SPEECH_RATE_THRESHOLDS.SLOW / 250) * 180}
                      x2="760"
                      y2={200 - (SPEECH_RATE_THRESHOLDS.SLOW / 250) * 180}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    <line
                      x1="40"
                      y1={200 - (SPEECH_RATE_THRESHOLDS.FAST / 250) * 180}
                      x2="760"
                      y2={200 - (SPEECH_RATE_THRESHOLDS.FAST / 250) * 180}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />

                    {/* X-axis */}
                    <line
                      x1="40"
                      y1="180"
                      x2="760"
                      y2="180"
                      stroke="#374151"
                      strokeWidth="2"
                    />

                    {/* Data line and points */}
                    {speechRateData.timeWindows.length > 0 && (() => {
                      const maxWPM = Math.max(...speechRateData.timeWindows.map(w => w.wpm), 250)
                      const stepX = 720 / Math.max(speechRateData.timeWindows.length - 1, 1)
                      const points = speechRateData.timeWindows
                        .map((w, i) => {
                          const x = 40 + i * stepX
                          const y = 180 - Math.min((w.wpm / maxWPM) * 160, 160)
                          return `${x},${y}`
                        })
                        .join(' ')

                      return (
                        <>
                          <polyline
                            points={points}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                          {speechRateData.timeWindows.map((w, i) => {
                            const x = 40 + i * stepX
                            const y = 180 - Math.min((w.wpm / maxWPM) * 160, 160)
                            return (
                              <g key={i}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#3b82f6"
                                />
                                {/* Time labels */}
                                {i % 2 === 0 && (
                                  <text
                                    x={x}
                                    y="195"
                                    fontSize="9"
                                    fill="#64748b"
                                    textAnchor="middle"
                                  >
                                    {Math.floor(w.time / 60)}:{(w.time % 60).toString().padStart(2, '0')}
                                  </text>
                                )}
                              </g>
                            )
                          })}
                        </>
                      )
                    })()}
                  </svg>
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                    Ngưỡng chậm ({SPEECH_RATE_THRESHOLDS.SLOW} WPM)
                  </span>
                  <span className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                    Ngưỡng nhanh ({SPEECH_RATE_THRESHOLDS.FAST} WPM)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kết quả phân tích từ Gemini */}
      {analysis && (
        <div className="analysis-results">
          <h4>📝 Đánh giá nội dung</h4>

          <div className="analysis-scores">
            <div className="score-item">
              <span className="score-label">Độ chính xác ngữ cảnh</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${analysis.context_accuracy * 100}%` }}
                ></div>
                <span className="score-value">
                  {(analysis.context_accuracy * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="score-item">
              <span className="score-label">Độ đầy đủ nội dung</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${analysis.content_completeness * 100}%` }}
                ></div>
                <span className="score-value">
                  {(analysis.content_completeness * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="score-item">
              <span className="score-label">Độ liên quan ngữ cảnh</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${analysis.context_relevance * 100}%` }}
                ></div>
                <span className="score-value">
                  {(analysis.context_relevance * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {analysis.feedback && (
            <div className="analysis-feedback">
              <h5>Nhận xét</h5>
              <p>{analysis.feedback}</p>
            </div>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div className="analysis-suggestions">
              <h5>Gợi ý cải thiện</h5>
              <ul>
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RecordingAnalysisPanel

