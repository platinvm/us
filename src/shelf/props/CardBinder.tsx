import { RoundedBox, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DoubleSide, SRGBColorSpace } from 'three'
import type { Group, Texture } from 'three'
import { CARDS, POCKETS_PER_PAGE } from '../../games/cardcollection/cards'
import logoUrl from '../../games/cardcollection/assets/logo.png'
import type { ShelfPropProps } from '../../games/types'
import { createHeartGeometry } from '../decorations/heart'
import { useShelf } from '../shelfState'
import { BINDER_SIZE, paintBinderCover } from './artwork'
import { useCanvasTexture } from './canvasTexture'

const WIDTH = 0.52
const HEIGHT = 0.68
const THICKNESS = 0.11
const SPINE_X = -WIDTH / 2

/**
 * The page sits just proud of the block of pages and well behind the front
 * cover. Putting it level with the cover's own front face is what made pockets
 * poke through the closed binder.
 */
const PAGE_Z = 0.046

const CARD_W = 0.135
const CARD_H = (CARD_W * 35) / 25
const COLUMN_GAP = 0.155
const ROW_GAP = 0.205

/** How far a lifted card comes out of the page, and how much it grows. */
const LIFT_Z = 0.42
const LIFT_SCALE = 1.8
/**
 * How far a card rises clear of its pocket before it starts coming out.
 * Deliberately more than the card's own height — it lifts a whole card clear
 * of the page, which is what makes it read as being drawn rather than slid.
 */
const LIFT_RISE = 0.2
/**
 * Where the lift changes from "up" to "out", as a share of the animation.
 * Drawing a card is two moves, not one diagonal: it comes up first, then it
 * comes towards you. Putting it back is the same move played backwards, so it
 * travels away and then drops.
 */
const LIFT_SPLIT = 0.5
/** Seconds for a card to come out or go back. Long enough to watch. */
const LIFT_TIME = 0.7

/**
 * Smoothstep. Used for both halves of the draw so each one starts and ends at a
 * standstill — an ease-out on its own would hand the first half straight to the
 * second at full speed and the join would read as a knock.
 */
function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

function homePosition(index: number): { x: number; y: number } {
  const column = index % 3
  const row = Math.floor(index / 3)
  return {
    x: (column - 1) * COLUMN_GAP,
    y: HEIGHT / 2 + (1 - row) * ROW_GAP,
  }
}

/**
 * The binder: closed on the shelf, open in your hands.
 *
 * Picking it up swings the cover back and turns the whole thing to face you —
 * still on the shelf, in the same room. Tap the card and it comes out of its
 * pocket; tap anywhere else and it goes back.
 *
 * Every pocket is animated every frame from its own target, rather than only
 * the one that happens to be lifted. Moving a single shared reference between
 * cards left the previous one frozen wherever it was, which is how you ended up
 * with several out at once and none of them ever going home.
 */
