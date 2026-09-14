import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, PointLight } from 'three'
import { Merged } from '../Merged'
import { FINISH, box, capsule, cone, cylinder, disc, sphere, torus } from '../parts'
import type { Part } from '../parts'
import { paintPhoto } from '../props/artwork'
import { useCanvasTexture } from '../props/canvasTexture'
import { createHeartGeometry } from './heart'
import type { DecorProps } from './types'

/**
 * The little things that make the shelf a bedroom shelf rather than a display
 * case: a plant, some keys, a ring, hearts, a candle, books, a photo.
 *
 * All procedural — no models, no downloads — and all authored with their base
 * at y=0 so they stand on a plank exactly like the games do.
 */

/* ----------------------------------------------------------------- cactus */

/** Ridges around the body. Enough to read as ribbed, few enough to stay cheap. */
const RIBS = 9

/** Spines, as [ring height, how many round the ring]. */
const SPINE_RINGS = [
  { y: 0.2, count: 6, offset: 0 },
  { y: 0.265, count: 6, offset: 0.5 },
]

/**
 * A little round cactus in a terracotta pot, flowering.
 *
 * This replaces the leafy plant that used to stand here, which never stopped
 * looking like what it was: flat shapes arranged to imitate leaves. A cactus is
 * genuinely a couple of capsules and some small ones stuck on, so it survives
 * being built this way — and it is the plant that belongs on a bedroom shelf.
 */
export function Cactus({ active }: DecorProps) {
  /**
   * Thirty-five meshes' worth of cactus in two.
   *
   * The colours are the still version of each part: what hovering used to do to
   * a part's colour is now a light coming on inside the whole plant, which is
   * cheaper and reads more like a poke than a repaint did.
   */
  const parts = useMemo<Part[]>(() => {
    const plant: Part[] = [
      // Body: a plain core with nine slimmer capsules standing around it. The
      // ring of them is what makes the ribs — a single tube reads as a
      // cucumber however it is shaded.
      {
        geometry: capsule(0.05, 0.15, 6, 20),
        color: '#3c6c3c',
        at: [0, 0.255, 0],
        finish: FINISH.satin,
      },

      ...Array.from(
        { length: RIBS },
        (_, index): Part => {
          const angle = (index / RIBS) * Math.PI * 2
          return {
            geometry: capsule(0.021, 0.185, 4, 12),
            color: '#4a8149',
            at: [Math.sin(angle) * 0.048, 0.25, Math.cos(angle) * 0.048],
            finish: FINISH.satin,
          }
        },
      ),

      // One arm: a stub out of the side, then a stub back up beside it.
      {
        geometry: capsule(0.024, 0.05, 4, 14),
        color: '#3c6c3c',
        at: [-0.062, 0.255, 0],
        rotate: [0, 0, Math.PI / 2],
        finish: FINISH.satin,
      },
      {
        geometry: capsule(0.024, 0.09, 4, 14),
        color: '#4a8149',
        at: [-0.098, 0.3, 0],
        finish: FINISH.satin,
      },

      // Spines, in two rings round the ribs.
      ...SPINE_RINGS.flatMap((ring) =>
        Array.from(
          { length: ring.count },
          (_, index): Part => ({
            geometry: cone(0.004, 0.014, 5),
            color: '#ddd2b4',
            spin: ((index + ring.offset) / ring.count) * Math.PI * 2,
            offset: [0.07, ring.y, 0],
            rotate: [0, 0, -Math.PI / 2],
            finish: FINISH.satin,
          }),
        ),
      ),

      // One small flower, because a cactus with a flower on it is the whole
      // reason to keep a cactus.
      ...Array.from(
        { length: 6 },
        (_, index): Part => {
          const angle = (index / 6) * Math.PI * 2
          return {
            geometry: sphere(0.014, 10, 8),
            color: '#ee7fae',
            at: [0.014, 0.383, 0.01],
            spin: angle,
            offset: [Math.sin(angle) * 0.016, 0, Math.cos(angle) * 0.016],
            scale: [1, 0.7, 1],
            finish: FINISH.satin,
          }
        },
      ),
      {
        geometry: sphere(0.011, 10, 8),
        color: '#f2c45a',
        at: [0.014, 0.383, 0.01],
        finish: FINISH.satin,
      },
    ]

    return [
      // Saucer, pot, rim, soil
      {
        geometry: cylinder(0.104, 0.096, 0.016, 24),
        color: '#a4593c',
        at: [0, 0.008, 0],
        finish: FINISH.matte,
      },
      {
        geometry: cylinder(0.088, 0.066, 0.114, 24),
        color: '#bc6a46',
        at: [0, 0.07, 0],
        finish: FINISH.matte,
      },
      {
        geometry: cylinder(0.093, 0.093, 0.024, 24),
        color: '#c97a52',
        at: [0, 0.132, 0],
        finish: FINISH.matte,
      },
      {
        geometry: cylinder(0.078, 0.078, 0.02, 20),
        color: '#37271b',
        at: [0, 0.139, 0],
        finish: FINISH.matte,
      },

      ...plant,
    ]
  }, [])

  return <Merged parts={parts} active={active} glow="#8ed08a" />
}

