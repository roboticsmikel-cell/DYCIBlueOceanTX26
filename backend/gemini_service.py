import os
import io
import json
import re
import google.generativeai as genai
from PIL import Image as PILImage
from models import Artifact

gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY is not set")

genai.configure(api_key=gemini_api_key)

SYSTEM_PROMPT = """
You are JARVIS, an archaeology AI assistant.

Rules:
- Answer in 1 to 2 sentences only
- Be direct and factual
- Speak clearly and professionally
- Do NOT use markdown
- Do NOT introduce yourself unless asked
- If unsure, say so briefly
""".strip()


def clean_json_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def chat_with_gemini(user_message, artifact_context=None):
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = SYSTEM_PROMPT

    if artifact_context:
        prompt += f"""

Artifact Context:
Name: {artifact_context.get("title", "")}
Category: {artifact_context.get("category", "")}
Description: {artifact_context.get("context", "")}
"""

    prompt += f"""

User: {user_message}
Assistant:
"""

    response = model.generate_content(prompt)

    return {
        "type": "chat",
        "speech": response.text.strip()
    }


def run_gemini_for_artifact(image_bytes, collection_id):
    artifact = Artifact.query.get_or_404(collection_id)
    image = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")

    vision_model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
You are an archaeology AI assistant.

Analyze the artifact image and return ONLY valid JSON.
Do not include markdown.
Do not include explanation text.
Do not wrap the JSON in triple backticks.

Return this exact structure:

{{
  "material": "",
  "category": "",
  "estimated_age": "",
  "possible_location": "",
  "preservation_condition": ""
}}

Artifact metadata:
Name: {artifact.collection_title}
Category: {artifact.collection_category}
Context: {artifact.collection_info}
""".strip()

    try:
        response = vision_model.generate_content([prompt, image])

        raw_text = (response.text or "").strip()
        if not raw_text:
            print("Gemini vision error: empty response")
            return None

        cleaned_text = clean_json_text(raw_text)
        parsed = json.loads(cleaned_text)

        return {
            "material": parsed.get("material", "Unknown"),
            "category": parsed.get("category", "Unknown"),
            "estimated_age": parsed.get("estimated_age", "Unknown"),
            "possible_location": parsed.get("possible_location", "Unknown"),
            "preservation_condition": parsed.get("preservation_condition", "Unknown")
        }

    except Exception as e:
        print("Gemini vision error:", e)
        try:
            print("Raw response:", response.text)
        except Exception:
            pass
        return None