export function CardBinder({ focus, focused }: ShelfPropProps) {
  const root = useRef<Group>(null)
  const cover = useRef<Group>(null)
  const strap = useRef<Group>(null)

  const [liftedIndex, setLiftedIndex] = useState<number | null>(null)
  const [settled, setSettled] = useState(true)

  const { setSubView, setBusy } = useShelf()

  const urls = useMemo(() => CARDS.map((card) => card.image), [])
  const textures = useTexture(urls) as Texture[]
  const logo = useTexture(logoUrl) as Texture

  const coverTexture = useCanvasTexture(
    BINDER_SIZE.width,
    BINDER_SIZE.height,
    paintBinderCover,
  )

  const charm = useMemo(() => createHeartGeometry(1, 0.35), [])
  useEffect(() => () => charm.dispose(), [charm])

  useEffect(() => {
    for (const texture of [...textures, logo]) {
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 8
    }
  }, [textures, logo])

  /**
   * One ref per pocket, created once. Swapping a single ref onto whichever card
   * was lifted meant React detached and reattached it on every render, which is
   * half of why this flickered.
   */
  const pockets = useRef<(Group | null)[]>([])
  const pocketRefs = useMemo(
    () =>
      Array.from({ length: POCKETS_PER_PAGE }, (_, index) => (node: Group | null) => {
        pockets.current[index] = node
        if (node && node.userData.grow === undefined) node.userData.grow = 0
      }),
    [],
  )

  // Putting the binder down closes whatever was lifted.
  useEffect(() => {
    if (!focused) setLiftedIndex(null)
  }, [focused])

  // A lifted card is a view of its own, and it holds the Escape key.
  useEffect(() => {
    setSubView(liftedIndex !== null)
    return () => setSubView(false)
  }, [liftedIndex, setSubView])

  useEffect(() => {
    if (liftedIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setLiftedIndex(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [liftedIndex])

  const idle = useRef(true)

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    if (root.current) {
      root.current.position.y = Math.sin(time * 1.05) * 0.004
    }

    // The cover swings back as the binder comes to hand. `focus.value` is
    // already eased by the slot, so it is used as-is rather than eased twice.
    const open = focus.value
    if (cover.current) {
      const breathing = (1 - open) * (0.012 + Math.sin(time * 1.6) * 0.006)
      cover.current.rotation.y = -open * 2.55 - breathing
    }

    // An elastic band stretched over the front cover would end up lying across
    // the open pages, so it comes off as the cover swings back.
    if (strap.current) strap.current.visible = open < 0.18

    const step = delta / LIFT_TIME
    let moving = false

    for (let index = 0; index < POCKETS_PER_PAGE; index += 1) {
      const node = pockets.current[index]
      if (!node) continue

      const home = homePosition(index)
      const target = liftedIndex === index ? 1 : 0
      const grow = (node.userData.grow as number) ?? 0

      let next = grow
      if (grow < target) next = Math.min(target, grow + step)
      else if (grow > target) next = Math.max(target, grow - step)
      if (next !== target) moving = true

      node.userData.grow = next

      // Two smoothed halves: up clear of the pocket, then out towards you and
      // across to the middle of the page. Reversing `grow` plays it backwards,
      // so putting the card away is away-then-down automatically.
      const rise = smoothstep(next / LIFT_SPLIT)
      const approach = smoothstep((next - LIFT_SPLIT) / (1 - LIFT_SPLIT))

      node.scale.setScalar(1 + (LIFT_SCALE - 1) * approach)
      node.position.x = home.x * (1 - approach)
      node.position.y =
        home.y + LIFT_RISE * rise + (HEIGHT / 2 - home.y - LIFT_RISE) * approach
      node.position.z = LIFT_Z * approach
    }

    const resting = !moving
    if (idle.current !== resting) {
      idle.current = resting
      setSettled(resting)
      setBusy(!resting)
    }
  })

  // Never leave the shelf locked if this unmounts mid-animation.
  useEffect(
    () => () => {
      if (!idle.current) setBusy(false)
    },
    [setBusy],
  )

  const choose = (index: number | null) => {
    if (!settled || !focused) return
    setLiftedIndex(index)
  }

  return (
    <group ref={root} position={[0, 0.02, -0.04]}>
      {/* Back cover */}
      <RoundedBox
        args={[WIDTH, HEIGHT, 0.012]}
        radius={0.006}
        smoothness={3}
        position={[0, HEIGHT / 2, -THICKNESS / 2]}
        castShadow
        receiveShadow
        onClick={(event) => {
          // Tapping the binder itself is not tapping away from it.
          if (focused) event.stopPropagation()
        }}
      >
        <meshStandardMaterial color="#1b2350" roughness={0.55} />
      </RoundedBox>

      {/* The block of sleeved pages. Shallower than the covers so its front
          face cannot end up coplanar with the navy page plane. */}
      <mesh position={[0, HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH - 0.022, HEIGHT - 0.03, THICKNESS - 0.04]} />
        <meshStandardMaterial color="#e9e3d6" roughness={0.92} />
      </mesh>

      {/* Spine. Along the left edge, and tucked behind the page plane so it
          reads as the binder's backbone only once the cover is open — at the
          centre it was a dark bar pinned down the middle of the open page. */}
      <RoundedBox
        args={[0.08, HEIGHT, 0.036]}
        radius={0.014}
        smoothness={3}
        position={[SPINE_X + 0.018, HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <meshStandardMaterial color="#151c42" roughness={0.6} />
      </RoundedBox>

      {/* The page: nine pockets, three by three */}
      <group position={[0, 0, PAGE_Z]}>
        <mesh position={[0, HEIGHT / 2, -0.008]}>
          <planeGeometry args={[WIDTH - 0.04, HEIGHT - 0.04]} />
          <meshStandardMaterial color="#25305e" roughness={0.8} />
        </mesh>

        {CARDS.map((card, index) => {
          const home = homePosition(index)
          const isMine = liftedIndex === index
          const dimmed = liftedIndex !== null && !isMine && card.kind === 'card'
          const liftable = card.kind === 'card'

          return (
            <group key={card.id}>
              {/* The plastic sleeve. It belongs to the pocket, so it stays put
                  when the card comes out — carrying it along is what drew a
                  translucent border around every lifted card. */}
              <mesh position={[home.x, home.y, -0.004]}>
                <planeGeometry args={[CARD_W + 0.018, CARD_H + 0.018]} />
                <meshStandardMaterial
                  color="#cfe0ff"
                  transparent
                  opacity={0.12}
                  roughness={0.08}
                  depthWrite={false}
                  side={DoubleSide}
                />
              </mesh>

              <group ref={pocketRefs[index]} position={[home.x, home.y, 0]}>
                <mesh
                  onClick={
                    liftable
                      ? (event) => {
                          event.stopPropagation()
                          choose(isMine ? null : index)
                        }
                      : undefined
                  }
                >
                  <planeGeometry args={[CARD_W, CARD_H]} />
                  {/* Opaque, and dimmed with colour rather than opacity — two
                      overlapping transparent surfaces sort unpredictably and
                      that is what flickered. `alphaTest` then cuts the artwork's
                      own rounded, transparent corners instead of letting an
                      opaque material paint them black. */}
                  <meshStandardMaterial
                    map={textures[index]}
                    color={dimmed ? '#6f6f7c' : '#ffffff'}
                    roughness={0.42}
                    metalness={0.1}
                    alphaTest={0.5}
                  />
                </mesh>
              </group>
            </group>
          )
        })}
      </group>

      {/* Front cover, hinged along the spine */}
      <group ref={cover} position={[SPINE_X, 0, 0]}>
        <group position={[-SPINE_X, 0, 0]}>
          <RoundedBox
            args={[WIDTH, HEIGHT, 0.014]}
            radius={0.007}
            smoothness={3}
            position={[0, HEIGHT / 2, THICKNESS / 2]}
            castShadow
          >
            <meshStandardMaterial
              color={focused ? '#4d63b8' : '#2b3670'}
              roughness={0.48}
              metalness={0.1}
            />
          </RoundedBox>

          <mesh position={[0, HEIGHT / 2, THICKNESS / 2 + 0.0085]}>
            <planeGeometry args={[WIDTH - 0.016, HEIGHT - 0.016]} />
            <meshStandardMaterial map={coverTexture} roughness={0.42} metalness={0.12} />
          </mesh>

          {/* The collection's own mark, on the panel the cover leaves for it */}
          <mesh position={[0, HEIGHT / 2, THICKNESS / 2 + 0.0115]}>
            <planeGeometry args={[0.3, 0.143]} />
            <meshBasicMaterial
              map={logo}
              transparent
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>

          {[
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ].map(([sx, sy]) => (
            <mesh
              key={`${sx}-${sy}`}
              position={[
                (sx * (WIDTH - 0.048)) / 2,
                HEIGHT / 2 + (sy * (HEIGHT - 0.048)) / 2,
                THICKNESS / 2 + 0.008,
              ]}
            >
              <boxGeometry args={[0.048, 0.048, 0.006]} />
              <meshStandardMaterial
                color="#7d8ede"
                metalness={0.45}
                roughness={0.4}
                transparent
                opacity={0.5}
              />
            </mesh>
          ))}

          {/* Elastic strap, kept clear of the panel so it does not sit across
              the mark. */}
          <group ref={strap}>
            <mesh position={[0.215, HEIGHT / 2, THICKNESS / 2 + 0.016]}>
              <boxGeometry args={[0.026, HEIGHT + 0.006, 0.004]} />
              <meshStandardMaterial color="#0f1435" roughness={0.7} />
            </mesh>

            {/* Heart charm on the strap */}
            <mesh
              geometry={charm}
              position={[0.215, HEIGHT * 0.28, THICKNESS / 2 + 0.026]}
              rotation={[Math.PI, 0, 0]}
              scale={0.045}
            >
              <meshStandardMaterial
                color="#d9a441"
                metalness={0.92}
                roughness={0.22}
                emissive="#d9a441"
                emissiveIntensity={focused ? 0.35 : 0.1}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* With the card out, tapping anywhere but the card puts it back. It sits
          behind the page so it cannot swallow taps meant for a pocket. */}
      {liftedIndex !== null ? (
        <mesh
          position={[0, 0.34, 0.02]}
          onClick={(event) => {
            event.stopPropagation()
            choose(null)
          }}
        >
          <planeGeometry args={[14, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      ) : null}
    </group>
  )
}
