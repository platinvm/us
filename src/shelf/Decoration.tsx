import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'
import type { DecorationDefinition } from './decorations/types'
import { onPoke } from './poke'
import { beginMoving } from './sceneMotion'
import { useShelf } from './shelfState'

/**
 * Wraps a decoration with the things that make it feel like an object rather
 * than scenery: it lifts when you point at it, wobbles when you poke it, and
 * throws a handful of sparks.
 *
 * There is deliberately no label anywhere — no floating name, no plaque. You
 * find out what something is by poking it.
 */

/** Value the wobble timer sits at while idle, so nothing oscillates at rest. */
const AT_REST = 10

function Sparkles({ color }: { color: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        vx: (Math.random() - 0.5) * 0.72,
        vy: 0.4 + Math.random() * 0.7,
        vz: (Math.random() - 0.5) * 0.72,
        size: 0.007 + Math.random() * 0.011,
        delay: Math.random() * 0.16,
      })),
    [],
  )

  const meshes = useRef<(Mesh | null)[]>([])
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    elapsed.current += delta

    for (let index = 0; index < parts.length; index += 1) {
      const mesh = meshes.current[index]
      if (!mesh) continue

      const part = parts[index]
      const t = Math.max(0, elapsed.current - part.delay)
      mesh.position.set(
        part.vx * t,
        0.11 + part.vy * t - 1.35 * t * t,
        part.vz * t,
      )
      mesh.scale.setScalar(Math.max(0, 1 - t / 1.05))
      mesh.rotation.x += delta * 4
      mesh.rotation.y += delta * 3.2
    }
  })

  return (
    <>
      {parts.map((part, index) => (
        <mesh
          key={`spark-${index}`}
          ref={(element) => {
            meshes.current[index] = element
          }}
        >
          <octahedronGeometry args={[part.size]} />
          <meshBasicMaterial color={color} transparent toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

export function Decoration({
  definition,
  position,
  yaw = 0,
  roll = 0,
  scale = 1,
  wobble = true,
}: {
  definition: DecorationDefinition
  position: [number, number, number]
  /** Rotation about the vertical. Nothing on a real shelf is square to the wall. */
  yaw?: number
  /** Roll, for things lying down. */
  roll?: number
  scale?: number
  /** Off for pieces that animate themselves, like the flame and the photo. */
  wobble?: boolean
}) {
  const { Component, footprint } = definition

  const { busy } = useShelf()

  const [hovered, setHovered] = useState(false)
  const [poked, setPoked] = useState(false)
  const [burst, setBurst] = useState(0)

  const group = useRef<Group>(null)
  const pokeAge = useRef(AT_REST)
  const lift = useRef(0)
  const settle = useRef<number | undefined>(undefined)

  useCursor(hovered)

  const trigger = useCallback(() => {
    // A poke has to finish wobbling before the next one lands, and nothing gets
    // to start while the shelf itself is mid-movement.
    if (busy || pokeAge.current < 0.45) return

    pokeAge.current = 0
    setBurst(Date.now())
    setPoked(true)
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      setPoked(false)
      setBurst(0)
    }, 900)
  }, [busy])

  useEffect(() => onPoke(definition.id, trigger), [definition.id, trigger])
  useEffect(() => () => window.clearTimeout(settle.current), [])

  // A poke and a hover both move the piece, so its shadow has to keep up with
  // it rather than sitting where it was before.
  useEffect(() => {
    if (!poked && !hovered) return
    return beginMoving()
  }, [poked, hovered])

  useFrame((_, delta) => {
    const node = group.current
    if (!node) return

    pokeAge.current += delta
    // A gentler decay and slower oscillations, so a poke reads as a nudge
    // settling down rather than a jolt.
    const decay = Math.exp(-pokeAge.current * 2.6)

    if (wobble) {
      node.rotation.z = Math.sin(pokeAge.current * 12) * 0.17 * decay
      node.rotation.x = Math.cos(pokeAge.current * 9) * 0.09 * decay
    }

    const wanted = hovered ? 0.022 : 0
    lift.current += (wanted - lift.current) * Math.min(1, delta * 7)
    node.position.y = lift.current + Math.sin(pokeAge.current * 14) * 0.014 * decay
  })

  return (
    <group position={position} rotation={[0, yaw, roll]} scale={scale}>
      <group ref={group}>
        <Component active={hovered || poked} />

        {/* Generous target so small things are still easy to poke. Scaled with
            the decoration, or the hitbox drifts off a scaled-up item. */}
        <mesh
          position={[0, (footprint[1] * scale) / 2, 0]}
          onPointerOver={(event) => {
            if (event.pointerType === 'touch') return
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            event.stopPropagation()
            trigger()
          }}
        >
          <boxGeometry
            args={[footprint[0] * scale, footprint[1] * scale, footprint[2] * scale]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>

      {burst > 0 ? <Sparkles key={burst} color="#ffe9b8" /> : null}
    </group>
  )
}
