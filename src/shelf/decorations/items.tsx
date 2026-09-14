import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide } from 'three'
import type { Group, PointLight } from 'three'
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
  const skin = active ? '#5d9a52' : '#4a8149'
  const core = active ? '#4a8043' : '#3c6c3c'
  const spine = active ? '#fff3cf' : '#ddd2b4'

  return (
    <group>
      {/* Saucer, pot, rim, soil */}
      <mesh position={[0, 0.008, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.104, 0.096, 0.016, 24]} />
        <meshStandardMaterial color="#a4593c" roughness={0.86} />
      </mesh>

      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.088, 0.066, 0.114, 24]} />
        <meshStandardMaterial color="#bc6a46" roughness={0.82} />
      </mesh>

      <mesh position={[0, 0.132, 0]} castShadow>
        <cylinderGeometry args={[0.093, 0.093, 0.024, 24]} />
        <meshStandardMaterial color="#c97a52" roughness={0.74} />
      </mesh>

      <mesh position={[0, 0.139, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.02, 20]} />
        <meshStandardMaterial color="#37271b" roughness={1} />
      </mesh>

      {/* Body: a plain core with nine slimmer capsules standing around it. The
          ring of them is what makes the ribs — a single tube reads as a
          cucumber however it is shaded. */}
      <mesh position={[0, 0.255, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.15, 6, 20]} />
        <meshStandardMaterial color={core} roughness={0.74} />
      </mesh>

      {Array.from({ length: RIBS }, (_, index) => {
        const angle = (index / RIBS) * Math.PI * 2
        return (
          <mesh
            key={`rib-${index}`}
            position={[Math.sin(angle) * 0.048, 0.25, Math.cos(angle) * 0.048]}
            castShadow
          >
            <capsuleGeometry args={[0.021, 0.185, 4, 12]} />
            <meshStandardMaterial color={skin} roughness={0.66} />
          </mesh>
        )
      })}

      {/* One arm: a stub out of the side, then a stub back up beside it. */}
      <mesh position={[-0.062, 0.255, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.024, 0.05, 4, 14]} />
        <meshStandardMaterial color={core} roughness={0.68} />
      </mesh>

      <mesh position={[-0.098, 0.3, 0]} castShadow>
        <capsuleGeometry args={[0.024, 0.09, 4, 14]} />
        <meshStandardMaterial color={skin} roughness={0.66} />
      </mesh>

      {SPINE_RINGS.flatMap((ring) =>
        Array.from({ length: ring.count }, (_, index) => {
          const angle = ((index + ring.offset) / ring.count) * Math.PI * 2
          return (
            <group key={`spine-${ring.y}-${index}`} rotation={[0, angle, 0]}>
              <mesh position={[0.07, ring.y, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.004, 0.014, 5]} />
                <meshStandardMaterial color={spine} roughness={0.55} />
              </mesh>
            </group>
          )
        }),
      )}

      {/* One small flower, because a cactus with a flower on it is the whole
          reason to keep a cactus. */}
      <group position={[0.014, 0.383, 0.01]}>
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * Math.PI * 2
          return (
            <mesh
              key={`petal-${index}`}
              position={[Math.sin(angle) * 0.016, 0, Math.cos(angle) * 0.016]}
              scale={[1, 0.7, 1]}
            >
              <sphereGeometry args={[0.014, 10, 8]} />
              <meshStandardMaterial
                color={active ? '#ff9ec6' : '#ee7fae'}
                roughness={0.5}
                emissive={active ? '#ff6ba8' : '#000000'}
                emissiveIntensity={active ? 0.45 : 0}
              />
            </mesh>
          )
        })}

        <mesh>
          <sphereGeometry args={[0.011, 10, 8]} />
          <meshStandardMaterial color="#f2c45a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ books */

const BOOKS = [
  { w: 0.3, h: 0.032, d: 0.22, color: '#8d5f6b', rot: 0.05 },
  { w: 0.28, h: 0.028, d: 0.2, color: '#5f7d6a', rot: -0.11 },
  { w: 0.31, h: 0.026, d: 0.23, color: '#d6c6a4', rot: 0.17 },
]

