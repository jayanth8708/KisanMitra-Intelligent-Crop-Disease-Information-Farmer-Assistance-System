@echo off
echo ============================================================
echo   KisanMitra - Crop Disease AI System - Setup Script
echo ============================================================

:: ── Backend Setup ──────────────────────────────────────────
echo.
echo [1/5] Setting up Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate.bat

echo [2/5] Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo [3/5] Copying .env file (edit it with your API keys)...
if not exist .env (
    copy .env.example .env
    echo   >> Created backend\.env  — EDIT IT with your GEMINI_API_KEY and COHERE_API_KEY
) else (
    echo   >> backend\.env already exists
)

echo [4/5] Creating required directories...
mkdir data\uploads data\chroma_db data\documents 2>nul

cd ..

:: ── Frontend Setup ─────────────────────────────────────────
echo [5/5] Setting up React frontend...
cd frontend
if not exist .env (
    copy .env.example .env
)
call npm install
cd ..

echo.
echo ============================================================
echo   Setup complete!
echo.
echo   NEXT STEPS:
echo   1. Edit backend\.env with your API keys:
echo      - GEMINI_API_KEY  (from https://aistudio.google.com)
echo      - COHERE_API_KEY  (from https://cohere.com)
echo      - SECRET_KEY      (any random secret string)
echo.
echo   2. Start the backend:
echo      cd backend ^& venv\Scripts\activate ^& uvicorn main:app --reload
echo.
echo   3. Start the frontend (new terminal):
echo      cd frontend ^& npm start
echo.
echo   4. Open http://localhost:3000 in your browser
echo ============================================================
pause
