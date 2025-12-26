# 🐳 Hướng dẫn Push và Pull Images từ Docker Hub

## 📋 Mục lục
1. [Push Images lên Docker Hub](#push-images-lên-docker-hub)
2. [Pull và sử dụng Images từ Docker Hub](#pull-và-sử-dụng-images-từ-docker-hub)
3. [Cấu hình Docker Hub Username](#cấu-hình-docker-hub-username)

---

## 1. Push Images lên Docker Hub

### Bước 1: Đăng nhập Docker Hub

Có 4 cách đăng nhập:

**Cách 1: Sử dụng script tự động (khuyến nghị)**
```bash
./login-dockerhub.sh
# Script sẽ hỏi password (không hiển thị trên màn hình)
```

**Cách 2: Interactive login (nhập password khi được hỏi)**
```bash
docker login -u sagiri2k4
# Nhập password khi được hỏi
```

**Cách 3: Non-interactive login (password từ stdin)**
```bash
echo 'your-password' | docker login -u sagiri2k4 --password-stdin
```

**Cách 4: Sử dụng environment variable (an toàn nhất)**
```bash
export DOCKER_HUB_PASSWORD=your-password
echo $DOCKER_HUB_PASSWORD | docker login -u sagiri2k4 --password-stdin
```

**Lưu ý:** 
- Không commit password vào git!
- Sử dụng environment variable hoặc Docker credential helper
- Khuyến nghị: Sử dụng Docker Access Token thay vì password (xem phần Security)

### Bước 2: Cấu hình Docker Hub Username

Có 2 cách:

**Cách 1: Set environment variable**
```bash
export DOCKER_HUB_USERNAME=sagiri2k4
```

**Cách 2: Thêm vào file .env**
```bash
# Thêm vào file .env
echo "DOCKER_HUB_USERNAME=sagiri2k4" >> .env
```

**Cách 3: Sửa trong script (đã set mặc định là sagiri2k4)**
```bash
# Mở file push-to-dockerhub.sh
# Default đã là: DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sagiri2k4}"
```

### Bước 3: Push images

**Sử dụng script tự động:**
```bash
chmod +x push-to-dockerhub.sh
./push-to-dockerhub.sh
```

**Hoặc push thủ công từng image:**

```bash
# 1. Build images
docker compose build

# 2. Tag và push backend
docker tag itss-nihongo-backend:latest sagiri2k4/itss-nihongo-backend:latest
docker push sagiri2k4/itss-nihongo-backend:latest

# 3. Tag và push frontend
docker tag itss-nihongo-frontend:latest sagiri2k4/itss-nihongo-frontend:latest
docker push sagiri2k4/itss-nihongo-frontend:latest

# 4. Tag và push speech-to-text
docker tag itss-nihongo-speech-to-text:latest sagiri2k4/itss-nihongo-speech-to-text:latest
docker push sagiri2k4/itss-nihongo-speech-to-text:latest
```

### Bước 4: Kiểm tra trên Docker Hub

Truy cập: https://hub.docker.com/r/sagiri2k4/itss-nihongo-backend

---

## 2. Pull và sử dụng Images từ Docker Hub

### Cách 1: Sử dụng docker-compose.prod.yml

**Bước 1: Cấu hình Docker Hub Username**

Tạo file `.env` hoặc export environment variable:
```bash
export DOCKER_HUB_USERNAME=sagiri2k4
# Hoặc thêm vào .env: DOCKER_HUB_USERNAME=sagiri2k4
```

**Bước 2: Pull và start services**

```bash
# Pull images từ Docker Hub
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d
```

**Bước 3: Kiểm tra**

```bash
docker compose -f docker-compose.prod.yml ps
```

### Cách 2: Pull thủ công từng image

```bash
# Pull images
docker pull sagiri2k4/itss-nihongo-backend:latest
docker pull sagiri2k4/itss-nihongo-frontend:latest
docker pull sagiri2k4/itss-nihongo-speech-to-text:latest

# Tag về tên local (nếu cần)
docker tag sagiri2k4/itss-nihongo-backend:latest itss-nihongo-backend:latest
docker tag sagiri2k4/itss-nihongo-frontend:latest itss-nihongo-frontend:latest
docker tag sagiri2k4/itss-nihongo-speech-to-text:latest itss-nihongo-speech-to-text:latest

# Sử dụng docker-compose.yml bình thường
docker compose up -d
```

---

## 3. Cấu hình Docker Hub Username

### Option 1: Environment Variable (Recommended)

Thêm vào `.env` file:
```env
DOCKER_HUB_USERNAME=sagiri2k4
```

### Option 2: Export trong shell

```bash
export DOCKER_HUB_USERNAME=your-username
```

### Option 3: Sửa trực tiếp trong docker-compose.prod.yml

Default đã là `sagiri2k4` trong file `docker-compose.prod.yml`. Nếu muốn đổi, thay `sagiri2k4` bằng username khác.

---

## 📝 Workflow thông thường

### Development (Build local):
```bash
# Build và run local
docker compose build
docker compose up -d
```

### Production (Pull from Docker Hub):
```bash
# Set username (hoặc dùng từ .env)
export DOCKER_HUB_USERNAME=sagiri2k4

# Pull và run
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Update và Push:
```bash
# 1. Build local
docker compose build

# 2. Test local
docker compose up -d

# 3. Push lên Docker Hub
./push-to-dockerhub.sh

# 4. Trên production server, pull lại
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Lưu ý bảo mật

1. **Không push credentials lên Docker Hub:**
   - File `.env` không được include trong images
   - Service account keys phải được mount từ volume

2. **Sử dụng private repositories** (nếu có):
   ```bash
   docker push your-username/itss-nihongo-backend:latest
   # Đảm bảo repository là private trên Docker Hub
   ```

3. **Tag với version thay vì chỉ `latest`:**
   ```bash
   docker tag itss-nihongo-backend:latest sagiri2k4/itss-nihongo-backend:v1.0.0
   docker push sagiri2k4/itss-nihongo-backend:v1.0.0
   ```

---

## 🐛 Troubleshooting

### Lỗi: "denied: requested access to the resource is denied"
- Kiểm tra đã login: `docker login`
- Kiểm tra username có đúng không
- Kiểm tra repository có tồn tại trên Docker Hub không

### Lỗi: "repository does not exist"
- Tạo repository trên Docker Hub trước (hoặc push sẽ tự tạo)
- Truy cập: https://hub.docker.com/repositories

### Images quá lớn
- Sử dụng multi-stage builds (đã có sẵn)
- Xóa unused images: `docker system prune -a`

---

## 📚 Tài liệu tham khảo

- Docker Hub: https://hub.docker.com
- Docker Compose: https://docs.docker.com/compose/
- Best Practices: https://docs.docker.com/develop/dev-best-practices/