export function Books({ active }: DecorProps) {
  let y = 0
  return (
    <group>
      {BOOKS.map((book, index) => {
        const base = y
        y += book.h + 0.01
        return (
          <group
            key={`book-${index}`}
            position={[0, base, 0]}
            rotation={[0, book.rot, 0]}
          >
            <mesh position={[0, 0.004, 0]} castShadow>
              <boxGeometry args={[book.w, 0.008, book.d]} />
              <meshStandardMaterial color={book.color} roughness={0.78} />
            </mesh>
            <mesh position={[0, 0.008 + book.h / 2, 0.004]}>
              <boxGeometry args={[book.w - 0.014, book.h, book.d - 0.016]} />
              <meshStandardMaterial color="#efe6d2" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.008 + book.h, 0]} castShadow>
              <boxGeometry args={[book.w, 0.008, book.d]} />
              <meshStandardMaterial
                color={book.color}
                roughness={0.72}
                emissive={active ? book.color : '#000000'}
                emissiveIntensity={active ? 0.18 : 0}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
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
  const brass = active ? '#f0c268' : '#c9a24a'

  return (
    <group>
      {/* The little dish they are dropped into */}
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <cylinderGeometry args={[0.095, 0.075, 0.024, 24]} />
        <meshStandardMaterial color="#efe8dc" roughness={0.45} />
      </mesh>

      <group position={[0, 0.028, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.045, 0.006, 8, 28]} />
          <meshStandardMaterial color={brass} metalness={0.95} roughness={0.25} />
        </mesh>

        {KEYS.map((key, index) => (
          <group key={`key-${index}`} rotation={[0, key.angle, 0]}>
            <mesh position={[key.len / 2 + 0.04, 0.004, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[key.len, 0.005, 0.011]} />
              <meshStandardMaterial color={brass} metalness={0.9} roughness={0.3} />
            </mesh>

            <mesh position={[0.036, 0.004, 0]}>
              <torusGeometry args={[0.015, 0.004, 6, 16]} />
              <meshStandardMaterial color={brass} metalness={0.9} roughness={0.3} />
            </mesh>

            <mesh position={[key.len + 0.028, 0.004, 0.008]}>
              <boxGeometry args={[0.018, 0.005, 0.008]} />
              <meshStandardMaterial color={brass} metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[key.len + 0.016, 0.004, -0.008]}>
              <boxGeometry args={[0.012, 0.005, 0.008]} />
              <meshStandardMaterial color={brass} metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
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
  const brass = active ? '#f0cd6a' : '#c9a227'

  return (
    <group>
      {/* Case: a squashed cylinder facing forward */}
      <mesh position={[0, 0.115, 0.005]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.105, 0.105, 0.052, 28]} />
        <meshStandardMaterial color="#e6ddc9" roughness={0.45} metalness={0.1} />
      </mesh>

      {/* Face and bezel. The torus is left in its default orientation, which
          already faces forward — turning it on edge put a hoop round the case. */}
      <mesh position={[0, 0.115, 0.032]}>
        <circleGeometry args={[0.092, 28]} />
        <meshStandardMaterial color="#fdfaf0" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.115, 0.03]}>
        <torusGeometry args={[0.097, 0.008, 8, 32]} />
        <meshStandardMaterial color={brass} metalness={0.85} roughness={0.28} />
      </mesh>

      {TICKS.map((angle) => (
        <mesh
          key={`tick-${angle}`}
          position={[Math.sin(angle) * 0.074, 0.115 + Math.cos(angle) * 0.074, 0.035]}
          rotation={[0, 0, -angle]}
        >
          <boxGeometry args={[0.006, 0.016, 0.003]} />
          <meshStandardMaterial color="#6b6252" roughness={0.7} />
        </mesh>
      ))}

      {/* Ten past ten */}
      <group position={[0, 0.115, 0.036]} rotation={[0, 0, 0.52]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.006, 0.06, 0.003]} />
          <meshStandardMaterial color="#3b3630" roughness={0.6} />
        </mesh>
      </group>

      <group position={[0, 0.115, 0.036]} rotation={[0, 0, -0.61]}>
        <mesh position={[0, 0.022, 0]}>
          <boxGeometry args={[0.007, 0.044, 0.003]} />
          <meshStandardMaterial color="#3b3630" roughness={0.6} />
        </mesh>
      </group>

      {/* Two feet, so it stands on the plank rather than floating */}
      {[-0.062, 0.062].map((x) => (
        <mesh key={`foot-${x}`} position={[x, 0.02, 0.008]} castShadow>
          <cylinderGeometry args={[0.013, 0.013, 0.04, 10]} />
          <meshStandardMaterial color={brass} metalness={0.8} roughness={0.35} />
        </mesh>
      ))}

      {/* Bells on top */}
      {[-0.045, 0.045].map((x) => (
        <mesh key={`bell-${x}`} position={[x, 0.22, 0]} castShadow>
          <sphereGeometry args={[0.022, 14, 10]} />
          <meshStandardMaterial color={brass} metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      <mesh position={[0, 0.232, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.016, 10]} />
        <meshStandardMaterial color={brass} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  )
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
  const geometry = useMemo(() => createHeartGeometry(1, 0.3), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      {/* Glass */}
      <mesh position={[0, 0.105, 0]} castShadow>
        <cylinderGeometry args={[0.096, 0.088, 0.2, 24, 1, true]} />
        <meshStandardMaterial
          color="#cfe6f2"
          roughness={0.06}
          metalness={0.05}
          transparent
          opacity={0.22}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.088, 0.088, 0.012, 24]} />
        <meshStandardMaterial
          color="#cfe6f2"
          roughness={0.08}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Hearts */}
      {JAR_HEARTS.map((heart, index) => (
        <mesh
          key={`heart-${index}`}
          geometry={geometry}
          position={[heart.x, heart.y, heart.z]}
          rotation={[Math.PI, heart.rot, 0]}
          scale={heart.size}
        >
          <meshStandardMaterial
            color={heart.color}
            roughness={0.45}
            emissive={heart.color}
            emissiveIntensity={active ? 0.28 : 0.06}
          />
        </mesh>
      ))}

      {/* Lid */}
      <mesh position={[0, 0.218, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.026, 24]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.92} roughness={0.3} />
      </mesh>
    </group>
  )
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
  const petals = Array.from({ length: 10 }, (_, index) => {
    const ring = index < 6 ? 0 : 1
    const perRing = ring === 0 ? 6 : 4
    const angle = ((index % perRing) / perRing) * Math.PI * 2 + ring * 0.5
    const radius = ring === 0 ? 0.026 : 0.05
    const tilt = ring === 0 ? 0.75 : 1.15
    return { angle, radius, tilt, key: `petal-${index}` }
  })

  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.058, 0.046, 0.1, 18]} />
        <meshStandardMaterial color="#c98e77" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.103, 0]}>
        <cylinderGeometry args={[0.061, 0.061, 0.014, 18]} />
        <meshStandardMaterial color="#d6a189" roughness={0.75} />
      </mesh>

      <mesh position={[0, 0.108, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.014, 14]} />
        <meshStandardMaterial color="#3b2c22" roughness={1} />
      </mesh>

      {petals.map((petal) => (
        <group key={petal.key} rotation={[0, petal.angle, 0]}>
          <mesh
            position={[0, 0.13, petal.radius]}
            rotation={[petal.tilt, 0, 0]}
            scale={[0.026, 0.03, 0.014]}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial
              color={active ? '#7fb98a' : '#5f9c72'}
              roughness={0.5}
              emissive={active ? '#3f7a52' : '#000000'}
              emissiveIntensity={active ? 0.45 : 0}
            />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.142, 0]} scale={[0.022, 0.024, 0.022]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={active ? '#9ccfa4' : '#7cb389'} roughness={0.45} />
      </mesh>
    </group>
  )
}