/* ------------------------------------------------------------------ books */

const BOOKS = [
  { w: 0.3, h: 0.032, d: 0.22, color: '#8d5f6b', rot: 0.05 },
  { w: 0.28, h: 0.028, d: 0.2, color: '#5f7d6a', rot: -0.11 },
  { w: 0.31, h: 0.026, d: 0.23, color: '#d6c6a4', rot: 0.17 },
]

export function Books({ active }: DecorProps) {
  // Three books, nine meshes, one now: the boards, the block of pages and the
  // jacket are all the same matte stock at different shades.
  const parts = useMemo<Part[]>(() => {
    let y = 0

    return BOOKS.flatMap((book): Part[] => {
      const base = y
      y += book.h + 0.01

      // Every part of one book shares the book's turn about the vertical, which
      // is what `spin` is for.
      const at: [number, number, number] = [0, base, 0]

      return [
        {
          geometry: box(book.w, 0.008, book.d),
          color: book.color,
          at,
          spin: book.rot,
          offset: [0, 0.004, 0],
          finish: FINISH.matte,
        },
        {
          geometry: box(book.w - 0.014, book.h, book.d - 0.016),
          color: '#efe6d2',
          at,
          spin: book.rot,
          offset: [0, 0.008 + book.h / 2, 0.004],
          finish: FINISH.matte,
        },
        {
          geometry: box(book.w, 0.008, book.d),
          color: book.color,
          at,
          spin: book.rot,
          offset: [0, 0.008 + book.h, 0],
          finish: FINISH.matte,
        },
      ]
    })
  }, [])

  return <Merged parts={parts} active={active} glow="#ffe3b0" />
}

/* ----------------------------------------------------------------- candle */

export function Candle({ active }: DecorProps) {
  const flame = useRef<Group>(null)
  const light = useRef<PointLight>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Two offset sines make a flicker that never quite repeats.
    const flicker = 0.86 + Math.sin(time * 11.3) * 0.09 + Math.sin(time * 27.7) * 0.05

    if (flame.current) {
      flame.current.scale.set(flicker, 0.92 + flicker * 0.14, flicker)
      flame.current.rotation.z = Math.sin(time * 9.1) * 0.1
    }
    if (light.current) {
      light.current.intensity = (active ? 1.5 : 1.05) * flicker
    }
  })

  return (
    <group>
      <mesh position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.055, 0.13, 20]} />
        <meshStandardMaterial
          color="#e8e2d4"
          roughness={0.35}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Wax inside the glass, sitting a little below the rim. */}
      <mesh position={[0, 0.062, 0]}>
        <cylinderGeometry args={[0.05, 0.048, 0.115, 18]} />
        <meshStandardMaterial color="#f6efdd" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.126, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.022, 6]} />
        <meshStandardMaterial color="#2c2620" />
      </mesh>

      <group ref={flame} position={[0, 0.15, 0]}>
        <mesh position={[0, 0.018, 0]}>
          <coneGeometry args={[0.012, 0.045, 10]} />
          <meshBasicMaterial color="#ffca70" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.008, 0]}>
          <sphereGeometry args={[0.011, 10, 8]} />
          <meshBasicMaterial color="#fff2c9" toneMapped={false} />
        </mesh>
      </group>

      <pointLight
        ref={light}
        position={[0, 0.2, 0.04]}
        color="#ffb765"
        intensity={1.05}
        distance={1.9}
        decay={2}
      />
    </group>
  )
}

/* ---------------------------------------------------------------- keyring */

const KEYS = [
  { angle: 0.3, len: 0.085 },
  { angle: 2.4, len: 0.095 },
  { angle: 4.5, len: 0.078 },
]

