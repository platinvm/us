import { useEffect, useRef } from 'react'

/**
 * How far the device has to tip, in degrees, to push the camera to the edge of
 * its drift. Deliberately small: a phone held in one hand only covers a few
 * degrees of wrist movement before it stops being comfortable.
 */
const TILT_RANGE = 20

export type DeviceTilt = {
  /** `-1..1`, the same shape as the pointer react-three-fiber hands the camera. */
  x: number
  y: number
  /** False until the sensor has actually said something worth using. */
  active: boolean
}

/**
 * Which way up the screen is, so a tilt reads the same in landscape as it does
 * in portrait.
 */
function screenAngle(): number {
  const orientation = window.screen.orientation
  if (orientation && Number.isFinite(orientation.angle)) return orientation.angle

  // Only older iOS needs this, and it is not in the DOM types any more.
  return (window as Window & { orientation?: number }).orientation ?? 0
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

/**
 * The phone's own tilt, wearing the pointer's clothes.
 *
 * The camera already drifts after the mouse; this produces the same `-1..1`
 * pair from the device's accelerometer so a phone can pan the shelf by tipping
 * instead of pointing at it. Nothing here decides what the drift means — swap
 * `x` and `y` for `pointer` in `CameraRig` and the behaviour comes along.
 *
 * Two things are worth knowing about the sensor:
 *
 *  - It measures an absolute angle, not a movement, so the first reading is
 *    taken as "level" and everything afterwards is measured against it. Coming
 *    back to the tab re-levels, otherwise the shelf would stay parked wherever
 *    the phone happened to be pointing when it was put down.
 *  - iOS keeps it behind a prompt that can only be raised from a real gesture,
 *    which is what the first tap on the shelf is for. Where there is no prompt
 *    to raise, the listener just goes on.
 *
 * Devices without a sensor simply never fire, `active` stays false, and the
 * mouse keeps the job it already had.
 */
export function useDeviceTilt() {
  const tilt = useRef<DeviceTilt>({ x: 0, y: 0, active: false })

  useEffect(() => {
    // A mouse is a better pointer than a laptop's gyro, and asking for motion
    // access on a desktop is noise. Touch-first devices only.
    if (!window.matchMedia('(pointer: coarse)').matches) return

    const orientationEvent = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<PermissionState>
        })
      | undefined

    if (!orientationEvent) return

    const level = { beta: 0, gamma: 0, taken: false }

    const onOrientation = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event
      if (beta === null || gamma === null) return

      if (!level.taken) {
        level.beta = beta
        level.gamma = gamma
        level.taken = true
        return
      }

      // Into screen space, so tipping the phone left looks left even when the
      // phone is being held sideways.
      const angle = (screenAngle() * Math.PI) / 180
      const roll = gamma - level.gamma
      const pitch = beta - level.beta
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      tilt.current.x = clamp((roll * cos - pitch * sin) / TILT_RANGE)
      // Negated: tipping the top of the phone away from you is the same gesture
      // as pushing the pointer towards the top of the screen.
      tilt.current.y = clamp(-(pitch * cos + roll * sin) / TILT_RANGE)
      tilt.current.active = true
    }

    let listening = false
    const listen = () => {
      if (listening) return
      listening = true
      window.addEventListener('deviceorientation', onOrientation)
    }

    const askForPermission = () => {
      window.removeEventListener('pointerdown', askForPermission)
      orientationEvent
        .requestPermission?.()
        .then((state) => {
          if (state === 'granted') listen()
        })
        // A refusal is not a failure: the mouse still drives the camera.
        .catch(() => {})
    }

    if (orientationEvent.requestPermission) {
      window.addEventListener('pointerdown', askForPermission, { once: true })
    } else {
      listen()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') level.taken = false
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      window.removeEventListener('pointerdown', askForPermission)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return tilt
}
