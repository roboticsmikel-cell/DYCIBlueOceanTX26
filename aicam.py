from flask import Flask, Response, render_template, jsonify
from picamera2 import Picamera2
from ultralytics import YOLO
import cv2
import os
import time
import psycopg2
import threading
import subprocess

app = Flask(__name__)

CAPTURE_DIR = "captures"
os.makedirs(CAPTURE_DIR, exist_ok=True)

YOLO_SIZE = 320
YOLO_INTERVAL = 0.5
DUPLICATE_TIMEOUT = 5

LOC_VAL = "BOCAUE"
# LOC_VAL = "IMUS"

LOC_BOCAUE = "14.8012725,120.9207805"
LOC_IMUS   = "14.3852799,120.964818"

DB_CONFIG = {
    "database": "postgres",
    "user": "postgres",
    "password": "blueocean8",
    "host": "172.20.10.12",
    "port": 5432
}

latest_frame = None
latest_detections = []

frame_lock = threading.Lock()
yolo_lock = threading.Lock()

recording = False
video_writer = None
current_video_path = None

last_detected_labels = {}

picam2 = Picamera2()
config = picam2.create_preview_configuration(
    main={"format": "XRGB8888", "size": (640, 480)}
)
picam2.configure(config)
picam2.start()

yolo_models = [
    YOLO("baybayin.pt"),
    YOLO("hiero.pt"),
    YOLO("obj.pt"),
    YOLO("rocks.pt")
]

def get_lat_long():
    if LOC_VAL == "BOCAUE":
        return LOC_BOCAUE
    elif LOC_VAL == "IMUS":
        return LOC_IMUS
    return None

def save_detection_to_db(label, confidence):
    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO detections (label, lat_long)
                    VALUES (%s, %s)
                """, (
                    label,
                    get_lat_long()
                ))
    except Exception as e:
        print("Detection DB error:", e)


def save_image_to_db(name, path):
    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            with open(path, "rb") as f:
                cur.execute("""
                    INSERT INTO images (image_data, image_name, image_loc)
                    VALUES (%s, %s, %s)
                """, (
                    psycopg2.Binary(f.read()),
                    name,
                    get_lat_long()
                ))


def save_video_to_db(name, path):
    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            with open(path, "rb") as f:
                cur.execute("""
                    INSERT INTO videos (video_data, video_name, video_loc)
                    VALUES (%s, %s, %s)
                """, (
                    psycopg2.Binary(f.read()),
                    name,
                    get_lat_long()
                ))

def camera_loop():
    global latest_frame
    while True:
        frame = picam2.capture_array()
        frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)

        with frame_lock:
            latest_frame = frame

        time.sleep(0.01)

threading.Thread(target=camera_loop, daemon=True).start()

def yolo_loop():
    global latest_detections

    while True:
        with frame_lock:
            if latest_frame is None:
                continue
            frame = latest_frame.copy()

        small = cv2.resize(frame, (YOLO_SIZE, YOLO_SIZE))
        detections = []
        now = time.time()

        for model in yolo_models:
            results = model(
                small,
                conf=0.25,
                imgsz=YOLO_SIZE,
                verbose=False
            )[0]

            if results.boxes is None:
                continue

            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Scale back to original frame size
                scale_x = frame.shape[1] / YOLO_SIZE
                scale_y = frame.shape[0] / YOLO_SIZE

                x1 = int(x1 * scale_x)
                x2 = int(x2 * scale_x)
                y1 = int(y1 * scale_y)
                y2 = int(y2 * scale_y)

                cls = int(box.cls[0])
                label = results.names.get(cls, str(cls))
                confidence = float(box.conf[0])

                detections.append((x1, y1, x2, y2, label, confidence))

                # Save detection (prevent spam)
                if label not in last_detected_labels or \
                   now - last_detected_labels[label] > DUPLICATE_TIMEOUT:

                    save_detection_to_db(label, confidence)
                    last_detected_labels[label] = now

        with yolo_lock:
            latest_detections = detections

        time.sleep(YOLO_INTERVAL)

def generate_frames():
    while True:
        with frame_lock:
            if latest_frame is None:
                continue
            frame = latest_frame.copy()

        with yolo_lock:
            for x1, y1, x2, y2, label, confidence in latest_detections:

                # Draw bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                # Draw label
                cv2.putText(
                    frame,
                    f"{label} {confidence:.2f}",
                    (x1, y1 - 10 if y1 > 20 else y1 + 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2
                )

        if recording:
            cv2.circle(frame, (20, 30), 8, (0, 0, 255), -1)
            cv2.putText(frame, "REC", (40, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (0, 0, 255), 2)

        _, buffer = cv2.imencode(".jpg", frame,
                                 [cv2.IMWRITE_JPEG_QUALITY, 60])

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" +
               buffer.tobytes() + b"\r\n")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/gloves")
def gloves():
    return Response(generate_frames(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/capture", methods=["POST"])
def capture():
    ts = time.strftime("%Y%m%d_%H%M%S")
    name = f"capture_{ts}.jpg"
    path = os.path.join(CAPTURE_DIR, name)

    with frame_lock:
        cv2.imwrite(path, latest_frame)

    save_image_to_db(name, path)
    return jsonify(status="ok")

@app.route("/start_video", methods=["POST"])
def start_video():
    global recording, video_writer, current_video_path

    if recording:
        return jsonify(status="already_recording")

    ts = time.strftime("%Y%m%d_%H%M%S")
    current_video_path = os.path.join(CAPTURE_DIR, f"video_{ts}.avi")

    video_writer = cv2.VideoWriter(
        current_video_path,
        cv2.VideoWriter_fourcc(*"XVID"),
        30.0,
        (640, 480)
    )

    recording = True
    threading.Thread(target=video_record_loop, daemon=True).start()
    return jsonify(status="started")

def video_record_loop():
    global recording
    while recording:
        with frame_lock:
            if latest_frame is not None:
                video_writer.write(latest_frame)
        time.sleep(0.03)

@app.route("/stop_video", methods=["POST"])
def stop_video():
    global recording, video_writer

    recording = False
    time.sleep(0.2)
    video_writer.release()

    mp4 = convert_to_mp4(current_video_path)
    save_video_to_db(os.path.basename(mp4), mp4)
    os.remove(current_video_path)

    return jsonify(status="saved")

def convert_to_mp4(avi_path):
    mp4_path = avi_path.replace(".avi", ".mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-i", avi_path,
        "-vcodec", "libx264",
        "-pix_fmt", "yuv420p",
        mp4_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return mp4_path

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
