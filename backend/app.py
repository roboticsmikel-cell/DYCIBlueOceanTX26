import os
import io

import sys
print("PYTHON:", sys.executable)

from flask import Flask, jsonify, request, abort, send_file
from flask_cors import CORS

import config
from models import db, Artifact, Image, AIArtifactAnalysis, AIConversation, Detection
from gemini_service import chat_with_gemini, run_gemini_for_artifact

app = Flask(__name__)
app.config.from_object(config)

CORS(app)
db.init_app(app)

@app.route("/")
def index():
    return {"status": "Backend running"}

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
            # "model_path": a.model_path
        })

    return jsonify(results)

@app.route("/api/images/<int:image_id>")
def get_image(image_id):
    image = Image.query.get_or_404(image_id)

    mime_type = "image/jpeg"
    if image.image_name and image.image_name.lower().endswith(".png"):
        mime_type = "image/png"

    return send_file(
        io.BytesIO(image.image_data),
        mimetype=mime_type,
        as_attachment=False
    )

@app.route("/api/artifacts/table")
def artifacts_table():
    artifacts = Artifact.query.order_by(Artifact.collection_id).all()

    return jsonify([
        {
            "id": a.collection_id,
            "location": a.location_name,
            "title": a.collection_title,
            "period": a.period,
            "date_range": a.date_range,
            "category": a.collection_category,
            "museum": a.collection_museum,
            "context": a.collection_info,
            "coordinates": a.lat_long,
        }
        for a in artifacts
    ])

@app.route("/api/images/by-artifact/<int:collection_id>")
def get_images_by_artifact(collection_id):
    images = (
        Image.query
        .filter_by(collection_id=collection_id)
        .order_by(Image.captured_at.desc())
        .all()
    )

    return jsonify([
        {
            "id": img.image_id,
            "name": img.image_name,
            "captured_at": img.captured_at.isoformat()
        }
        for img in images
    ])

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

    return jsonify({ "id": image.image_id })

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
            "analysis_id": a.analysis_id,
            "collection_id": a.collection_id,
            "material": a.material,
            "category": a.category,
            "estimated_age": a.estimated_age,
            "possible_location": a.possible_location,
            "preservation_condition": a.preservation_condition,
            "created_at": a.created_at.isoformat()
        }
        for a in analyses
    ])

@app.route("/api/assistant/chat", methods=["POST", "OPTIONS"])
def assistant_chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json()
    collection_id = data.get("collection_id")
    user_message = data.get("message")
    image_id = data.get("image_id")

    if not collection_id or not user_message:
        return jsonify({"error": "Missing data"}), 400

    artifact = Artifact.query.get(collection_id)

    artifact_context = None
    if artifact:
        artifact_context = {
            "title": artifact.collection_title,
            "category": artifact.collection_category,
            "context": artifact.collection_info
        }

    db.session.add(AIConversation(
        collection_id=collection_id,
        role="user",
        message=user_message
    ))

    result = chat_with_gemini(user_message, artifact_context)

    if result["type"] == "fixed_analyze_image" and image_id:
        image = Image.query.get_or_404(image_id)

        analysis = run_gemini_for_artifact(
            image_bytes=image.image_data,
            collection_id=collection_id
        )

        if analysis:
            db.session.add(AIArtifactAnalysis(
                collection_id=collection_id,
                material=analysis.get("material"),
                category=analysis.get("category"),
                estimated_age=analysis.get("estimated_age"),
                possible_location=analysis.get("possible_location"),
                preservation_condition=analysis.get("preservation_condition")
            ))

    assistant_text = result["speech"]

    db.session.add(AIConversation(
        collection_id=collection_id,
        role="assistant",
        message=assistant_text
    ))

    db.session.commit()

    return jsonify(result)

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
            "model_path": d.model_path or "models/jar.glb",
            "detected_at": d.detected_at.isoformat()
            if d.detected_at else None
        })

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)