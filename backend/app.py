# $env:MESHY_API_KEY="msy_abc123REALKEYxyz"
# python app.py

from dotenv import load_dotenv
load_dotenv()
import os
import io
import sys
import base64
import requests
from datetime import datetime

print("PYTHON:", sys.executable)
# print("API KEY:", MESHY_API_KEY[:10])

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

with app.app_context():
    db.create_all()

MESHY_API_KEY = os.getenv("MESHY_API_KEY")
print("MESHY_API_KEY loaded:", bool(MESHY_API_KEY))
print("MESHY_API_KEY preview:", MESHY_API_KEY[:10] + "..." if MESHY_API_KEY else "None")
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


# ================== IMAGES ==================
@app.route("/api/images/<int:image_id>")
def get_image(image_id):
    image = Image.query.get_or_404(image_id)

    mime_type = image.mime_type or "image/jpeg"

    return send_file(
        io.BytesIO(image.image_data),
        mimetype=mime_type,
        as_attachment=False
    )


@app.route("/api/images/latest/<int:collection_id>")
def get_latest_image(collection_id):
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


# ================== AI ==================
@app.route("/api/ai-analysis/<int:collection_id>")
def get_ai_analysis(collection_id):
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


# ================== DETECTIONS ==================
@app.route("/api/detections")
def list_detections():
    detections = Detection.query.order_by(
        Detection.detected_at.desc()
    ).all()

    results = []

    for d in detections:
        if not d.lat_long:
            continue

        try:
            lat, lng = map(float, d.lat_long.split(","))
        except ValueError:
            continue

        results.append({
            "id": d.detection_id,
            "label": d.label,
            "lat": lat,
            "lng": lng,
            "detected_at": d.detected_at.isoformat()
            if d.detected_at else None
        })

    return jsonify(results)


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

        model = Model3D(
            detection_id=getattr(image, "detection_id", None),
            image_id=image.image_id,
            meshy_task_id=task_id,
            status="PENDING",
            progress=0
        )

        db.session.add(model)
        db.session.commit()

        return jsonify({
            "model_id": model.model_id,
            "task_id": task_id
        })

    except Exception as e:
        print("GENERATE_3D ERROR:", e)
        return jsonify({"error": str(e)}), 500

# 🔹 CHECK STATUS
@app.route("/api/models3d/check/<int:model_id>")
def check_model(model_id):
    model = Model3D.query.get_or_404(model_id)

    response = requests.get(
        f"{MESHY_BASE_URL}/image-to-3d/{model.meshy_task_id}",
        headers={"Authorization": f"Bearer {MESHY_API_KEY}"}
    )

    response.raise_for_status()
    data = response.json()

    status = data["status"]

    model.status = status
    model.progress = data.get("progress", 0)

    if status == "SUCCEEDED":
        model.glb_url = data["model_urls"]["glb"]
        model.generated_at = datetime.utcnow()

    elif status == "FAILED":
        model.error_message = "Meshy failed"

    db.session.commit()

    return jsonify({
        "status": model.status,
        "progress": model.progress,
        "glb_url": model.glb_url
    })


# 🔹 GET MODEL
@app.route("/api/models3d/by-image/<int:image_id>")
def get_model_by_image(image_id):
    model = (
        Model3D.query
        .filter_by(image_id=image_id, status="SUCCEEDED")
        .order_by(Model3D.generated_at.desc())
        .first()
    )

    if not model:
        return jsonify({"exists": False})

    return jsonify({
        "exists": True,
        "model_id": model.model_id,
        "glb_url": model.glb_url,
        "viewer_url": f"http://127.0.0.1:8000/api/models3d/file/{model.model_id}"
    })

@app.route("/api/models3d/file/<int:model_id>")
def get_model_file(model_id):
    try:
        model = Model3D.query.get_or_404(model_id)

        if not model.glb_url:
            return jsonify({"error": "No GLB URL found for this model"}), 404

        response = requests.get(model.glb_url, stream=True, timeout=120)
        response.raise_for_status()

        return send_file(
            io.BytesIO(response.content),
            mimetype="model/gltf-binary",
            as_attachment=False,
            download_name=f"model_{model_id}.glb"
        )

    except Exception as e:
        print("GET_MODEL_FILE ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)