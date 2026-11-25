# 🌱 KisanMitra — Intelligent Crop Disease Information & Farmer Assistance System

> AI-powered multilingual agricultural assistant for Indian farmers — detect crop diseases, get expert advice, and ask questions in your preferred language.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔬 **Disease Detection** | Upload crop photos → Gemini Vision AI identifies diseases with confidence scores |
| 💬 **Multilingual Chatbot** | Agricultural Q&A in English, Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ) |
| 📚 **RAG-Powered Answers** | Retrieves verified content from ICAR, KVK, TNAU, FAO documents |
| 📋 **Analysis History** | Save and review past disease analyses |
| 👤 **User Accounts** | Register/login to persist history across sessions |
| 📱 **Mobile Responsive** | Farmer-friendly UI works on all device sizes |

---

## 🏗️ Architecture

```
crop-disease-app/
├── backend/                    # Python + FastAPI
│   ├── main.py                 # App entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/
│   │   ├── documents/          # Agricultural knowledge base (txt/pdf)
│   │   ├── uploads/            # User-uploaded crop images
│   │   └── chroma_db/          # ChromaDB vector store
│   └── app/
│       ├── api/routes/
│       │   ├── auth.py         # Register, login, JWT
│       │   ├── disease.py      # Image upload & Gemini analysis
│       │   ├── chat.py         # Chatbot messages
│       │   └── history.py      # User history
│       ├── core/
│       │   ├── config.py       # Settings from .env
│       │   └── security.py     # JWT + bcrypt
│       ├── db/
│       │   ├── database.py     # SQLite + SQLAlchemy async
│       │   └── crud.py         # DB operations
│       ├── models/
│       │   ├── user.py
│       │   └── analysis.py
│       ├── services/
│       │   ├── gemini_service.py   # Gemini Vision AI
│       │   ├── rag_service.py      # ChromaDB + Cohere embeddings
│       │   └── chatbot_service.py  # Multilingual chatbot
│       └── utils/
│           └── image_utils.py  # OpenCV preprocessing
│
└── frontend/                   # React + Tailwind CSS
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── App.js
        ├── pages/
        │   ├── Dashboard.js
        │   ├── DiseaseDetection.js
        │   ├── Chatbot.js
        │   ├── History.js
        │   ├── Login.js
        │   └── Register.js
        ├── components/
        │   └── Navbar.js
        ├── contexts/
        │   ├── AuthContext.js
        │   └── LanguageContext.js
        └── utils/
            ├── api.js          # Axios API client
            └── i18n.js         # Translations (EN/HI/TE/KN)
```

---

## 🚀 Quick Start

### Prerequisites
- **Python** 3.10 or higher
- **Node.js** 18 or higher
- **API Keys**: [Gemini](https://aistudio.google.com) + [Cohere](https://cohere.com)

### 1. Clone / Navigate to Project

```bash
cd "GEN AI Hackaton/crop-disease-app"
```

### 2. Run Setup Script

**Windows:**
```cmd
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh && ./setup.sh
```

### 3. Configure API Keys

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
COHERE_API_KEY=your_actual_cohere_api_key
SECRET_KEY=any-random-secret-string-for-jwt
```

> **Get Gemini API key:** https://aistudio.google.com/app/apikey (Free tier available)  
> **Get Cohere API key:** https://dashboard.cohere.com/api-keys (Free tier: 1000 calls/month)

### 4. Start the Backend

```bash
cd backend
venv\Scripts\activate      # Windows
# OR: source venv/bin/activate  (Linux/Mac)

uvicorn main:app --reload --port 8000
```

Backend available at: http://localhost:8000  
API Docs (Swagger UI): http://localhost:8000/docs

### 5. Start the Frontend

```bash
cd frontend
npm start
```

App available at: http://localhost:3000

---

## 🔑 API Keys Setup Guide

### Gemini API (Google AI Studio) — FREE
1. Go to https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key and paste it as `GEMINI_API_KEY` in `backend/.env`

### Cohere API — FREE Tier
1. Sign up at https://cohere.com
2. Go to **Dashboard → API Keys**
3. Copy the **Trial** key and paste as `COHERE_API_KEY` in `backend/.env`

> ⚠️ The app will still work without Cohere (RAG disabled), but disease detection will use only Gemini.

---

## 📚 Adding Your Own Agricultural Documents

Place `.txt` or `.pdf` files in `backend/data/documents/`. On next startup, they will be automatically chunked, embedded, and indexed into ChromaDB.

**Recommended sources:**
- ICAR publications: https://icar.org.in
- TNAU Agritech Portal: https://agritech.tnau.ac.in
- FAO Resources: https://www.fao.org/publications
- KVK guides (contact your local KVK)

---

## 🌐 Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Full support |
| Hindi (हिन्दी) | `hi` | ✅ Full support |
| Telugu (తెలుగు) | `te` | ✅ Full support |
| Kannada (ಕನ್ನಡ) | `kn` | ✅ Full support |

---

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:8000/api/health
```

### Test Disease Detection
```bash
curl -X POST http://localhost:8000/api/disease/analyze \
  -F "file=@/path/to/crop_image.jpg" \
  -F "language=en"
```

### Test Chatbot
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is rice blast disease?", "language": "en"}'
```

---

## ⚠️ Important Disclaimer

KisanMitra is an **educational tool** that uses AI for crop disease guidance. It is **not** a replacement for professional agricultural advice.

- Always confirm AI diagnoses with a **KVK specialist** or **agricultural extension officer**
- Never apply treatments based solely on AI output
- Use only **CIB&RC registered** pesticides and agrochemicals
- Contact your state agricultural university for region-specific recommendations

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `GEMINI_API_KEY not set` | Add key to `backend/.env` |
| ChromaDB dimension mismatch | Delete `data/chroma_db/` folder and restart |
| Image upload fails | Check `MAX_FILE_SIZE_MB` in `.env` |
| CORS error in browser | Ensure frontend URL is in `ALLOWED_ORIGINS` in `.env` |
| Slow first response | RAG initialization runs on first request |

---

## 📄 License

Built for educational and agricultural assistance purposes. 
Crop disease information sourced from ICAR, TNAU, KVK, and FAO publications.
