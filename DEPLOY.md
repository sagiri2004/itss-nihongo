# Hướng dẫn Build & Deploy lên Vercel

## 📋 Tổng quan

Project này gồm 3 phần:
- **Frontend** (React + Vite): Deploy lên Vercel
- **Backend** (Spring Boot): Deploy lên server riêng (Railway, Render, hoặc VPS)
- **Speech-to-Text Service** (FastAPI): Deploy lên server riêng hoặc Cloud Run

## 🚀 Frontend - Deploy lên Vercel

### 1. Chuẩn bị

```bash
cd frontend
npm install
```

### 2. Build local để test

```bash
# Build production
npm run build

# Preview build
npm run preview
```

### 3. Cấu hình Environment Variables trên Vercel

Vào Vercel Dashboard → Project Settings → Environment Variables, thêm:

```
VITE_API_BASE_URL=https://your-backend-api.com
VITE_SPEECH_WS_URL=wss://your-speech-service.com/ws
```

### 4. Deploy lên Vercel

#### Cách 1: Qua Vercel CLI

```bash
# Cài đặt Vercel CLI (nếu chưa có)
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Deploy production
vercel --prod
```

#### Cách 2: Qua GitHub Integration

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com)
3. Import project từ GitHub
4. Chọn root directory: `frontend`
5. Build settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables
7. Deploy

### 5. Kiểm tra sau khi deploy

- ✅ Frontend load được
- ✅ API calls hoạt động (check Network tab)
- ✅ WebSocket connection hoạt động (nếu có)

---

## 🔧 Backend - Spring Boot

### 1. Build JAR file

```bash
cd backend

# Build với Maven
./mvnw clean package -DskipTests

# Hoặc nếu dùng Maven đã cài
mvn clean package -DskipTests

# File JAR sẽ ở: backend/target/backend-0.0.1-SNAPSHOT.jar
```

### 2. Run local

```bash
# Chạy JAR
java -jar target/backend-0.0.1-SNAPSHOT.jar

# Hoặc với Spring Boot Maven plugin
./mvnw spring-boot:run
```

### 3. Environment Variables cần thiết

Tạo file `application.properties` hoặc set environment variables:

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/your_db
spring.datasource.username=your_user
spring.datasource.password=your_password

# JWT
jwt.secret=your-secret-key
jwt.expiration=86400000

# GCP Storage
gcp.storage.bucket=your-bucket-name
gcp.storage.credentials-path=/path/to/credentials.json

# FastAPI Service
fastapi.slide-processing.url=http://localhost:8010
```

### 4. Deploy options

#### Option A: Railway
```bash
# Cài Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

#### Option B: Render
1. Tạo Web Service trên Render
2. Connect GitHub repo
3. Build command: `./mvnw clean package -DskipTests`
4. Start command: `java -jar target/backend-0.0.1-SNAPSHOT.jar`
5. Add environment variables

#### Option C: VPS/Server
```bash
# Upload JAR file
scp target/backend-0.0.1-SNAPSHOT.jar user@server:/app/

# SSH vào server
ssh user@server

# Chạy với systemd service hoặc PM2
sudo systemctl start backend
```

---

## 🎤 Speech-to-Text Service - FastAPI

### 1. Chuẩn bị

```bash
cd speech-to-text

# Tạo virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Cấu hình Environment Variables

Tạo file `.env`:

```env
GCP_PROJECT_ID=speech-processing-prod
GCP_SERVICE_ACCOUNT_KEY=./speech-processing-prod-9ffbefa55e2c.json
GCS_BUCKET_NAME=speech-processing-intermediate
GCS_REGION=asia-southeast1
```

### 3. Run local

```bash
# Chạy với uvicorn
uvicorn src.api.main:app --host 0.0.0.0 --port 8010

# Hoặc dùng script
chmod +x run_app.sh
./run_app.sh
```

### 4. Deploy options

#### Option A: Google Cloud Run
```bash
# Build Docker image
docker build -t speech-to-text-service .

# Push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/speech-to-text

# Deploy to Cloud Run
gcloud run deploy speech-to-text \
  --image gcr.io/PROJECT_ID/speech-to-text \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

#### Option B: Railway
```bash
railway login
railway link
railway up
```

#### Option C: Render
1. Tạo Web Service
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn src.api.main:app --host 0.0.0.0 --port $PORT`

---

## 📝 Checklist trước khi deploy

### Frontend
- [ ] Environment variables đã set trên Vercel
- [ ] `VITE_API_BASE_URL` trỏ đúng backend URL
- [ ] `VITE_SPEECH_WS_URL` trỏ đúng WebSocket URL
- [ ] Build thành công: `npm run build`
- [ ] Preview hoạt động: `npm run preview`

### Backend
- [ ] Database đã setup và accessible
- [ ] Environment variables đã config
- [ ] GCP credentials đã setup
- [ ] JAR file build thành công
- [ ] Test API endpoints hoạt động

### Speech-to-Text Service
- [ ] GCP credentials file có sẵn
- [ ] Environment variables đã config
- [ ] Dependencies đã install
- [ ] Service chạy được local
- [ ] Test `/slides/process` endpoint

---

## 🔗 URLs sau khi deploy

Sau khi deploy xong, cập nhật các URLs:

1. **Frontend** (Vercel): `https://your-app.vercel.app`
2. **Backend** (Railway/Render): `https://your-backend.railway.app` hoặc `https://your-backend.onrender.com`
3. **Speech-to-Text** (Cloud Run): `https://your-service-xxxxx-xx.a.run.app`

Cập nhật environment variables:
- Frontend: `VITE_API_BASE_URL` và `VITE_SPEECH_WS_URL`
- Backend: `fastapi.slide-processing.url`

---

## 🐛 Troubleshooting

### Frontend không kết nối được API
- Kiểm tra CORS settings trên backend
- Kiểm tra `VITE_API_BASE_URL` có đúng không
- Kiểm tra Network tab trong browser console

### Backend lỗi database
- Kiểm tra database connection string
- Kiểm tra database đã được tạo chưa
- Kiểm tra migrations đã chạy chưa

### Speech-to-Text service lỗi credentials
- Kiểm tra file credentials JSON có tồn tại
- Kiểm tra `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Kiểm tra GCP project permissions

---

## 📚 Tài liệu tham khảo

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)

