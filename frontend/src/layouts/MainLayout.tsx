import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { classNames } from '../utils/classNames'

const navItems = [
  { label: 'Tổng quan', to: '/app/dashboard' },
  { label: 'Tạo lecture', to: '/app/lectures/new' },
  { label: 'Upload slide', to: '/app/slides/upload' },
]

const MainLayout = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">ITSS Nihongo</p>
          <h1>Không gian quản trị</h1>
          {user && (
            <p className="subtitle header-greeting">
              Xin chào, <strong>{user.username}</strong>! Chúc bạn một ngày làm việc hiệu quả.
            </p>
          )}
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-chip">
              <span className="user-name">{user.username}</span>
              <span className="user-role">{user.roles?.join(', ') || 'User'}</span>
            </div>
          )}
          <button type="button" className="text-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <nav>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => classNames('sidebar-link', isActive && 'active')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout

