import { Link } from 'react-router-dom'

const IntroPage = () => (
  <section className="marketing-hero">
    <div>
      <p className="eyebrow">Khởi động nhanh</p>
      <h1>Giải pháp theo dõi tiến độ tự học tiếng Nhật cho ITSS.</h1>
      <p>
        Toàn bộ dữ liệu bài giảng, slide deck và lịch sử thu âm được gom về một bảng điều khiển duy nhất. Kết nối
        Backend Spring Boot, quan sát chỉ số và hợp tác cùng đội phát triển nội bộ.
      </p>
      <div className="hero-actions">
        <Link className="primary-btn" to="/login">
          Truy cập ngay
        </Link>
        <Link className="text-btn" to="/register">
          Tạo tài khoản
        </Link>
      </div>
    </div>
    <div className="highlight-panel">
      <ul>
        <li>
          <strong>Giáo trình đồng bộ</strong>
          <span>Kết nối các asset bài giảng, slide và audio.</span>
        </li>
        <li>
          <strong>Giám sát thời gian thực</strong>
          <span>Dashboard mẫu sẵn sàng nhận dữ liệu thật.</span>
        </li>
        <li>
          <strong>Hệ thống phân quyền</strong>
          <span>JWT + Spring Security đảm bảo an toàn truy cập.</span>
        </li>
      </ul>
    </div>
  </section>
)

export default IntroPage


