# 🚀 Quick Start - Build & Deploy Commands

## Frontend (Vercel)

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Build for production
npm run build

# 3. Preview build locally
npm run preview

# 4. Deploy to Vercel
vercel --prod
```

## Backend (Spring Boot)

```bash
# 1. Build JAR
cd backend
./mvnw clean package -DskipTests

# 2. Run locally
java -jar target/backend-0.0.1-SNAPSHOT.jar

# 3. Deploy (Railway example)
railway up
```

## Speech-to-Text Service (FastAPI)

```bash
# 1. Setup virtual environment
cd speech-to-text
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run locally
uvicorn src.api.main:app --host 0.0.0.0 --port 8010

# 4. Deploy (Cloud Run example)
gcloud run deploy speech-to-text --source .
```

## Environment Variables

### Frontend (.env hoặc Vercel Dashboard)
```
VITE_API_BASE_URL=https://your-backend.com
VITE_SPEECH_WS_URL=wss://your-speech-service.com/ws
```

### Backend (application.properties hoặc environment)
```
spring.datasource.url=jdbc:postgresql://...
jwt.secret=your-secret
gcp.storage.bucket=your-bucket
fastapi.slide-processing.url=https://your-speech-service.com
```

### Speech-to-Text (.env)
```
GCP_PROJECT_ID=your-project
GCP_SERVICE_ACCOUNT_KEY=./credentials.json
GCS_BUCKET_NAME=your-bucket
```

