import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { useShelf } from './shelfState'
import { useDeviceTilt } from './useDeviceTilt'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** Shared with the `<Canvas>` so the framing maths and the camera agree. */
export const CAMERA_FOV = 34

/**
 * Breathing room left around a prop that has been fitted into the frame. With
 * none, the thing you are holding sits flush against two of the edges.
 */
const FIT_MARGIN = 1.08

/** Where the camera should end up when something is in your hands. */
export type FocusTarget = {
  /** The point the camera looks at — usually the thing you are holding. */
  position: [number, number, number]
  /**
   * Where the camera sits relative to that point, in world space.
   *
   * An offset rather than a distance along Z, because props sit at an angle to
   * the wall: measuring straight back along world Z puts the camera off the
   * prop's own axis and lands the thing you are holding off-centre in frame.
   */
  offset: [number, number, number]
  /**
   * How big the prop is once it is in your hands: width and height, in world
   * units. Used to work out how far back the camera has to sit for all of it to
   * be visible, which on an upright phone is a great deal further than it is on
   * a desktop window.
   */
  size: [width: number, height: number]
}

/**
 * One camera, two states, and a damped move between them.
 *
 * Sitting back far enough to see the whole shelf, or pushed in close to
 * whatever has been picked up. Because it is the same camera in the same scene,
 * the rest of the shelf stays visible around the edges of the frame while you
 * play — you can see everything else behind the thing you are holding.
 */
export function CameraRig({
  contentWidth,
  contentHeight,
  centreY,
  focusTarget,
}: {
  contentWidth: number
  contentHeight: number
  centreY: number
  focusTarget: FocusTarget | null
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const pointer = useThree((state) => state.pointer)
  const tilt = useDeviceTilt()
  const { browsing } = useShelf()
  const reducedMotion = usePrefersReducedMotion()

  const lookAt = useRef(new Vector3(0, centreY, 0))
  const scratch = useRef(new Vector3())
  const desired = useRef(new Vector3())

  const shelfDistance = useMemo(() => {
    const aspect = Math.max(0.4, size.width / Math.max(1, size.height))
    const halfVertical = Math.tan((CAMERA_FOV * Math.PI) / 180 / 2)
    const halfHorizontal = halfVertical * aspect

    return (
      Math.max(
        contentHeight / 2 / halfVertical,
        contentWidth / 2 / halfHorizontal,
      ) *
        1.05 +
      0.42
    )
  }, [contentWidth, contentHeight, size.width, size.height])

  useFrame((_, delta) => {
    // A phone drives the shelf by tipping; anywhere else the pointer does it.
    // Same two numbers either way, so nothing below has to care which.
    const aim = tilt.current.active ? tilt.current : pointer
    const driftX = reducedMotion ? 0 : aim.x * (browsing ? 0.28 : 0.06)
    const driftY = reducedMotion ? 0 : aim.y * (browsing ? 0.2 : 0.05)

    if (focusTarget) {
      const [x, y, z] = focusTarget.position
      const [ox, oy, oz] = focusTarget.offset

      // How far back the camera has to sit for the whole prop to fit. A prop
      // that fits across a desktop window will not fit down a phone held
      // upright, so the camera retreats along its own axis until whichever
      // edge is tightest clears the frame.
      const aspect = Math.max(0.2, size.width / Math.max(1, size.height))
      const halfVertical = Math.tan((CAMERA_FOV * Math.PI) / 180 / 2)
      const [propWidth, propHeight] = focusTarget.size
      const fit =
        Math.max(
          propHeight / 2 / halfVertical,
          propWidth / 2 / (halfVertical * aspect),
        ) * FIT_MARGIN
      const authored = Math.max(0.001, Math.hypot(ox, oy, oz))
      const back = Math.max(1, fit / authored)

      desired.current.set(
        x + ox * back + driftX * 0.4,
        y + oy * back + driftY * 0.4,
        z + oz * back,
      )
      scratch.current.set(x, y, z)
    } else {
      desired.current.set(driftX, centreY + driftY, shelfDistance)
      scratch.current.set(driftX * 0.3, centreY, 0)
    }

    // A long time constant: the camera is meant to drift after whatever you
    // picked up, never to get there first and then wait.
    const damping = 1 - Math.exp(-3 * delta)
    camera.position.lerp(desired.current, damping)
    lookAt.current.lerp(scratch.current, damping)
    camera.lookAt(lookAt.current)
  })

  return null
}
