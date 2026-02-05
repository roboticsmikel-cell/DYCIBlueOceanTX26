from flask import Flask, Response
import cv2
import mediapipe as mp
import pyautogui
import math
import time

# ----------------------------
# PERFORMANCE FIXES
# ----------------------------
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False

# ----------------------------
# CONFIG
# ----------------------------
MOVE_HAND = "Right"
ZOOM_HAND = "Left"

HAND_LOCK_TIME = 0.15
CURSOR_ALPHA = 0.35
MIN_TOGGLE_INTERVAL = 0.15

PRESS_THRESHOLD = 0.07  # thumb(4) ↔ index base(5)

ZOOM_DEADZONE = 1.2
ZOOM_GAIN = 2.5
ZOOM_COOLDOWN = 0.02
ZOOM_EMA_ALPHA = 0.55
ZOOM_MOD_KEY = "ctrl"

# ----------------------------
# SETUP
# ----------------------------
app = Flask(__name__)

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    model_complexity=0,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

screen_w, screen_h = pyautogui.size()

cam = cv2.VideoCapture(1, cv2.CAP_DSHOW)
cam.set(cv2.CAP_PROP_BUFFERSIZE, 1)
cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# ----------------------------
# STATE
# ----------------------------
cursor_x = None
cursor_y = None
last_click_time = 0.0

drag_mode = False

prev_zoom_dist = None
ema_zoom_dist = None
last_zoom_time = 0.0

last_seen = {"Left": 0.0, "Right": 0.0}

# ----------------------------
# HELPERS
# ----------------------------
def get_index_tip_xy(hand_landmarks, w, h):
    lm = hand_landmarks.landmark
    return int(lm[8].x * w), int(lm[8].y * h)

def thumb_index_base_touch(hand_landmarks):
    lm = hand_landmarks.landmark
    thumb = lm[4]
    index_base = lm[5]

    dist = math.hypot(
        thumb.x - index_base.x,
        thumb.y - index_base.y
    )
    return dist < PRESS_THRESHOLD

def is_fist(hand_landmarks):
    lm = hand_landmarks.landmark
    return all([
        lm[8].y  > lm[6].y,   # index
        lm[12].y > lm[10].y,  # middle
        lm[16].y > lm[14].y,  # ring
        lm[20].y > lm[18].y   # pinky
    ])

# ----------------------------
# FRAME GENERATOR
# ----------------------------
def generate_frames():
    global cursor_x, cursor_y
    global drag_mode, last_click_time
    global prev_zoom_dist, ema_zoom_dist, last_zoom_time
    global last_seen

    try:
        while True:
            ok, frame = cam.read()
            if not ok:
                continue

            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)

            now = time.time()
            move_hand_seen = False
            zoom_hand_seen = False

            if result.multi_hand_landmarks and result.multi_handedness:
                for i, hand_landmarks in enumerate(result.multi_hand_landmarks):
                    label = result.multi_handedness[i].classification[0].label
                    last_seen[label] = now

                    mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                    # ----------------------------
                    # RIGHT HAND: MOVE + CLICK
                    # ----------------------------
                    if label == MOVE_HAND and (now - last_seen[MOVE_HAND]) < HAND_LOCK_TIME:
                        move_hand_seen = True

                        ix, iy = get_index_tip_xy(hand_landmarks, w, h)
                        mx = int(screen_w * (ix / w))
                        my = int(screen_h * (iy / h))

                        if cursor_x is None:
                            cursor_x, cursor_y = mx, my
                        else:
                            cursor_x = int(CURSOR_ALPHA * mx + (1 - CURSOR_ALPHA) * cursor_x)
                            cursor_y = int(CURSOR_ALPHA * my + (1 - CURSOR_ALPHA) * cursor_y)

                        pyautogui.moveTo(cursor_x, cursor_y, _pause=False)

                        if thumb_index_base_touch(hand_landmarks):
                            if (now - last_click_time) > MIN_TOGGLE_INTERVAL:
                                pyautogui.click(button="left")
                                last_click_time = now

                    # ----------------------------
                    # LEFT HAND: DRAG MODE + ZOOM
                    # ----------------------------
                    elif label == ZOOM_HAND and (now - last_seen[ZOOM_HAND]) < HAND_LOCK_TIME:
                        zoom_hand_seen = True

                        fist = is_fist(hand_landmarks)

                        # Drag mode
                        if fist and not drag_mode:
                            pyautogui.mouseDown(button="left")
                            drag_mode = True

                        elif not fist and drag_mode:
                            pyautogui.mouseUp(button="left")
                            drag_mode = False

                        # Zoom (only if not dragging)
                        if not fist:
                            lm = hand_landmarks.landmark
                            d = math.hypot(
                                lm[4].x - lm[8].x,
                                lm[4].y - lm[8].y
                            )

                            ema_zoom_dist = d if ema_zoom_dist is None else (
                                ZOOM_EMA_ALPHA * d + (1 - ZOOM_EMA_ALPHA) * ema_zoom_dist
                            )

                            if prev_zoom_dist is not None:
                                delta = prev_zoom_dist - ema_zoom_dist
                                if abs(delta) >= ZOOM_DEADZONE and (now - last_zoom_time) >= ZOOM_COOLDOWN:
                                    scroll = int(-delta * ZOOM_GAIN)
                                    scroll = max(-120, min(120, scroll))
                                    if scroll:
                                        pyautogui.keyDown(ZOOM_MOD_KEY)
                                        pyautogui.scroll(scroll)
                                        pyautogui.keyUp(ZOOM_MOD_KEY)
                                        last_zoom_time = now

                            prev_zoom_dist = ema_zoom_dist

            # ----------------------------
            # SAFETY CLEANUP
            # ----------------------------
            if not zoom_hand_seen and drag_mode:
                pyautogui.mouseUp(button="left")
                drag_mode = False

            ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" +
                buffer.tobytes() + b"\r\n"
            )

    except GeneratorExit:
        if drag_mode:
            pyautogui.mouseUp(button="left")

# ----------------------------
# FLASK ROUTES
# ----------------------------
@app.route("/")
def index():
    return '<img src="/gesture_video" width="100%">'

@app.route("/gesture_video")
def video_feed():
    return Response(generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame")

# ----------------------------
# RUN

# ----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True, debug=False, use_reloader=False)