export function KeyRing({ active }: DecorProps) {
  // The dish is one mesh, the ring and every key on it are another.
  const parts = useMemo<Part[]>(() => {
    const at: [number, number, number] = [0, 0.028, 0]

    return [
      // The little dish they are dropped into.
      {
        geometry: cylinder(0.095, 0.075, 0.024, 24),
        color: '#efe8dc',
        at: [0, 0.012, 0],
        finish: FINISH.satin,
      },

      {
        geometry: torus(0.045, 0.006, 8, 28),
        color: '#c9a24a',
        at,
        rotate: [-Math.PI / 2, 0, 0],
        finish: FINISH.metal,
      },

      ...KEYS.flatMap(
        (key): Part[] => [
          {
            geometry: box(key.len, 0.005, 0.011),
            color: '#c9a24a',
            at,
            spin: key.angle,
            offset: [key.len / 2 + 0.04, 0.004, 0],
            finish: FINISH.metal,
          },
          {
            geometry: torus(0.015, 0.004, 6, 16),
            color: '#c9a24a',
            at,
            spin: key.angle,
            offset: [0.036, 0.004, 0],
            finish: FINISH.metal,
          },
          {
            geometry: box(0.018, 0.005, 0.008),
            color: '#c9a24a',
            at,
            spin: key.angle,
            offset: [key.len + 0.028, 0.004, 0.008],
            finish: FINISH.metal,
          },
          {
            geometry: box(0.012, 0.005, 0.008),
            color: '#c9a24a',
            at,
            spin: key.angle,
            offset: [key.len + 0.016, 0.004, -0.008],
            finish: FINISH.metal,
          },
        ],
      ),
    ]
  }, [])

  return <Merged parts={parts} active={active} glow="#ffe6ab" />
}

/* ------------------------------------------------------------------ clock */

/** Twelve, three, six and nine. Enough to read it as a clock face. */
const TICKS = [0, 1, 2, 3].map((index) => (index * Math.PI) / 2)

/**
 * A little enamel bedside clock, stopped at ten past ten.
 *
 * The most "someone lives here" object on the shelf: nobody arranges a clock,
 * it just ends up where there is room.
 */
export function Clock({ active }: DecorProps) {
  // Twelve meshes in three: the dull stock, the satin case, the brass.
  const parts = useMemo<Part[]>(() => {
    const brassAt = (x: number, y: number, z: number): [number, number, number] => [x, y, z]

    return [
      // Case: a squashed cylinder facing forward.
      {
        geometry: cylinder(0.105, 0.105, 0.052, 28),
        color: '#e6ddc9',
        at: [0, 0.115, 0.005],
        rotate: [Math.PI / 2, 0, 0],
        finish: FINISH.satin,
      },

      // Face and bezel. The torus is left in its default orientation, which
      // already faces forward — turning it on edge put a hoop round the case.
      {
        geometry: disc(0.092, 28),
        color: '#fdfaf0',
        at: [0, 0.115, 0.032],
        finish: FINISH.matte,
      },
      {
        geometry: torus(0.097, 0.008, 8, 32),
        color: '#c9a227',
        at: [0, 0.115, 0.03],
        finish: FINISH.metal,
      },

      ...TICKS.map(
        (angle): Part => ({
          geometry: box(0.006, 0.016, 0.003),
          color: '#6b6252',
          at: [Math.sin(angle) * 0.074, 0.115 + Math.cos(angle) * 0.074, 0.035],
          rotate: [0, 0, -angle],
          finish: FINISH.matte,
        }),
      ),

      // Ten past ten.
      {
        geometry: box(0.006, 0.06, 0.003),
        color: '#3b3630',
        at: [0, 0.115, 0.036],
        spin: 0.52,
        offset: [0, 0.03, 0],
        finish: FINISH.satin,
      },
      {
        geometry: box(0.007, 0.044, 0.003),
        color: '#3b3630',
        at: [0, 0.115, 0.036],
        spin: -0.61,
        offset: [0, 0.022, 0],
        finish: FINISH.satin,
      },

      // Two feet, so it stands on the plank rather than floating.
      ...[-0.062, 0.062].map(
        (x): Part => ({
          geometry: cylinder(0.013, 0.013, 0.04, 10),
          color: '#c9a227',
          at: brassAt(x, 0.02, 0.008),
          finish: FINISH.metal,
        }),
      ),

      // Bells on top.
      ...[-0.045, 0.045].map(
        (x): Part => ({
          geometry: sphere(0.022, 14, 10),
          color: '#c9a227',
          at: [x, 0.22, 0],
          finish: FINISH.metal,
        }),
      ),
      {
        geometry: cylinder(0.008, 0.008, 0.016, 10),
        color: '#c9a227',
        at: [0, 0.232, 0],
        finish: FINISH.metal,
      },
    ]
  }, [])

  return <Merged parts={parts} active={active} glow="#ffe6ab" />
}

/* -------------------------------------------------------------- heartsjar */

const JAR_HEARTS = [
  { x: -0.038, y: 0.032, z: 0.012, rot: 0.4, size: 0.062, color: '#ff4d8d' },
  { x: 0.034, y: 0.036, z: -0.02, rot: -0.8, size: 0.07, color: '#e83f6f' },
  { x: -0.005, y: 0.03, z: -0.045, rot: 1.6, size: 0.058, color: '#ff7aa8' },
  { x: 0.042, y: 0.026, z: 0.038, rot: 2.7, size: 0.054, color: '#ff4d8d' },
  { x: -0.048, y: 0.062, z: -0.028, rot: -1.4, size: 0.056, color: '#ffd166' },
  { x: 0.012, y: 0.072, z: 0.02, rot: 0.9, size: 0.062, color: '#ff4d8d' },
]

