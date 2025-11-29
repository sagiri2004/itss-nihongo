import { Link, Outlet } from 'react-router-dom'

const MarketingLayout = () => (
  <div className="marketing-layout">
    <header className="marketing-header">
      <span className="brand">ITSS Nihongo</span>
      <nav className="marketing-nav">
        <Link to="/login">Đăng nhập</Link>
        <Link className="primary-btn" to="/register">
          Tạo tài khoản
        </Link>
      </nav>
    </header>
    <main className="marketing-main">
      <Outlet />
    </main>
  </div>
)

export default MarketingLayout


