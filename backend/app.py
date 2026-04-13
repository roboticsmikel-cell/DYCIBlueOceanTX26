from dotenv import load_dotenv
load_dotenv()

import os
import io
import sys
import base64
import requests
from datetime import datetime

print("PYTHON:", sys.executable)

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

import config
from models import (
    db,
    Artifact,
    Image,
    AIArtifactAnalysis,
    AIConversation,
    Detection,
    Model3D
)
from gemini_service import chat_with_gemini, run_gemini_for_artifact

# ================== CONFIG ==================
app = Flask(__name__)
app.config.from_object(config)

CORS(app)
db.init_app(app)

MESHY_API_KEY = os.getenv("MESHY_API_KEY")
print("MESHY_API_KEY loaded:", bool(MESHY_API_KEY))

BASE_URL = os.getenv("BASE_URL", "https://dyciblueoceantx26.onrender.com")
MESHY_BASE_URL = "https://api.meshy.ai/openapi/v1"


# ================== BASIC ==================
@app.route("/")
def index():
    return {"status": "Backend running"}


# ================== ARTIFACTS ==================
@app.route("/api/artifacts/<int:collection_id>")
def get_artifact(collection_id):
    artifact = Artifact.query.get_or_404(collection_id)

    return jsonify({
        "locationName": artifact.location_name,
        "collectionTitle": artifact.collection_title,
        "period": artifact.period,
        "dateRange": artifact.date_range,
        "category": artifact.collection_category,
        "museum": artifact.collection_museum,
        "context": artifact.collection_info,
        "coordinates": artifact.lat_long,
    })


@app.route("/api/artifacts")
def list_artifacts():
    try:
        artifacts = Artifact.query.all()
        results = []

        for a in artifacts:
            if not a.lat_long:
                continue

            try:
                lat, lng = map(float, a.lat_long.split(","))
            except ValueError:
                continue

            results.append({
                "id": a.collection_id,
                "title": a.collection_title,
                "category": a.collection_category,
                "lat": lat,
                "lng": lng,
                "model_path": a.model_path or "models/vase.glb"
            })

        return jsonify(results)

    except Exception as e:
        print("LIST_ARTIFACTS ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/artifacts/table")
