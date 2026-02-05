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
MOVE_HAND = "Right"   # cursor + drag
ZOOM_HAND = "Left"    # zoom control

PINCH_ON = 35
PINCH_OFF = 55
MIN_TOGGLE_INTERVAL = 0.08

CURSOR_ALPHA = 0.35   # cursor smoothing (0..1)

ZOOM_DEADZONE = 1.2
ZOOM_GAIN = 2.5
ZOOM_COOLDOWN = 0.015
ZOOM_EMA_ALPHA = 0.55
ZOOM_MOD_KEY = "ctrl"  # use "command" on macOS

HAND_LOCK_TIME = 0.15

# ----------------------------
# SETUP
# ----------------------------
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    model_complexity=0,        # FAST model
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

screen_w, screen_h = pyautogui.size()

cam = cv2.VideoCapture(0)
print("Camera opened:", cam.isOpened())
cam.set(cv2.CAP_PROP_BUFFERSIZE, 1)
cam.set(cv2.CAP_PROP_FPS, 120)
cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# ----------------------------
# STATE
# ----------------------------
holding_left = False
last_toggle_time = 0.0

cursor_x = None
cursor_y = None

prev_zoom_dist = None
ema_zoom_dist = None
last_zoom_time = 0.0

last_seen = {"Left": 0.0, "Right": 0.0}

# DRAG + CLICK and ZOOM HELPERS
def get_thumb_index_distance(hand_landmarks, w, h):
    x1 = y1 = x2 = y2 = None
    for i, lm in enumerate(hand_landmarks.landmark):
        x = int(lm.x * w)
        y = int(lm.y * h)
        if i == 8:   # index tip
            x1, y1 = x, y
        elif i == 4: # thumb tip
            x2, y2 = x, y
    if x1 is None or x2 is None:
        return None
    dist = math.hypot(x2 - x1, y2 - y1)
    return x1, y1, x2, y2, dist

def is_thumb_ring_touch(hand_landmarks, threshold=0.05):
    lm = hand_landmarks.landmark

    thumb_tip = lm[4]
    ring_tip = lm[13]

    dist = math.hypot(
        thumb_tip.x - ring_tip.x,
        thumb_tip.y - ring_tip.y
    )

    return dist < threshold, dist


# ----------------------------
# MAIN LOOP
# ----------------------------
while True:
    ok, frame = cam.read()
    if not ok:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)

    move_hand_seen = False
    zoom_hand_seen = False
    now = time.time()

    if result.multi_hand_landmarks and result.multi_handedness:
        for i, hand_landmarks in enumerate(result.multi_hand_landmarks):
            label = result.multi_handedness[i].classification[0].label
            last_seen[label] = now

            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            data = get_thumb_index_distance(hand_landmarks, w, h)
            if not data:
                continue

            x1, y1, x2, y2, dist = data
            cv2.circle(frame, (x1, y1), 8, (0,255,255), -1)
            cv2.circle(frame, (x2, y2), 8, (255,0,255), -1)

            # ----------------------------
            # MOVE + DRAG (RIGHT HAND)
            # ----------------------------
            if label == MOVE_HAND and (now - last_seen[MOVE_HAND]) < HAND_LOCK_TIME:
                move_hand_seen = True

                mx = int(screen_w * (x1 / w))
                my = int(screen_h * (y1 / h))

                if cursor_x is None:
                    cursor_x, cursor_y = mx, my
                else:
                    cursor_x = int(CURSOR_ALPHA * mx + (1 - CURSOR_ALPHA) * cursor_x)
                    cursor_y = int(CURSOR_ALPHA * my + (1 - CURSOR_ALPHA) * cursor_y)

                pyautogui.moveTo(cursor_x, cursor_y, _pause=False)

                if not holding_left and dist < PINCH_ON and (now - last_toggle_time) > MIN_TOGGLE_INTERVAL:
                    pyautogui.mouseDown(button="left")
                    holding_left = True
                    last_toggle_time = now

                elif holding_left and dist > PINCH_OFF and (now - last_toggle_time) > MIN_TOGGLE_INTERVAL:
                    pyautogui.mouseUp(button="left")
                    holding_left = False
                    last_toggle_time = now

                touch, dist = is_thumb_ring_touch(hand_landmarks)

                if touch and not holding_left and (now - last_toggle_time) > MIN_TOGGLE_INTERVAL:
                    pyautogui.mouseDown(button="left")
                    holding_left = True
                    last_toggle_time = now

                elif not touch and holding_left and (now - last_toggle_time) > MIN_TOGGLE_INTERVAL:
                    pyautogui.mouseUp(button="left")
                    holding_left = False
                    last_toggle_time = now


            # ----------------------------
            # ZOOM (LEFT HAND)
            # ----------------------------
            elif label == ZOOM_HAND and (now - last_seen[ZOOM_HAND]) < HAND_LOCK_TIME:
                zoom_hand_seen = True

                if ema_zoom_dist is None:
                    ema_zoom_dist = dist
                else:
                    ema_zoom_dist = (ZOOM_EMA_ALPHA * dist) + ((1 - ZOOM_EMA_ALPHA) * ema_zoom_dist)

                if prev_zoom_dist is not None:
                    delta = prev_zoom_dist - ema_zoom_dist
                    if abs(delta) >= ZOOM_DEADZONE and (now - last_zoom_time) >= ZOOM_COOLDOWN:
                        scroll_amount = int(-delta * ZOOM_GAIN)
                        scroll_amount = max(-120, min(120, scroll_amount))
                        if scroll_amount != 0:
                            pyautogui.keyDown(ZOOM_MOD_KEY)
                            pyautogui.scroll(scroll_amount)
                            pyautogui.keyUp(ZOOM_MOD_KEY)
                            last_zoom_time = now

                prev_zoom_dist = ema_zoom_dist

    # ----------------------------
    # SAFETY CLEANUP
    # ----------------------------
    if not move_hand_seen and holding_left:
        pyautogui.mouseUp(button="left")
        holding_left = False

    if not zoom_hand_seen:
        prev_zoom_dist = None
        ema_zoom_dist = None

    cv2.imshow("Gesture Control", frame)
    if cv2.waitKey(1) == 27:  # ESC
        break

cam.release()
cv2.destroyAllWindows()