export function HeartsJar({ active }: DecorProps) {
  // Glass, hearts and lid: three meshes, and the hearts keep a light of their
  // own because being lit from inside is the whole point of them.
  const parts = useMemo<Part[]>(() => {
    const heart = createHeartGeometry(1, 0.3)

    return [
      // Barely-there glass, drawn from both sides because it is a shell.
      {
        geometry: cylinder(0.096, 0.088, 0.2, 24, 1, true),
        color: '#cfe6f2',
        at: [0, 0.105, 0],
        finish: FINISH.glass,
      },
      {
        geometry: cylinder(0.088, 0.088, 0.012, 24),
        color: '#cfe6f2',
        at: [0, 0.006, 0],
        finish: FINISH.glass,
      },

      // The hearts. Each needs its own copy, because the merge consumes them.
      ...JAR_HEARTS.map(
        (jarHeart): Part => ({
          geometry: heart.clone(),
          color: jarHeart.color,
          at: [jarHeart.x, jarHeart.y, jarHeart.z],
          rotate: [Math.PI, jarHeart.rot, 0],
          scale: jarHeart.size,
          finish: FINISH.ember,
        }),
      ),

      {
        geometry: cylinder(0.1, 0.1, 0.026, 24),
        color: '#c9a24a',
        at: [0, 0.218, 0],
        finish: FINISH.metal,
      },
    ]
  }, [])

  return <Merged parts={parts} active={active} glow="#ffd9a8" />
}

/* --------------------------------------------------------------- polaroid */

export function Polaroid({ active }: DecorProps) {
  const photo = useCanvasTexture(256, 256, paintPhoto, 2)
  const frame = useRef<Group>(null)

  useFrame((state) => {
    if (!frame.current) return
    // Leaning on a wall, it never sits quite flat.
    frame.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.006
  })

  return (
    <group ref={frame} rotation={[-0.16, 0.05, 0]} position={[0, 0, -0.03]}>
      <mesh position={[0, 0.095, 0]} castShadow>
        <boxGeometry args={[0.16, 0.19, 0.006]} />
        <meshStandardMaterial
          color="#f7f3ec"
          roughness={0.85}
          emissive={active ? '#ffd9a8' : '#000000'}
          emissiveIntensity={active ? 0.14 : 0}
        />
      </mesh>

      {/* A little proud of the frame's face rather than flush, so the two
          surfaces never fight for the same depth. */}
      <mesh position={[0, 0.111, 0.006]}>
        <planeGeometry args={[0.132, 0.132]} />
        <meshStandardMaterial map={photo} roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- succulent */

export function Succulent({ active }: DecorProps) {
  // Pot, soil and the two rings of leaves, in two meshes.
  const parts = useMemo<Part[]>(() => {
    const petals = Array.from({ length: 10 }, (_, index) => {
      const ring = index < 6 ? 0 : 1
      const perRing = ring === 0 ? 6 : 4
      return {
        angle: ((index % perRing) / perRing) * Math.PI * 2 + ring * 0.5,
        radius: ring === 0 ? 0.026 : 0.05,
        tilt: ring === 0 ? 0.75 : 1.15,
      }
    })

    return [
      {
        geometry: cylinder(0.058, 0.046, 0.1, 18),
        color: '#c98e77',
        at: [0, 0.05, 0],
        finish: FINISH.matte,
      },
      {
        geometry: cylinder(0.061, 0.061, 0.014, 18),
        color: '#d6a189',
        at: [0, 0.103, 0],
        finish: FINISH.matte,
      },
      {
        geometry: cylinder(0.052, 0.052, 0.014, 14),
        color: '#3b2c22',
        at: [0, 0.108, 0],
        finish: FINISH.matte,
      },

      ...petals.map(
        (petal): Part => ({
          geometry: sphere(1, 10, 8),
          color: '#5f9c72',
          spin: petal.angle,
          offset: [0, 0.13, petal.radius],
          rotate: [petal.tilt, 0, 0],
          scale: [0.026, 0.03, 0.014],
          finish: FINISH.satin,
        }),
      ),

      {
        geometry: sphere(1, 10, 8),
        color: '#7cb389',
        at: [0, 0.142, 0],
        scale: [0.022, 0.024, 0.022],
        finish: FINISH.satin,
      },
    ]
  }, [])

  return <Merged parts={parts} active={active} glow="#a8dda9" />
}
