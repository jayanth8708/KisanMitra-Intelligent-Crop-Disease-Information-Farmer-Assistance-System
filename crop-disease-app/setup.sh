#!/bin/bash
set -e

echo "============================================================"
echo "  KisanMitra - Crop Disease AI System - Setup Script"
echo "============================================================"

# ── Backend ───────────────────────────────────────────────────
echo ""
echo "[1/5] Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

echo "[2/5] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[3/5] Setting up .env file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  >> Created backend/.env — edit it with your API keys"
fi

echo "[4/5] Creating required directories..."
mkdir -p data/uploads data/chroma_db data/documents

cd ..

# ── Frontend ──────────────────────────────────────────────────
echo "[5/5] Setting up React frontend..."
cd frontend
[ ! -f .env ] && cp .env.example .env
npm install
cd ..

echo ""
echo "============================================================"
echo "  Setup complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Edit backend/.env with your API keys:"
echo "     - GEMINI_API_KEY  (https://aistudio.google.com)"
echo "     - COHERE_API_KEY  (https://cohere.com)"
echo "     - SECRET_KEY      (any random secret)"
echo ""
echo "  2. Start backend:   cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "  3. Start frontend:  cd frontend && npm start"
echo "  4. Open:            http://localhost:3000"
echo "============================================================"
