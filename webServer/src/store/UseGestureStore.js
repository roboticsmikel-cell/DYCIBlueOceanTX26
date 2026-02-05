import { create } from 'zustand'

export const useGestureStore = create(() => ({
  // Cursor position (screen space)
  x: 0,
  y: 0,

  // Gesture states
  pinch: false,
  handDetected: false,

  // Two-hand zoom signal (null = inactive)
  twoHandDistance: null,

  // MediaPipe landmarks
  // null
  // [ {x,y,z} x21 ]            → one hand
  // [ [..21], [..21] ]         → two hands
  landmarks: null,

  // Optional reset helper
  reset: () => ({
    x: 0,
    y: 0,
    pinch: false,
    handDetected: false,
    twoHandDistance: null,
    landmarks: null
  })
}))