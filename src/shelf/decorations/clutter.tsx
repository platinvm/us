import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Merged } from '../Merged'
import { FINISH, cylinder, plane, sphere, torus } from '../parts'
import type { Part } from '../parts'
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
  // Body and handle are the same glaze; the coffee is its own surface.
  const parts = useMemo<Part[]>(() => {
    const at: [number, number, number] = [0, 0.048, 0]

    return [
      {
        geometry: cylinder(0.072, 0.062, 0.096, 22),
        color: '#ddc9b4',
        at,
        finish: FINISH.satin,
      },

      // Handle
      {
        geometry: torus(0.028, 0.008, 8, 18, Math.PI * 1.35),
        color: '#ddc9b4',
        at: [0.076, 0.05, 0],
        rotate: [0, 0, Math.PI / 2],
        finish: FINISH.satin,
      },

      // What is left in the bottom
      {
        geometry: cylinder(0.062, 0.062, 0.008, 22),
        color: '#3c2a1e',
        at: [0, 0.086, 0],
        finish: FINISH.glossy,
      },
    ]
  }, [])

  return <Merged parts={parts} active={active} glow="#ffdcb0" />
}

/** Cards that fell out of the binder and were never filed back. */
export function LooseCards({ active }: DecorProps) {
  // Six flat cards in one mesh. Flat stock is its own finish because a plane
  // has to be drawn from both sides, and that is a property of the material.
  const parts = useMemo<Part[]>(() => {
    const cards = [
      { x: -0.02, z: 0.01, yaw: 0.34, top: '#3f4a86', lip: 0.0018 },
      { x: 0.006, z: -0.006, yaw: 0.12, top: '#7a2f52', lip: 0.0036 },
      { x: 0.03, z: 0.02, yaw: -0.24, top: '#2f5c46', lip: 0.0054 },
    ]

    return cards.flatMap(
      (card): Part[] => [
        {
          geometry: plane(CARD_W, CARD_H),
          color: card.top,
          at: [card.x, card.lip, card.z],
          spin: card.yaw,
          rotate: [-Math.PI / 2, 0, 0],
          finish: FINISH.sheet,
        },
        // The pale edge of the card stock
        {
          geometry: plane(CARD_W + 0.004, CARD_H + 0.004),
          color: '#efe9dc',
          at: [card.x, card.lip, card.z],
          spin: card.yaw,
          offset: [0, -0.0007, 0],
          rotate: [-Math.PI / 2, 0, 0],
          finish: FINISH.sheet,
        },
      ],
    )
  }, [])

  return <Merged parts={parts} active={active} glow="#e6dcff" />
}

/** Earbuds, still tangled exactly as they came out of a pocket. */
export function Earbuds({ active }: DecorProps) {
  const coil = useRef<Group>(null)

  useFrame((state) => {
    if (!coil.current) return
    coil.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.04
  })

  // The two buds, in one mesh. The coil stays on its own because it sways.
  const buds = useMemo<Part[]>(
    () =>
      [
        { x: 0.05, z: -0.03, yaw: 0.6 },
        { x: -0.046, z: -0.042, yaw: -0.9 },
      ].flatMap((bud): Part[] => {
        const at: [number, number, number] = [bud.x, 0.011, bud.z]

        return [
          {
            geometry: sphere(1, 12, 10),
            color: '#f2f2f6',
            at,
            spin: bud.yaw,
            scale: [0.014, 0.012, 0.01],
            finish: FINISH.satin,
          },
          {
            geometry: cylinder(0.007, 0.005, 0.014, 8),
            color: '#c8c8d0',
            at,
            spin: bud.yaw,
            offset: [0.016, 0, 0],
            rotate: [0, 0, Math.PI / 2],
            finish: FINISH.satin,
          },
        ]
      }),
    [],
  )

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

      <Merged parts={buds} active={active} glow="#dfe2ee" />
    </group>
  )
}

/** A small tin of something or other. */
export function Tin({ active }: DecorProps) {
  const parts = useMemo<Part[]>(() => [
    {
      geometry: cylinder(0.062, 0.062, 0.038, 24),
      color: '#8f9bb0',
      at: [0, 0.019, 0],
      finish: FINISH.metal,
    },
    {
      geometry: cylinder(0.065, 0.065, 0.008, 24),
      color: '#aab6c9',
      at: [0, 0.041, 0],
      finish: FINISH.metal,
    },
  ], [])

  return <Merged parts={parts} active={active} glow="#cfe0ff" />
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
