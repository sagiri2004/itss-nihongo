import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ProtectedRoute = () => {
  const location = useLocation()
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <div className="route-loader">
        <div className="loader" />
        <p>Đang xác thực phiên làm việc...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    const redirectPath = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from: redirectPath }} />
  }

  return <Outlet />
}

export default ProtectedRoute


