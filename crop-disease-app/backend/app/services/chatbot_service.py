"""
Chatbot Service — multilingual agricultural Q&A & voice transcription powered by Gemini + RAG.
"""
import io
import struct
import wave
from typing import List, Tuple, Optional

from app.services.gemini_helper import (
    AUDIO_MODELS,
    CHAT_MODELS,
    AIQuotaError,
    generate_with_fallback,
)
from app.services.rag_service import rag_service

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "kn": "Kannada",
}

SYSTEM_PROMPT = """You are KisanMitra ("Farmer's Friend"), an intelligent, multilingual agricultural assistant.
Your purpose is to help Indian farmers with:
- Crop diseases, pests and their management
- Fertilizer and nutrient management
- Irrigation and water management
- Seed selection and sowing practices
- Post-harvest handling
- Government schemes and subsidies for farmers
- Weather-based farming advice

IMPORTANT RULES:
1. Always respond in {language}.
2. Base answers on verified agronomic knowledge. Never fabricate information.
3. When uncertain, say so and recommend consulting a KVK or agricultural extension officer.
4. Use the provided context (retrieved from verified agricultural documents) to give accurate answers.
5. Keep responses practical, clear, complete, and farmer-friendly.
6. When relevant, mention source organizations like ICAR, KVK, TNAU, UAS Bengaluru, or FAO.
7. Never recommend unregistered pesticides or unapproved agrochemicals.

Context from agricultural knowledge base:
{context}
"""


class ChatbotService:
    async def chat(
        self,
        message: str,
        language: str = "en",
        conversation_history: Optional[List[dict]] = None,
        session_id: Optional[str] = None,
    ) -> Tuple[str, List[dict]]:
        """Process a chat message and return (response_text, sources)."""
        lang_name = LANGUAGE_NAMES.get(language, "English")

        # RAG retrieval
        retrieved_docs, retrieved_meta = await rag_service.retrieve(
            message, language=language, n_results=4
        )
        context = (
            "\n\n---\n\n".join(retrieved_docs)
            if retrieved_docs
            else "No specific documents retrieved. Using general agricultural knowledge."
        )

        sources = []
        if retrieved_meta:
            seen = set()
            for meta in retrieved_meta:
                src = meta.get("source", "")
                if src and src not in seen:
                    seen.add(src)
                    sources.append({"name": src, "type": meta.get("type", "document")})

        system = SYSTEM_PROMPT.format(language=lang_name, context=context)

        history = []
        if conversation_history:
            for msg in conversation_history[-8:]:
                role = "user" if msg["role"] == "user" else "model"
                history.append({"role": role, "parts": [msg["content"]]})

        full_message = f"{system}\n\nFarmer's question: {message}"
        reply = generate_with_fallback(
            models=CHAT_MODELS,
            contents=full_message,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 4096,
            },
            timeout=35,
            history=history or None,
        )
        return reply, sources

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/webm",
        language: str = "en",
    ) -> str:
        """Transcribe a farmer's voice recording into text using Gemini."""
        lang_name = LANGUAGE_NAMES.get(language, "English")
        clean_mime = mime_type.split(";")[0].strip().lower() or "audio/webm"

        # Fast silence check for uncompressed WAV audio
        if clean_mime in {"audio/wav", "audio/x-wav", "audio/wave"}:
            try:
                with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                    frames = wf.readframes(wf.getnframes())
                    if wf.getsampwidth() == 2 and len(frames) >= 2:
                        samples = struct.unpack(f"<{len(frames) // 2}h", frames)
                        if max((abs(s) for s in samples), default=0) < 150:
                            return ""
            except Exception:
                pass

        prompt = (
            f"Listen to this audio clip. The user's interface language is {lang_name}. "
            f"Transcribe ONLY the exact human speech you clearly hear, verbatim, in the language spoken "
            f"(using native script for Hindi, Telugu, Kannada, or English). "
            f"Do NOT invent, guess, or fabricate words or questions if there is no clear speech. "
            f"Return ONLY the plain transcribed words, or return exactly NO_SPEECH if the audio is silent or unintelligible."
        )
        transcript = generate_with_fallback(
            models=AUDIO_MODELS,
            contents=[prompt, {"mime_type": clean_mime, "data": audio_bytes}],
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": 512,
            },
            timeout=25,
        )
        if not transcript or "NO_SPEECH" in transcript.upper():
            return ""
        return transcript

    async def suggest_questions(self, language: str = "en") -> List[str]:
        """Return starter questions in the given language."""
        questions = {
            "en": [
                "What are the symptoms of rice blast disease?",
                "How do I control aphids on my wheat crop?",
                "What is the best fertilizer schedule for tomatoes?",
                "How much water does cotton need per week?",
                "What are the signs of nitrogen deficiency in plants?",
            ],
            "hi": [
                "चावल की ब्लास्ट बीमारी के लक्षण क्या हैं?",
                "गेहूं की फसल पर एफिड्स को कैसे नियंत्रित करें?",
                "टमाटर के लिए सबसे अच्छी उर्वरक योजना क्या है?",
                "कपास को प्रति सप्ताह कितने पानी की जरूरत है?",
                "पौधों में नाइट्रोजन की कमी के क्या लक्षण हैं?",
            ],
            "te": [
                "వరి బ్లాస్ట్ వ్యాధి యొక్క లక్షణాలు ఏమిటి?",
                "గోధుమ పంటపై తేడలను ఎలా నియంత్రించాలి?",
                "టమాటాలకు ఉత్తమ ఎరువుల షెడ్యూల్ ఏమిటి?",
                "పత్తికి వారానికి ఎంత నీరు అవసరం?",
                "మొక్కలలో నత్రజని లోపం యొక్క సంకేతాలు ఏమిటి?",
            ],
            "kn": [
                "ಭತ್ತದ ಬ್ಲಾಸ್ಟ್ ರೋಗದ ಲಕ್ಷಣಗಳು ಯಾವುವು?",
                "ಗೋಧಿ ಬೆಳೆಯಲ್ಲಿ ಗಿಡಹೇನು ಹೇಗೆ ನಿಯಂತ್ರಿಸುವುದು?",
                "ಟೊಮೆಟೊಗಳಿಗೆ ಅತ್ಯುತ್ತಮ ರಸಗೊಬ್ಬರ ವೇಳಾಪಟ್ಟಿ ಏನು?",
                "ಹತ್ತಿಗೆ ವಾರಕ್ಕೆ ಎಷ್ಟು ನೀರು ಬೇಕು?",
                "ಸಸ್ಯಗಳಲ್ಲಿ ಸಾರಜನಕದ ಕೊರತೆಯ ಲಕ್ಷಣಗಳು ಯಾವುವು?",
            ],
        }
        return questions.get(language, questions["en"])


chatbot_service = ChatbotService()
