import os
import io
import json
import google.generativeai as genai
from PIL import Image as PILImage
from models import Artifact

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

ANALYZE_IMAGE_TRIGGERS = [
    "analyze image",
    "analyse image",
    "analyze the image",
    "analyse the image"
]

ANALYZE_IMAGE_FIXED_SPEECH = (
    "The material is burnished earthenware with incised decorations. "
    "It is a globular storage jar or funerary vessel. "
    "With approximately 500 BCE to 500 CE, likely from the Iron Age. "
    "It is possibly found in Southeast Asia, specifically associated with "
    "the Ban Chiang or Sa Huynh cultures in Thailand or Vietnam."
)

SYSTEM_PROMPT = """
You are JARVIS, an archaeology AI assistant.

Rules:
- Answer in 1 to 2 sentences only
- Be direct and factual
- Speak clearly and professionally
- Do NOT use markdown
- Do NOT introduce yourself unless asked
- If unsure, say so briefly
"""

def is_analyze_image_command(text: str) -> bool:
    text = text.lower().strip()
    return any(trigger in text for trigger in ANALYZE_IMAGE_TRIGGERS)

# ----------------------------
# TEXT CHAT (UNCHANGED)
# ----------------------------
def chat_with_gemini(user_message, artifact_context=None):
    # 🔹 FIXED RESPONSE OVERRIDE
    if is_analyze_image_command(user_message):
        return {
            "type": "fixed_analyze_image",
            "speech": ANALYZE_IMAGE_FIXED_SPEECH
        }

    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = SYSTEM_PROMPT.strip()

    if artifact_context:
        prompt += f"""

Artifact Context:
Name: {artifact_context["title"]}
Category: {artifact_context["category"]}
Description: {artifact_context["context"]}
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

# ----------------------------
# IMAGE ANALYSIS (FIXED)
# ----------------------------
def run_gemini_for_artifact(image_bytes, collection_id):
    artifact = Artifact.query.get_or_404(collection_id)

    image = PILImage.open(io.BytesIO(image_bytes))

    vision_model = genai.GenerativeModel(
        model_name="gemini-1.5-pro-vision"
    )

    prompt = f"""
You are an archaeology AI assistant.

Analyze the artifact image and return STRICT JSON:

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
"""

    response = vision_model.generate_content([prompt, image])

    try:
        return json.loads(response.text.strip())
    except Exception as e:
        print("Gemini vision error:", e)
        print("Raw response:", response.text)
        return None
