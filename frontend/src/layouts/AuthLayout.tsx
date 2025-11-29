import { Outlet } from 'react-router-dom'

const AuthLayout = () => (
  <div className="auth-layout">
    <div className="auth-card">
      <div className="auth-brand">
        <p className="eyebrow">ITSS Nihongo</p>
        <h1>Đồng bộ tài khoản</h1>
        <p>Đăng nhập để tiếp tục theo dõi trạng thái học tập trên dashboard.</p>
      </div>
      <Outlet />
    </div>
  </div>
)

export default AuthLayout


