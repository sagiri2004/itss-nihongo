import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import MarketingLayout from './layouts/MarketingLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardPage from './pages/dashboard/DashboardPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import IntroPage from './pages/intro/IntroPage'
import SlideUploadPage from './pages/slides/SlideUploadPage'
import LectureCreatePage from './pages/lectures/LectureCreatePage'
import LectureDetailPage from './pages/lectures/LectureDetailPage'
import RealtimeTranscriptionPage from './pages/transcription/RealtimeTranscriptionPage'
import './styles/layouts.css'
import './styles/dashboard.css'
import './styles/new-ui.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<IntroPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="slides">
              <Route path="upload" element={<SlideUploadPage />} />
            </Route>
            <Route path="lectures">
              <Route path="new" element={<LectureCreatePage />} />
              <Route path=":lectureId" element={<LectureDetailPage />} />
            </Route>
            <Route path="transcription" element={<RealtimeTranscriptionPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
