from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
# from . import db

db = SQLAlchemy()

class Artifact(db.Model):
    __tablename__ = "artifacts"

    collection_id = db.Column(db.Integer, primary_key=True)
    location_name = db.Column(db.String(255))
    collection_title = db.Column(db.String(255))
    period = db.Column(db.String(100))
    date_range = db.Column(db.String(100))
    collection_category = db.Column(db.String(100))
    collection_museum = db.Column(db.String(255))
    collection_info = db.Column(db.Text)
    lat_long = db.Column(db.String(100))
    model_path = db.Column(db.String)

class Image(db.Model):
    __tablename__ = "images"

    image_id = db.Column(db.Integer, primary_key=True)

    collection_id = db.Column(
        db.Integer,
        db.ForeignKey("artifacts.collection_id", ondelete="CASCADE"),
        nullable=False
    )

    detection_id = db.Column(
        db.Integer,
        db.ForeignKey("detections.detection_id", ondelete="CASCADE"),
        nullable=True
    )

    image_data = db.Column(db.LargeBinary, nullable=False)
    image_name = db.Column(db.String, nullable=True)
    mime_type = db.Column(db.String(100))

    captured_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        nullable=False
    )

    artifact = db.relationship("Artifact", backref="images")
    detection = db.relationship("Detection", backref="images")

class AIArtifactAnalysis(db.Model):
    __tablename__ = "ai_artifact_analysis"

    analysis_id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(
        db.Integer,
        db.ForeignKey("artifacts.collection_id"),
        nullable=False
    )

    material = db.Column(db.Text)
    category = db.Column(db.Text)
    estimated_age = db.Column(db.Text)
    possible_location = db.Column(db.Text)
    preservation_condition = db.Column(db.Text)
    raw_response = db.Column(db.Text)

    created_at = db.Column(db.DateTime)

class AIConversation(db.Model):
    __tablename__ = "ai_conversations"

    id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(
        db.Integer,
        db.ForeignKey("artifacts.collection_id"),
        nullable=False
    )
    role = db.Column(db.String(20))  # 'user' | 'assistant'
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Detection(db.Model):
    __tablename__ = "detections"

    detection_id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(255), nullable=False)
    lat_long = db.Column(db.String(255))
    detected_at = db.Column(db.DateTime)

class Model3D(db.Model):
    __tablename__ = "models_3d"

    model_id = db.Column(db.Integer, primary_key=True)
    detection_id = db.Column(
        db.Integer,
        db.ForeignKey("detections.detection_id", ondelete="CASCADE"),
        nullable=True
    )
    image_id = db.Column(
        db.Integer,
        db.ForeignKey("images.image_id", ondelete="CASCADE"),
        nullable=False
    )

    meshy_task_id = db.Column(db.Text)
    status = db.Column(db.String(50), default="PENDING")
    progress = db.Column(db.Integer, default=0)

    glb_url = db.Column(db.Text)
    obj_url = db.Column(db.Text)
    fbx_url = db.Column(db.Text)
    usdz_url = db.Column(db.Text)

    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    generated_at = db.Column(db.DateTime)
