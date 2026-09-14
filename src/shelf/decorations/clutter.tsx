import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { DecorProps } from './types'

/**
 * The clutter.
 *
 * A shelf that only holds curated objects looks like a shop display. What makes
 * one look lived in is the layer underneath: the mug that never made it back to
 * the kitchen, a hair tie, a couple of cards that fell out of the binder, a tin
 * of something, the earbuds you took out and put down.
 *
 * All of it is small, none of it is labelled, and all of it can be poked.
 */

const CARD_W = 0.09
const CARD_H = (CARD_W * 35) / 25

/** A mug somebody forgot to take back downstairs. */
export function Mug({ active }: DecorProps) {
  return (
    <group>
      <mesh position={[0, 0.048, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.072, 0.062, 0.096, 22]} />
        <meshStandardMaterial
          color={active ? '#e8d6c4' : '#ddc9b4'}
          roughness={0.72}
          emissive={active ? '#5a3a24' : '#000000'}
          emissiveIntensity={active ? 0.25 : 0}
        />
      </mesh>

      {/* Handle */}
      <mesh position={[0.076, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.028, 0.008, 8, 18, Math.PI * 1.35]} />
        <meshStandardMaterial color="#ddc9b4" roughness={0.72} />
      </mesh>

      {/* What is left in the bottom */}
      <mesh position={[0, 0.086, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.008, 22]} />
        <meshStandardMaterial color="#3c2a1e" roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Cards that fell out of the binder and were never filed back. */
export function LooseCards({ active }: DecorProps) {
  const cards = [
    { x: -0.02, z: 0.01, yaw: 0.34, top: '#3f4a86', lip: 0.0018 },
    { x: 0.006, z: -0.006, yaw: 0.12, top: '#7a2f52', lip: 0.0036 },
    { x: 0.03, z: 0.02, yaw: -0.24, top: '#2f5c46', lip: 0.0054 },
  ]

  return (
    <group>
      {cards.map((card) => (
        <group key={card.top} position={[card.x, card.lip, card.z]} rotation={[0, card.yaw, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[CARD_W, CARD_H]} />
            <meshStandardMaterial
              color={card.top}
              roughness={0.5}
              side={2}
              emissive={active ? card.top : '#000000'}
              emissiveIntensity={active ? 0.35 : 0}
            />
          </mesh>
          {/* The pale edge of the card stock */}
          <mesh position={[0, -0.0007, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[CARD_W + 0.004, CARD_H + 0.004]} />
            <meshStandardMaterial color="#efe9dc" roughness={0.9} side={2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Earbuds, still tangled exactly as they came out of a pocket. */
export function Earbuds({ active }: DecorProps) {
  const coil = useRef<Group>(null)

  useFrame((state) => {
    if (!coil.current) return
    coil.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.04
  })

  return (
    <group>
      <group ref={coil}>
        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <torusGeometry args={[0.042, 0.004, 6, 26]} />
          <meshStandardMaterial
            color={active ? '#f0f0f4' : '#dcdce2'}
            roughness={0.6}
            emissive={active ? '#8a8a9a' : '#000000'}
            emissiveIntensity={active ? 0.3 : 0}
          />
        </mesh>
        <mesh position={[0.008, 0.016, 0.03]} rotation={[-Math.PI / 2, 0, 1.1]}>
          <torusGeometry args={[0.028, 0.0038, 6, 22]} />
          <meshStandardMaterial color="#dcdce2" roughness={0.6} />
        </mesh>
      </group>

      {[
        { x: 0.05, z: -0.03, yaw: 0.6 },
        { x: -0.046, z: -0.042, yaw: -0.9 },
      ].map((bud) => (
        <group key={bud.x} position={[bud.x, 0.011, bud.z]} rotation={[0, bud.yaw, 0]}>
          <mesh scale={[0.014, 0.012, 0.01]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#f2f2f6" roughness={0.45} />
          </mesh>
          <mesh position={[0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.007, 0.005, 0.014, 8]} />
            <meshStandardMaterial color="#c8c8d0" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A small tin of something or other. */
export function Tin({ active }: DecorProps) {
  return (
    <group>
      <mesh position={[0, 0.019, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.038, 24]} />
        <meshStandardMaterial color="#8f9bb0" metalness={0.72} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.041, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.008, 24]} />
        <meshStandardMaterial
          color={active ? '#d7e0ee' : '#aab6c9'}
          metalness={0.8}
          roughness={0.32}
          emissive={active ? '#7f8ea6' : '#000000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
    </group>
  )
}

/** A smooth stone, because everyone has one. */
export function Pebble({ active }: DecorProps) {
  const spin = useRef<Group>(null)

  useFrame((state) => {
    if (!spin.current) return
    spin.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.06
  })

  return (
    <group ref={spin}>
      <mesh
        position={[0, 0.022, 0]}
        scale={[0.052, 0.026, 0.038]}
        rotation={[0, 0.6, 0]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color={active ? '#9d968c' : '#8a847b'}
          roughness={0.92}
          emissive={active ? '#5c564e' : '#000000'}
          emissiveIntensity={active ? 0.28 : 0}
        />
      </mesh>
    </group>
  )
}