def list_artifacts_table():
    try:
        artifacts = Artifact.query.order_by(Artifact.collection_id.asc()).all()

        return jsonify([
            {
                "id": a.collection_id,
                "title": a.collection_title,
                "period": a.period,
                "date_range": a.date_range,
                "category": a.collection_category,
                "museum": a.collection_museum,
                "location": a.location_name,
            }
            for a in artifacts
        ])

    except Exception as e:
        print("LIST_ARTIFACTS_TABLE ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ================== IMAGES ==================
@app.route("/api/images/<int:image_id>")
def get_image(image_id):
    try:
        image = Image.query.get_or_404(image_id)
        mime_type = image.mime_type or "image/jpeg"

        return send_file(
            io.BytesIO(image.image_data),
            mimetype=mime_type,
            as_attachment=False
        )

    except Exception as e:
        print("GET_IMAGE ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/images/latest/<int:collection_id>")
def get_latest_image(collection_id):
    try:
        image = (
            Image.query
            .filter_by(collection_id=collection_id)
            .order_by(Image.captured_at.desc())
            .first()
        )

        if not image:
            return jsonify(None), 404

        return jsonify({
            "image_id": image.image_id,
            "image_name": image.image_name
        })

    except Exception as e:
        print("GET_LATEST_IMAGE ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ================== AI ANALYSIS ==================
@app.route("/api/ai-analysis/<int:collection_id>")
def get_ai_analysis(collection_id):
    try:
        analyses = (
            AIArtifactAnalysis.query
            .filter_by(collection_id=collection_id)
            .order_by(AIArtifactAnalysis.created_at.desc())
            .all()
        )

        return jsonify([
            {
                "material": a.material,
                "category": a.category,
                "estimated_age": a.estimated_age,
                "possible_location": a.possible_location,
                "preservation_condition": a.preservation_condition,
            }
            for a in analyses
        ])

    except Exception as e:
        print("GET_AI_ANALYSIS ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ================== ASSISTANT CHAT ==================
@app.route("/api/assistant/chat", methods=["POST"])
def assistant_chat():
    try:
        data = request.get_json() or {}
        collection_id = data.get("collection_id")
        message = (data.get("message") or "").strip()

        if not message:
            return jsonify({"error": "Message is required"}), 400

        artifact_context = None

        if collection_id:
            artifact = Artifact.query.get(collection_id)
            if artifact:
                artifact_context = {
                    "title": artifact.collection_title,
                    "category": artifact.collection_category,
                    "context": artifact.collection_info,
                }

        result = chat_with_gemini(message, artifact_context)
        reply_text = result.get("speech", "")

        if collection_id:
            try:
                db.session.add(AIConversation(
                    collection_id=collection_id,
                    role="user",
                    message=message
                ))
                db.session.add(AIConversation(
                    collection_id=collection_id,
                    role="assistant",
                    message=reply_text
                ))
                db.session.commit()
            except Exception as db_error:
                db.session.rollback()
                print("AI_CONVERSATION SAVE ERROR:", db_error)

        return jsonify({
            "reply": reply_text,
            "speech": reply_text,
            "type": result.get("type", "chat")
        })

    except Exception as e:
        print("ASSISTANT_CHAT ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ================== DETECTIONS ==================
@app.route("/api/detections")
def list_detections():
    try:
        detections = Detection.query.order_by(
            Detection.detected_at.desc()
        ).all()

        results = []

        for d in detections:
            try:
                if not d.lat_long:
                    continue

                lat, lng = map(float, d.lat_long.split(","))

                results.append({
                    "id": d.detection_id,
                    "label": d.label,
                    "lat": lat,
                    "lng": lng,
                    "detected_at": d.detected_at.isoformat() if d.detected_at else None
                })
            except Exception as row_error:
                print(f"Skipping detection {getattr(d, 'detection_id', 'unknown')}: {row_error}")
                continue

        return jsonify(results)

    except Exception as e:
        print("LIST_DETECTIONS ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ================== HELPER ==================
def refresh_meshy_glb_url(model: Model3D):
    """
    Ask Meshy for the latest task status and refresh the GLB URL.
    Returns the refreshed URL or None.
    """
    response = requests.get(
        f"{MESHY_BASE_URL}/image-to-3d/{model.meshy_task_id}",
        headers={"Authorization": f"Bearer {MESHY_API_KEY}"},
        timeout=120
    )
    response.raise_for_status()

    data = response.json()

    model.status = data.get("status", model.status)
    model.progress = data.get("progress", model.progress)

    refreshed_glb_url = data.get("model_urls", {}).get("glb")
    if refreshed_glb_url:
        model.glb_url = refreshed_glb_url
        model.generated_at = datetime.utcnow()

    return refreshed_glb_url


# ================== MESHY 3D ==================
@app.route("/api/models3d/generate/<int:image_id>", methods=["POST"])
def generate_3d(image_id):
    try:
        image = Image.query.get_or_404(image_id)

        if not MESHY_API_KEY:
            return jsonify({"error": "MESHY_API_KEY not set"}), 500

        mime = getattr(image, "mime_type", None) or "image/jpeg"
        image_base64 = base64.b64encode(image.image_data).decode("utf-8")
        data_uri = f"data:{mime};base64,{image_base64}"

        payload = {
            "image_url": data_uri,
            "mode": "preview",
            "topology": "triangle",
            "target_polycount": 3500
        }

        response = requests.post(
            f"{MESHY_BASE_URL}/image-to-3d",
            headers={
                "Authorization": f"Bearer {MESHY_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=120
        )

        data = response.json()

        if not response.ok:
            return jsonify({
                "error": f"Meshy returned {response.status_code}",
                "details": data
            }), response.status_code

        task_id = data["result"]

        # Remove old 3D model records for this image
        old_models = Model3D.query.filter_by(image_id=image.image_id).all()
        for old_model in old_models:
            db.session.delete(old_model)
        db.session.flush()

        model = Model3D(
            detection_id=getattr(image, "detection_id", None),
            image_id=image.image_id,
            meshy_task_id=task_id,
            status="PENDING",
            progress=0,
            glb_url=None,
            error_message=None
        )

        db.session.add(model)
        db.session.commit()

        return jsonify({
            "model_id": model.model_id,
            "task_id": task_id
        })

    except Exception as e:
        db.session.rollback()
        print("GENERATE_3D ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/models3d/check/<int:model_id>")
def check_model(model_id):
    try:
        model = Model3D.query.get_or_404(model_id)

        response = requests.get(
            f"{MESHY_BASE_URL}/image-to-3d/{model.meshy_task_id}",
            headers={"Authorization": f"Bearer {MESHY_API_KEY}"},
            timeout=120
        )
        response.raise_for_status()

        data = response.json()
        status = data["status"]

        model.status = status
        model.progress = data.get("progress", 0)

        if status == "SUCCEEDED":
            model.glb_url = data.get("model_urls", {}).get("glb")
            model.generated_at = datetime.utcnow()

            if not model.glb_url:
                model.error_message = "Meshy succeeded but returned no GLB URL"
            else:
                model.error_message = None

        elif status == "FAILED":
            model.error_message = "Meshy failed"

        db.session.commit()

        return jsonify({
            "status": model.status,
            "progress": model.progress,
            "glb_url": model.glb_url,
            "viewer_url": f"{BASE_URL}/api/models3d/file/{model.model_id}" if model.glb_url else None,
            "error": model.error_message
        })

    except Exception as e:
        db.session.rollback()
        print("CHECK_MODEL ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/models3d/by-image/<int:image_id>")
def get_model_by_image(image_id):
    try:
        model = (
            Model3D.query
            .filter_by(image_id=image_id)
            .order_by(Model3D.generated_at.desc().nullslast(), Model3D.model_id.desc())
            .first()
        )

        if not model:
            return jsonify({"exists": False})

        # Only valid if generation succeeded and a GLB URL exists
        if model.status != "SUCCEEDED" or not model.glb_url:
            return jsonify({"exists": False})

        return jsonify({
            "exists": True,
            "model_id": model.model_id,
            "viewer_url": f"{BASE_URL}/api/models3d/file/{model.model_id}"
        })

    except Exception as e:
        print("GET_MODEL_BY_IMAGE ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/models3d/file/<int:model_id>")
def get_model_file(model_id):
    try:
        model = Model3D.query.get_or_404(model_id)

        if not model.meshy_task_id:
            return jsonify({"error": "No Meshy task ID found for this model"}), 404

        # Try the currently saved GLB URL first
        if model.glb_url:
            try:
                response = requests.get(model.glb_url, stream=True, timeout=120)
                response.raise_for_status()

                return send_file(
                    io.BytesIO(response.content),
                    mimetype="model/gltf-binary",
                    as_attachment=False,
                    download_name=f"model_{model_id}.glb"
                )

            except requests.HTTPError as e:
                print("Saved GLB URL failed, attempting refresh from Meshy:", e)

        # Refresh from Meshy and retry
        refreshed_glb_url = refresh_meshy_glb_url(model)
        db.session.commit()

        if not refreshed_glb_url:
            return jsonify({"error": "No refreshed GLB URL available"}), 404

        refreshed_response = requests.get(refreshed_glb_url, stream=True, timeout=120)
        refreshed_response.raise_for_status()

        return send_file(
            io.BytesIO(refreshed_response.content),
            mimetype="model/gltf-binary",
            as_attachment=False,
            download_name=f"model_{model_id}.glb"
        )

    except Exception as e:
        db.session.rollback()
        print("GET_MODEL_FILE ERROR:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)