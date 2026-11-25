"""
Shared Gemini API helper with automatic model fallback, safe multi-part text
extraction, and fast failure handling (no 120s retry stalls).
"""
from typing import List, Optional, Any
import google.generativeai as genai
from google.api_core.exceptions import (
    TooManyRequests,
    ResourceExhausted,
    ServiceUnavailable,
    NotFound,
    DeadlineExceeded,
)

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY, transport="rest")

CHAT_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

VISION_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

AUDIO_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
]


class AIQuotaError(Exception):
    """Raised when all fallback models have hit rate or daily quota limits."""


def extract_response_text(response: Any) -> str:
    """Extract all non-thought text parts from a Gemini response safely."""
    candidates = getattr(response, "candidates", None) or []
    if candidates:
        content = getattr(candidates[0], "content", None)
        parts = getattr(content, "parts", None) or []
        chunks = [
            getattr(part, "text", "")
            for part in parts
            if getattr(part, "text", "") and not getattr(part, "thought", False)
        ]
        if chunks:
            return "".join(chunks).strip()
    try:
        return (response.text or "").strip()
    except Exception:
        return ""


def generate_with_fallback(
    models: List[str],
    contents: Any,
    generation_config: dict,
    timeout: int = 30,
    history: Optional[List[dict]] = None,
) -> str:
    """
    Call Gemini across fallback models using REST transport with retries disabled
    so 429/503/404 errors immediately fail over to the next available model.
    """
    last_error = None
    saw_quota_error = False

    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name)
            req_opts = {"timeout": timeout, "retry": None}
            if history:
                chat_session = model.start_chat(history=history)
                response = chat_session.send_message(
                    contents,
                    generation_config=generation_config,
                    request_options=req_opts,
                )
            else:
                response = model.generate_content(
                    contents,
                    generation_config=generation_config,
                    request_options=req_opts,
                )
            text = extract_response_text(response)
            if text:
                return text
        except (TooManyRequests, ResourceExhausted) as e:
            saw_quota_error = True
            last_error = e
            print(f"[Gemini] {model_name} quota/rate limited (429), trying fallback...")
            continue
        except (ServiceUnavailable, NotFound, DeadlineExceeded) as e:
            last_error = e
            print(f"[Gemini] {model_name} unavailable ({type(e).__name__}), trying fallback...")
            continue
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower():
                saw_quota_error = True
            if any(k in err_str.lower() for k in ("429", "503", "404", "timed out", "timeout")):
                print(f"[Gemini] {model_name} error ({type(e).__name__}), trying fallback...")
                continue
            raise

    if saw_quota_error:
        raise AIQuotaError(
            "AI quota limit reached on free-tier models. Please wait a minute and try again, or update your Gemini API key."
        )
    raise RuntimeError(f"All AI models failed: {last_error}")
