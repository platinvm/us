import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

/**
 * What the frame rate is spent on, and how much of it is worth spending.
 *
 * Two problems, one file. The first is that a phone cannot be trusted to pick
 * its own resolution: the same build runs on an eight-year-old Android and on a
 * current iPhone, and a number chosen at build time is wrong on one of them.
 * The second is that most of the time nobody is doing anything — the shelf is
 * just sitting there — and rendering it sixty times a second is paying full
 * price for a still life.
 *
 * So: the resolution is walked up and down until the frame rate lands, and the
 * frame rate itself drops while the room is quiet. Neither of these changes what
 * the scene looks like when you are actually touching it, which is the point.
 */

/** Frame time past which the resolution is worth more than the pixels. */
const TOO_SLOW = 0.024

/** Frame time under which there is headroom to spare. */
const ROOM_TO_SPARE = 0.014

/** How long to watch before moving the resolution, in seconds. */
const SETTLE = 1.5

/**
 * Resolution, tuned to the device that is actually here.
 *
 * The average is a running one, so a single long frame — a texture upload, a
 * note falling, the tab coming back — cannot drag everything down with it.
 *
 * It stands down while the frame rate is being held down on purpose. A frame
 * that took 33ms because nobody asked for it for 33ms says nothing about the
 * device, and reading it as "too slow" would walk the resolution down to the
 * floor on the fastest phone in the world.
 */
export function ResolutionGovernor({
  min,
  max,
  enabled,
}: {
  min: number
  max: number
  enabled: boolean
}) {
  const setDpr = useThree((state) => state.setDpr)
  const gauge = useRef({ average: 0, elapsed: 0, dpr: max })

  useEffect(() => {
    gauge.current = { average: 0, elapsed: 0, dpr: max }
    setDpr(max)
  }, [max, setDpr])

  useFrame((_, delta) => {
    const state = gauge.current

    if (!enabled) {
      // Forget the held-back frames rather than averaging them in.
      state.average = 0
      state.elapsed = 0
      return
    }

    state.average = state.average === 0 ? delta : state.average * 0.9 + delta * 0.1
    state.elapsed += delta
    if (state.elapsed < SETTLE) return

    state.elapsed = 0

    // Between the two thresholds nothing happens: the band is what stops it
    // hunting up and down a fifth of a pixel forever.
    const wanted =
      state.average > TOO_SLOW
        ? state.dpr - 0.15
        : state.average < ROOM_TO_SPARE
          ? state.dpr + 0.15
          : state.dpr

    const next = Math.min(max, Math.max(min, Math.round(wanted * 20) / 20))
    if (Math.abs(next - state.dpr) < 0.011) return

    state.dpr = next
    setDpr(next)
  })

  return null
}

/**
 * Whether anything has happened recently.
 *
 * A drag on the shelf, a key press, a poke: all of them want every frame the
 * device can manage, and all of them stop mattering a moment later. Watching
 * the events rather than the scene means this cannot miss a case — a new prop
 * with a new way of being moved still arrives as a pointer event.
 *
 * Tilting the phone counts as activity too, since it pans the camera — but a
 * phone lying on a table still reports its orientation many times a second, so
 * only an actual change counts. Otherwise the shelf would never settle.
 */
export function useRecentlyBusy(): boolean {
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let timer = 0

    const wake = () => {
      // Setting a value that is already `true` costs nothing, so a drag does
      // not re-render React sixty times a second.
      setBusy(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setBusy(false), 1500)
    }

    const events = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown'] as const
    for (const name of events) window.addEventListener(name, wake, { passive: true })

    let previous: { beta: number; gamma: number } | null = null
    const onTilt = (event: DeviceOrientationEvent) => {
      const now = { beta: event.beta ?? 0, gamma: event.gamma ?? 0 }
      const moved =
        previous === null ||
        Math.abs(now.beta - previous.beta) > 0.6 ||
        Math.abs(now.gamma - previous.gamma) > 0.6
      previous = now
      if (moved) wake()
    }
    window.addEventListener('deviceorientation', onTilt, { passive: true })

    return () => {
      window.clearTimeout(timer)
      for (const name of events) window.removeEventListener(name, wake)
      window.removeEventListener('deviceorientation', onTilt)
    }
  }, [])

  return busy
}

/**
 * Runs the scene at a rate rather than at whatever the browser would do.
 *
 * The canvas is taken off its own loop and driven from here instead: a frame is
 * asked for at most `fps` times a second, and the ask never stops, so there is
 * no state in which the scene is waiting for something that will not come. At
 * the full rate the loop is handed back to react-three-fiber, because there is
 * nothing to be gained from doing its job for it.
 */
export function FramePacer({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const interval = 1000 / fps
    let frame = 0
    let last = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      // The one-millisecond slack keeps a 60Hz display from landing just short
      // of the interval and halving itself to 30.
      if (now - last < interval - 1) return
      last = now
      invalidate()
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fps, invalidate])

  return null
}
