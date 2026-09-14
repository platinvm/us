import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import type { FocusSignal, GameDefinition } from '../games/types'
import { beginMoving } from './sceneMotion'
import { useShelf } from './shelfState'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** How long picking something up takes, and how long putting it back takes. */
const PICK_UP_MS = 1250
const PUT_BACK_MS = 950

/** Props rest leaning back against the wall. */
export const REST_LEAN = -0.07

/**
 * Eases in and out, so a prop gathers itself off the shelf and settles into
 * your hands instead of snapping between the two. A plain ease-out starts at
 * full speed, which is what made these read as sudden.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * A game on the shelf, and the movement between the shelf and your hands.
 *
 * Nothing is hidden or swapped out. The prop starts on the plank leaning
 * against the wall and ends up in front of the camera facing you, and every
 * frame in between is interpolated — which is the whole reason it reads as
 * picking something up rather than opening a menu.
 *
 * While that movement runs, the slot reports the shelf as busy, so a second tap
 * cannot start a rival animation halfway through this one.
 */
export function ShelfSlot({
  game,
  position,
  yaw = 0,
  roll = 0,
  scale = 1,
}: {
  game: GameDefinition
  position: [number, number, number]
  yaw?: number
  roll?: number
  scale?: number
}) {
  const { focusedId, focusTo, browsing, busy, setBusy } = useShelf()
  const reducedMotion = usePrefersReducedMotion()

  const [hovered, setHovered] = useState(false)
  useCursor(hovered && browsing)

  const moving = useRef<Group>(null)
  const progress = useRef(0)
  const settled = useRef(true)
  /** Held open while the prop is on its way in or out, so shadows follow it. */
  const stopMoving = useRef<(() => void) | null>(null)
  /**
   * Handed to the prop so it can animate off the same ramp without React
   * re-rendering this slot on every frame of the pick-up.
   */
  const signal = useRef<FocusSignal>({ value: 0 })

  const focused = focusedId === game.id
  const { Prop, focus } = game

  // Never leave the shelf stuck as busy if this unmounts mid-movement.
  useEffect(
    () => () => {
      if (!settled.current) setBusy(false)
      stopMoving.current?.()
      stopMoving.current = null
    },
    [setBusy],
  )

  useFrame((_, delta) => {
    const node = moving.current
    if (!node) return

    const wanted = focused ? 1 : 0

    if (reducedMotion) {
      progress.current = wanted
    } else {
      const duration = (wanted > progress.current ? PICK_UP_MS : PUT_BACK_MS) / 1000
      const step = delta / duration
      if (progress.current < wanted) {
        progress.current = Math.min(wanted, progress.current + step)
      } else if (progress.current > wanted) {
        progress.current = Math.max(wanted, progress.current - step)
      }
    }

    const done = progress.current === wanted
    if (settled.current !== done) {
      settled.current = done
      setBusy(!done)

      if (done) {
        stopMoving.current?.()
        stopMoving.current = null
      } else {
        stopMoving.current = beginMoving()
      }
    }

    const eased = easeInOutCubic(progress.current)
    // Props get the eased ramp, not the raw one, so anything they animate
    // themselves arrives on the same curve as the slot carrying them.
    signal.current.value = eased

    node.position.set(
      focus.lift[0] * eased,
      focus.lift[1] * eased,
      focus.lift[2] * eased,
    )

    // Rotate from the resting lean to the presentation angle.
    node.rotation.set(
      REST_LEAN + (focus.turn[0] - REST_LEAN) * eased,
      focus.turn[1] * eased,
      focus.turn[2] * eased,
    )

    node.scale.setScalar(1 + (focus.scale - 1) * eased)
  })

  return (
    <group position={position} rotation={[0, yaw, roll]} scale={scale}>
      <group ref={moving}>
        <Prop focus={signal.current} focused={focused} hovered={hovered} />

        {/* Only pickable from the shelf, and only when nothing is already
            moving. Once it is in your hands the prop's own controls take over,
            and tapping empty space puts it back. */}
        {browsing ? (
          <mesh
            position={[0, focus.size[1] / 2, 0]}
            onPointerOver={(event) => {
              event.stopPropagation()
              // A finger is not a pointer resting on something: hovering would
              // stick on after the tap.
              if (event.pointerType === 'touch') return
              setHovered(true)
            }}
            onPointerOut={() => setHovered(false)}
            onClick={(event) => {
              event.stopPropagation()
              if (busy) return
              focusTo(game.id)
            }}
          >
            <boxGeometry args={focus.size} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        ) : null}
      </group>
    </group>
  )
}
