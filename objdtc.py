from flask import Flask, Response, render_template, jsonify
from flask_cors import CORS
from picamera2 import Picamera2
from ultralytics import YOLO
import cv2
import os
import time
import threading
import atexit
import psycopg2
from datetime import datetime
import subprocess
import queue

app = Flask(__name__)
CORS(app)

# =========================
# CONFIG
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAPTURE_DIR = os.path.join(BASE_DIR, "captures")
VIDEO_DIR = os.path.join(BASE_DIR, "videos")
os.makedirs(CAPTURE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

RENDER_DB = {
    "host": "dpg-d7b0c5ogjchc73a31sd0-a.singapore-postgres.render.com",
    "database": "dycibo_db",
    "user": "dycibo_db_user",
    "password": "OInqhbqO3ugKIvOBW2TuGPOzBm6MdVMI",
    "port": 5432,
    "sslmode": "require",
}

# Change only this line to switch marker location
LOC_VAL = "IMUS"

LOCATIONS = {
    "BOCAUE": "14.8012725,120.9207805",
    "IMUS": "14.3852799,120.964818",
    "TEXAS": "29.7521028,-95.3583469",
}

DEFAULT_LAT_LONG = LOCATIONS.get(LOC_VAL, "14.5995,120.9842")

# FIXED: do not force invalid artifact foreign key
DEFAULT_COLLECTION_ID = None

CONFIDENCE_THRESHOLD = 0.35

FRAME_WIDTH = 480
FRAME_HEIGHT = 360
FPS = 20.0

ROI = (96, 72, 384, 288)  # x1, y1, x2, y2

DETECTION_INPUT_SIZE = 160
DETECTION_INTERVAL = 1.0

STABLE_DETECTION_SECONDS = 1.5
SAVE_COOLDOWN = 8

MAX_SAVE_QUEUE_SIZE = 10

# =========================
# LOAD YOLO MODELS
# =========================
models = {
    "object": [
        YOLO(os.path.join(BASE_DIR, "finale.pt"))
    ],
    "translate": [
        YOLO(os.path.join(BASE_DIR, "hiero.pt")),
        YOLO(os.path.join(BASE_DIR, "baybayin.pt"))
    ],
}

# =========================
# GLOBAL STATE
# =========================
index_frame = None
website_frame = None
raw_frame = None
latest_detections = []

frame_lock = threading.Lock()
video_lock = threading.Lock()
detection_lock = threading.Lock()

running = True
mode = "normal"
active_ai_mode = "object"
detection_enabled = True

last_saved_label = None
last_saved_time = 0
last_detection_time = 0

stable_label = None
stable_since = 0

recording = False
video_writer = None
current_video_path = None

save_queue = queue.Queue(maxsize=MAX_SAVE_QUEUE_SIZE)
save_worker_running = True

# =========================
# CAMERA SETUP
# =========================
picam2 = Picamera2()
config = picam2.create_preview_configuration(
    main={"size": (FRAME_WIDTH, FRAME_HEIGHT), "format": "BGR888"}
)
picam2.configure(config)
picam2.start()

print(f"ACTIVE LOCATION: {LOC_VAL} -> {DEFAULT_LAT_LONG}")

# =========================
# DATABASE HELPERS
# =========================
def get_render_conn():
    return psycopg2.connect(
        host=RENDER_DB["host"],
        database=RENDER_DB["database"],
        user=RENDER_DB["user"],
        password=RENDER_DB["password"],
        port=RENDER_DB["port"],
        sslmode=RENDER_DB["sslmode"],
    )


def save_detection_to_render(label, lat_long, confidence):
    conn = None
    cur = None
    try:
        conn = get_render_conn()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO detections (label, lat_long, confidence, detected_at)
            VALUES (%s, %s, %s, %s)
            RETURNING detection_id
        """, (label, lat_long, confidence, datetime.utcnow()))

        detection_id = cur.fetchone()[0]
        conn.commit()
        return detection_id

    except Exception as e:
        if conn:
            conn.rollback()
        print("SAVE_DETECTION_TO_RENDER ERROR:", e)
        return None

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def save_image_to_render(frame, collection_id=None, detection_id=None, image_name="capture.jpg"):
    conn = None
    cur = None
    try:
        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            print("Failed to encode image")
            return None

        image_bytes = buffer.tobytes()

        conn = get_render_conn()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO images (collection_id, detection_id, image_data, image_name, mime_type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING image_id
        """, (
            collection_id,
            detection_id,
            psycopg2.Binary(image_bytes),
            image_name,
            "image/jpeg"
        ))

        image_id = cur.fetchone()[0]
        conn.commit()
        return image_id

    except Exception as e:
        if conn:
            conn.rollback()
        print("SAVE_IMAGE_TO_RENDER ERROR:", e)
        return None

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def save_video_to_render(video_path, collection_id=DEFAULT_COLLECTION_ID, video_name=None):
    conn = None
    cur = None
    try:
        if not os.path.exists(video_path):
            print("Video file does not exist:", video_path)
            return None

        with open(video_path, "rb") as f:
            video_bytes = f.read()

        if video_name is None:
            video_name = os.path.basename(video_path)

        conn = get_render_conn()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO videos (collection_id, video_data, video_name, mime_type)
            VALUES (%s, %s, %s, %s)
            RETURNING video_id
        """, (
            collection_id,
            psycopg2.Binary(video_bytes),
            video_name,
            "video/mp4"
        ))

        video_id = cur.fetchone()[0]
        conn.commit()
        return video_id

    except Exception as e:
        if conn:
            conn.rollback()
        print("SAVE_VIDEO_TO_RENDER ERROR:", e)
        return None

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def save_detection_and_image(frame, label="Detected Object",
                             lat_long=DEFAULT_LAT_LONG,
                             confidence=None,
                             collection_id=None,
                             image_name="capture.jpg"):
    try:
        detection_id = save_detection_to_render(label, lat_long, confidence)
        if not detection_id:
            return {"error": "Failed to save detection to Render"}

        image_id = save_image_to_render(
            frame=frame,
            collection_id=collection_id,
            detection_id=detection_id,
            image_name=image_name
        )
        if not image_id:
            return {"error": "Detection saved but image failed to save"}

        return {
            "message": "Detection and image saved to Render successfully",
            "detection_id": detection_id,
            "image_id": image_id
        }

    except Exception as e:
        print("SAVE_DETECTION_AND_IMAGE ERROR:", e)
        return {"error": str(e)}


def save_frame_to_disk(frame, prefix="snap"):
    try:
        ts = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{ts}.jpg"
        filepath = os.path.join(CAPTURE_DIR, filename)

        ok = cv2.imwrite(filepath, frame)
        if not ok:
            return None

        return {
            "filename": filename,
            "filepath": filepath
        }

    except Exception as e:
        print("SAVE_FRAME_TO_DISK ERROR:", e)
        return None


def convert_avi_to_mp4(avi_path):
    try:
        if not os.path.exists(avi_path):
            return None

        mp4_path = avi_path.rsplit(".", 1)[0] + ".mp4"

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", avi_path,
                "-vcodec", "libx264",
                "-pix_fmt", "yuv420p",
                mp4_path
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )

        return mp4_path

    except Exception as e:
        print("CONVERT_AVI_TO_MP4 ERROR:", e)
        return None

# =========================
# BACKGROUND SAVE QUEUE
# =========================
def enqueue_detection_save(frame, label, confidence):
    if frame is None or not label:
        return False

    try:
        job = {
            "frame": frame.copy(),
            "label": label,
            "confidence": confidence,
            "lat_long": DEFAULT_LAT_LONG,
            "collection_id": None,
            "image_name": f"{label}_{int(time.time())}.jpg"
        }
        save_queue.put_nowait(job)
        print(f"QUEUED SAVE: {label}")
        return True
    except queue.Full:
        print("SAVE QUEUE FULL: skipping save job")
        return False
    except Exception as e:
        print("ENQUEUE SAVE ERROR:", e)
        return False


def save_worker():
    global save_worker_running

    while save_worker_running:
        try:
            try:
                job = save_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            if job is None:
                save_queue.task_done()
                continue

            print(f"SAVE WORKER: saving {job['label']}")
            result = save_detection_and_image(
                frame=job["frame"],
                label=job["label"],
                lat_long=job["lat_long"],
                confidence=job["confidence"],
                collection_id=job["collection_id"],
                image_name=job["image_name"]
            )
            print("SAVE WORKER RESULT:", result)

            save_queue.task_done()

        except Exception as e:
            print("SAVE WORKER ERROR:", e)

# =========================
# DETECTION HELPERS
# =========================
def detect_all_models_roi(frame, roi):
    detections = []

    x1_roi, y1_roi, x2_roi, y2_roi = roi
    roi_frame = frame[y1_roi:y2_roi, x1_roi:x2_roi]

    if roi_frame is None or roi_frame.size == 0:
        return detections

    roi_h, roi_w = roi_frame.shape[:2]
    resized = cv2.resize(roi_frame, (DETECTION_INPUT_SIZE, DETECTION_INPUT_SIZE))

    scale_x = roi_w / float(DETECTION_INPUT_SIZE)
    scale_y = roi_h / float(DETECTION_INPUT_SIZE)

    print("ACTIVE AI MODE:", active_ai_mode)
    
    for model in models.get(active_ai_mode, models["object"]):
        try:
            results = model(resized, verbose=False)
            boxes = results[0].boxes

            if boxes is None or len(boxes) == 0:
                continue

            for box in boxes:
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])

                if conf < CONFIDENCE_THRESHOLD:
                    continue

                bx1, by1, bx2, by2 = [int(v) for v in box.xyxy[0]]
                label = model.names.get(cls_id, str(cls_id))

                full_x1 = int(bx1 * scale_x) + x1_roi
                full_y1 = int(by1 * scale_y) + y1_roi
                full_x2 = int(bx2 * scale_x) + x1_roi
                full_y2 = int(by2 * scale_y) + y1_roi

                detections.append({
                    "label": label,
                    "conf": conf,
                    "x1": full_x1,
                    "y1": full_y1,
                    "x2": full_x2,
                    "y2": full_y2,
                })

        except Exception as e:
            print("DETECT_ALL_MODELS_ROI ERROR:", e)

    return detections


def draw_detection(frame, det, color=(0, 255, 0)):
    x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
    label = det["label"]
    conf = det["conf"]

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)

    text = f"{label} ({conf:.2f})"
    text_x = max(10, x1)
    text_y = max(25, y1 - 10)

    cv2.putText(
        frame,
        text,
        (text_x, text_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        color,
        1,
        cv2.LINE_AA
    )

# =========================
# VIDEO RECORDING LOOP
# =========================
def video_record_loop():
    global recording, video_writer

    while recording:
        try:
            with frame_lock:
                frame = None if raw_frame is None else raw_frame.copy()

            if frame is not None and video_writer is not None:
                video_writer.write(frame)

        except Exception as e:
            print("VIDEO_RECORD_LOOP ERROR:", e)

        time.sleep(1.0 / FPS)

# =========================
# CAMERA LOOP
# =========================
def camera_loop():
    global index_frame, website_frame, raw_frame
    global last_saved_label, last_saved_time, last_detection_time, latest_detections
    global stable_label, stable_since

    while running:
        try:
            frame = picam2.capture_array()

            if frame is None:
                time.sleep(0.03)
                continue

            # Keep/remove this conversion depending on the color that looks correct on your setup
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            with frame_lock:
                raw_frame = frame.copy()

            display_for_index = frame.copy()
            display_for_website = frame.copy()

            now_detect = time.time()

            if now_detect - last_detection_time >= DETECTION_INTERVAL:
                dets = detect_all_models_roi(frame, ROI)
                with detection_lock:
                    latest_detections = dets
                last_detection_time = now_detect
            else:
                with detection_lock:
                    dets = list(latest_detections)

            best_det = None

            for det in dets:
                draw_detection(display_for_index, det, color=(0, 255, 0))
                draw_detection(display_for_website, det, color=(0, 255, 0))

                if best_det is None or det["conf"] > best_det["conf"]:
                    best_det = det

            rx1, ry1, rx2, ry2 = ROI
            cv2.rectangle(display_for_index, (rx1, ry1), (rx2, ry2), (0, 0, 255), 1)
            cv2.rectangle(display_for_website, (rx1, ry1), (rx2, ry2), (0, 0, 255), 1)

            # Auto-save disabled.
            # Detection still runs and displays boxes, but images are saved only when SNAP is pressed.
            stable_label = None
            stable_since = 0


            if mode == "gray":
                gray_index = cv2.cvtColor(display_for_index, cv2.COLOR_BGR2GRAY)
                display_for_index = cv2.cvtColor(gray_index, cv2.COLOR_GRAY2BGR)

                gray_website = cv2.cvtColor(display_for_website, cv2.COLOR_BGR2GRAY)
                display_for_website = cv2.cvtColor(gray_website, cv2.COLOR_GRAY2BGR)

            elif mode == "edge":
                edge_index = cv2.Canny(display_for_index, 100, 200)
                display_for_index = cv2.cvtColor(edge_index, cv2.COLOR_GRAY2BGR)

                edge_website = cv2.Canny(display_for_website, 100, 200)
                display_for_website = cv2.cvtColor(edge_website, cv2.COLOR_GRAY2BGR)

            with frame_lock:
                index_frame = display_for_index.copy()
                website_frame = display_for_website.copy()

        except Exception as e:
            print("CAMERA LOOP ERROR:", e)

        time.sleep(0.01)

# Start background threads
threading.Thread(target=camera_loop, daemon=True).start()
threading.Thread(target=save_worker, daemon=True).start()

# =========================
# STREAM GENERATORS
# =========================
def generate_index_frames():
    while True:
        with frame_lock:
            if index_frame is None:
                time.sleep(0.05)
                continue
            frame = index_frame.copy()

        ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        if not ret:
            time.sleep(0.05)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() +
            b"\r\n"
        )

        time.sleep(0.05)


def generate_website_frames():
    while True:
        with frame_lock:
            if website_frame is None:
                time.sleep(0.05)
                continue
            frame = website_frame.copy()

        ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        if not ret:
            time.sleep(0.05)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() +
            b"\r\n"
        )

        time.sleep(0.05)

# =========================
# ROUTES
# =========================
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/website")
def web():
    return render_template("website.html")


@app.route("/video_index")
def video_index():
    return Response(
        generate_index_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/video_website")
def video_website():
    return Response(
        generate_website_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/capture", methods=["POST"])
def capture():
    try:
        with frame_lock:
            if raw_frame is None:
                return jsonify({"status": "no_frame"})
            frame = raw_frame.copy()

        saved = save_frame_to_disk(frame, prefix="snap")
        if not saved:
            return jsonify({"status": "error", "message": "Local save failed"})

        db_result = save_detection_and_image(
            frame=frame,
            label="snapshot",
            lat_long=DEFAULT_LAT_LONG,
            confidence=None,
            collection_id=None,
            image_name=saved["filename"]
        )

        print("CAPTURE DB RESULT:", db_result)

        if not db_result or "error" in db_result:
            return jsonify({
                "status": "error",
                "message": db_result.get("error", "Database save failed")
            })

        return jsonify({
            "status": "ok",
            "local_file": saved["filename"],
            "detection_id": db_result.get("detection_id"),
            "image_id": db_result.get("image_id")
        })

    except Exception as e:
        print("CAPTURE ERROR:", e)
        return jsonify({"status": "error", "message": str(e)})


@app.route("/start_video", methods=["POST"])
def start_video():
    global recording, video_writer, current_video_path

    with video_lock:
        if recording:
            return jsonify({"status": "already_recording"})

        ts = time.strftime("%Y%m%d_%H%M%S")
        avi_name = f"video_{ts}.avi"
        current_video_path = os.path.join(VIDEO_DIR, avi_name)

        video_writer = cv2.VideoWriter(
            current_video_path,
            cv2.VideoWriter_fourcc(*"XVID"),
            FPS,
            (FRAME_WIDTH, FRAME_HEIGHT)
        )

        if not video_writer.isOpened():
            video_writer = None
            current_video_path = None
            return jsonify({"status": "error", "message": "Failed to start video writer"})

        recording = True
        threading.Thread(target=video_record_loop, daemon=True).start()

    return jsonify({"status": "started"})


@app.route("/stop_video", methods=["POST"])
def stop_video():
    global recording, video_writer, current_video_path

    with video_lock:
        if not recording:
            return jsonify({"status": "not_recording"})

        recording = False

    time.sleep(0.3)

    with video_lock:
        if video_writer is not None:
            video_writer.release()
            video_writer = None

        avi_path = current_video_path
        current_video_path = None

    if not avi_path or not os.path.exists(avi_path):
        return jsonify({"status": "error", "message": "Recorded file not found"})

    mp4_path = convert_avi_to_mp4(avi_path)
    if mp4_path is None or not os.path.exists(mp4_path):
        return jsonify({"status": "error", "message": "Failed to convert video to mp4"})

    video_id = save_video_to_render(
        video_path=mp4_path,
        collection_id=None,
        video_name=os.path.basename(mp4_path)
    )

    if video_id is None:
        return jsonify({"status": "error", "message": "Video saved locally but failed in database"})

    try:
        if os.path.exists(avi_path):
            os.remove(avi_path)
    except Exception as e:
        print("DELETE AVI ERROR:", e)

    return jsonify({
        "status": "saved",
        "video_id": video_id,
        "filename": os.path.basename(mp4_path)
    })

@app.route("/set_ai_mode/<mode_name>", methods=["POST"])
def set_ai_mode(mode_name):
    global active_ai_mode

    if mode_name not in ["object", "translate"]:
        return jsonify({
            "status": "error",
            "message": "Invalid mode"
        }), 400

    active_ai_mode = mode_name

    return jsonify({
        "status": "ok",
        "mode": active_ai_mode
    })

@app.route("/current_ai_mode")
def current_ai_mode():
    return jsonify({
        "mode": active_ai_mode
    })

@app.route("/status")
def status():
    return jsonify({
        "running": running,
        "mode": mode,
        "active_ai_mode": active_ai_mode,
        "detection_enabled": detection_enabled,
        "recording": recording,
        "roi": ROI,
        "stable_label": stable_label,
        "last_saved_label": last_saved_label,
        "save_queue_size": save_queue.qsize(),
        "location_name": LOC_VAL,
        "lat_long": DEFAULT_LAT_LONG
    })

@app.route("/image/<int:image_id>")
def get_image(image_id):
    conn = None
    cur = None
    try:
        conn = get_render_conn()
        cur = conn.cursor()

        cur.execute("""
            SELECT image_data, mime_type, image_name
            FROM images
            WHERE image_id = %s
        """, (image_id,))

        row = cur.fetchone()
        if not row:
            return "Image not found", 404

        image_data, mime_type, image_name = row
        if image_data is None:
            return "No image data found", 404

        image_bytes = bytes(image_data)

        return Response(
            image_bytes,
            mimetype=mime_type if mime_type else "image/jpeg",
            headers={
                "Content-Disposition": f'inline; filename="{image_name or "image.jpg"}"'
            }
        )

    except Exception as e:
        print("GET IMAGE ERROR:", e)
        return f"Error: {str(e)}", 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/latest_image")
def latest_image():
    conn = None
    cur = None
    try:
        conn = get_render_conn()
        cur = conn.cursor()

        cur.execute("""
            SELECT image_data, mime_type, image_name
            FROM images
            ORDER BY image_id DESC
            LIMIT 1
        """)

        row = cur.fetchone()
        if not row:
            return "No image found", 404

        image_data, mime_type, image_name = row
        image_bytes = bytes(image_data)

        return Response(
            image_bytes,
            mimetype=mime_type or "image/jpeg",
            headers={
                "Content-Disposition": f'inline; filename="{image_name or "latest.jpg"}"',
                "Cache-Control": "no-store"
            }
        )

    except Exception as e:
        print("LATEST IMAGE ERROR:", e)
        return f"Error: {str(e)}", 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# =========================
# CLEANUP
# =========================
def cleanup():
    global running, recording, video_writer, save_worker_running
    running = False
    recording = False
    save_worker_running = False

    try:
        if video_writer is not None:
            video_writer.release()
    except Exception:
        pass

    try:
        save_queue.put_nowait(None)
    except Exception:
        pass

    try:
        picam2.stop()
    except Exception:
        pass

atexit.register(cleanup)

# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)


