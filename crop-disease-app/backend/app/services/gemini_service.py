"""
Gemini Vision Service — crop disease detection from images with model fallback.
"""
import json
import re

from PIL import Image

from app.services.gemini_helper import VISION_MODELS, generate_with_fallback

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "kn": "Kannada",
}

DISEASE_ANALYSIS_PROMPT = """You are an expert agricultural scientist and plant pathologist with decades of field experience.

Analyze the provided crop/plant image and give a thorough, evidence-based assessment. 

IMPORTANT GUIDELINES:
- Be honest about uncertainty. If you cannot clearly see a disease, say so.
- Never fabricate disease names or treatments.
- Recommend consulting a local agricultural expert for confirmation.
- Use only verified agronomic knowledge.

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact structure:
{{
  "crop_name": "Name of the crop/plant (or 'Unknown' if unclear)",
  "is_diseased": "yes | no | uncertain",
  "disease_name": "Name of likely disease (or 'None detected' or 'Uncertain')",
  "confidence": 0.0,
  "severity": "mild | moderate | severe | none | unknown",
  "symptoms": "Detailed description of visible symptoms",
  "causes": "Known causes of this disease",
  "prevention": "Evidence-based prevention measures",
  "management": "Recommended management and treatment steps",
  "recommendations": "Additional farmer advice and when to seek expert help",
  "disclaimer": "Always confirm diagnosis with a qualified agricultural extension officer or KVK specialist before applying treatments."
}}

Respond in {language}.
"""


class GeminiVisionService:
    async def analyze_image(self, image_path: str, language: str = "en") -> dict:
        lang_name = LANGUAGE_NAMES.get(language, "English")
        prompt = DISEASE_ANALYSIS_PROMPT.format(language=lang_name)
        raw = ""

        try:
            img = Image.open(image_path)
            raw = generate_with_fallback(
                models=VISION_MODELS,
                contents=[prompt, img],
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 4096,
                },
                timeout=35,
            )

            cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
            cleaned = re.sub(r"\s*```$", "", cleaned)

            result = json.loads(cleaned)
            result["raw_response"] = raw
            return result

        except json.JSONDecodeError:
            return {
                "crop_name": "Unknown",
                "is_diseased": "uncertain",
                "disease_name": "Could not parse AI response",
                "confidence": 0.0,
                "severity": "unknown",
                "symptoms": raw or "No response",
                "causes": "",
                "prevention": "",
                "management": "",
                "recommendations": "Please retry or consult a local agricultural expert.",
                "disclaimer": "AI analysis unavailable. Consult a KVK or agricultural extension officer.",
                "raw_response": raw,
            }
        except Exception as e:
            return {
                "crop_name": "Error",
                "is_diseased": "uncertain",
                "disease_name": "Analysis failed",
                "confidence": 0.0,
                "severity": "unknown",
                "symptoms": str(e),
                "causes": "",
                "prevention": "",
                "management": "",
                "recommendations": "Please check your image and try again.",
                "disclaimer": "An error occurred during analysis.",
                "raw_response": str(e),
                "error": str(e),
            }

    async def translate_text(self, text: str, target_language: str) -> str:
        """Translate arbitrary text to the target language using Gemini."""
        if target_language == "en":
            return text
        lang_name = LANGUAGE_NAMES.get(target_language, "English")
        try:
            prompt = f"Translate the following text to {lang_name}. Return ONLY the translated text, nothing else.\n\n{text}"
            return generate_with_fallback(
                models=VISION_MODELS,
                contents=prompt,
                generation_config={"temperature": 0.1, "max_output_tokens": 2048},
                timeout=20,
            )
        except Exception:
            return text


gemini_vision_service = GeminiVisionService()
