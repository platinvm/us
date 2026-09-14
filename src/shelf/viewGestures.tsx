import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useShelf } from './shelfState'

/**
 * How far in and back the shelf can be pulled, as a multiplier on the camera's
 * distance from what it is looking at.
 *
 * A fifth either way. Enough to lean in on something and read it, little enough
 * that the framing you were given is still recognisably the framing you are
 * looking at — this is a shelf on a wall, not a map to be explored.
 */
const MIN_ZOOM = 0.8
const MAX_ZOOM = 1.2

/**
 * How far a drag can slide the view, as a fraction of its height.
 *
 * The shelf is a wall with nothing behind the edges of the frame, so there is
 * nothing to drag into; a third of a screen reaches either end of a plank.
 */
const PAN_LIMIT = 0.35

/** Movement in pixels before a touch is a drag rather than a tap. */
const DRAG_THRESHOLD = 7

/** How fast one wheel notch moves the zoom, exponentially. */
const WHEEL_STEP = 0.0009

/**
 * The view offset, as module state rather than React state.
 *
 * A pinch arrives many times a second and would re-render the whole shelf on
 * every one of them if it went through `useState` — for a number that only the
 * camera reads, once a frame, inside the render loop. Same reasoning as
 * `sceneMotion`: whoever needs it reads it, nobody is notified.
 */
const gesture = { zoom: 1, panX: 0, panY: 0 }

export type ViewOffset = { zoom: number; panX: number; panY: number }

export function getViewOffset(): ViewOffset {
  return gesture
}

/**
 * Puts the view back where the framing left it.
 *
 * Called whenever a prop is picked up or put down. A gesture is about looking
 * at the shelf as it is right now — it should not still be in force two
 * interactions later, cropping the one thing you just reached for.
 */
export function resetView(): void {
  gesture.zoom = 1
  gesture.panX = 0
  gesture.panY = 0
}

const clamp = (value: number, limit: number): number =>
  Math.min(limit, Math.max(-limit, value))

function zoomBy(factor: number): void {
  gesture.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, gesture.zoom * factor))
}

/** How far apart two fingers are, or nothing at all if there are not two. */
function spread(pointers: Map<number, { x: number; y: number }>): number {
  const points = [...pointers.values()]
  const [first, second] = points
  if (!first || !second) return 0
  return Math.hypot(first.x - second.x, first.y - second.y)
}

/**
 * The point the current fingers are holding, on average.
 *
 * A drag follows this rather than any one finger, so two fingers moving
 * together move the view exactly as far as one does — and two fingers moving
 * apart, which is a pinch, move it only as far as the middle between them went.
 */
function midpoint(pointers: Map<number, { x: number; y: number }>): {
  x: number
  y: number
} {
  if (pointers.size === 0) return { x: 0, y: 0 }

  let x = 0
  let y = 0
  for (const point of pointers.values()) {
    x += point.x
    y += point.y
  }
  return { x: x / pointers.size, y: y / pointers.size }
}

/**
 * Moves the view by a drag, expressed as a fraction of the view's height.
 *
 * Working in fractions rather than in world units is what lets the same drag
 * mean the same thing at every zoom and on every screen: the camera is closer
 * in on a phone than on a desktop, and the shelf should still follow a finger
 * one for one.
 */
function slideBy(dx: number, dy: number, canvas: HTMLCanvasElement): void {
  const height = Math.max(1, canvas.clientHeight)
  gesture.panX = clamp(gesture.panX + dx / height, PAN_LIMIT)
  gesture.panY = clamp(gesture.panY + dy / height, PAN_LIMIT)
}

/**
 * Wheel and touch, for looking at the shelf more closely.
 *
 * A wheel notch or a pinch moves the zoom; a drag slides the view across. The
 * two are deliberately the same gesture family — pinch out to lean in, drag to
 * look along the plank, pinch back when you are done — and both are capped at
 * about a fifth, so the shelf can never end up somewhere it can be lost from.
 *
 * Dragging is only allowed while nothing is in your hands. Once a prop has been
 * picked up the pointer belongs to it: the D-pad on the handheld is pressed and
 * held with a thumb, and a thumb that rolls two pixels while it presses must
 * not drag the room sideways.
 */
export function ViewGestures() {
  const gl = useThree((state) => state.gl)
  const { browsing } = useShelf()

  // Read at gesture time rather than captured, so the listeners can be attached
  // once for the life of the canvas.
  const live = useRef({ browsing })

  useEffect(() => {
    live.current.browsing = browsing
  }, [browsing])

  useEffect(() => {
    const canvas = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch = 0
    let origin: { x: number; y: number } | null = null
    let dragging = false

    const onWheel = (event: WheelEvent) => {
      // A trackpad pinch arrives as ctrl+wheel. That one belongs to the
      // browser: taking it would take away the only way to zoom the page.
      if (event.ctrlKey) return

      event.preventDefault()
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomBy(Math.exp(-delta * WHEEL_STEP))
    }

    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (pointers.size === 1) {
        origin = { x: event.clientX, y: event.clientY }
        dragging = false
        return
      }

      // A second finger holds a distance rather than a point, so the drag stops
      // being a drag and the pinch takes over.
      origin = null
      dragging = false
      pinch = spread(pointers)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return

      const before = midpoint(pointers)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const after = midpoint(pointers)
      const dx = after.x - before.x
      const dy = after.y - before.y

      if (pointers.size >= 2) {
        const next = spread(pointers)
        if (pinch > 0 && next > 0) zoomBy(next / pinch)
        pinch = next
        slideBy(dx, dy, canvas)
        return
      }

      if (!live.current.browsing) return

      if (!dragging) {
        if (!origin) return
        const travelled = Math.hypot(
          event.clientX - origin.x,
          event.clientY - origin.y,
        )
        if (travelled < DRAG_THRESHOLD) return
        dragging = true
      }

      slideBy(dx, dy, canvas)
    }

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = 0
      if (pointers.size === 0) {
        dragging = false
        origin = null
      }
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)

      pointers.clear()
      pinch = 0
      dragging = false
      origin = null
    }
  }, [gl])

  return null
}
