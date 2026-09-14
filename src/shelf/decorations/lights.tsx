import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, Mesh, MeshStandardMaterial } from 'three'

const BULB_COUNT = 14

/**
 * A string of warm bulbs sagging across the wall above the shelf.
 *
 * The bulbs sit on the same curve the wire follows, so the two can never
 * disagree, and only the bulbs emit — one point light stands in for the whole
 * string rather than fourteen.
 */
export function Fairylights({
  width,
  y,
  z,
}: {
  width: number
  y: number
  z: number
}) {
  const bulbs = useMemo(
    () =>
      Array.from({ length: BULB_COUNT }, (_, index) => {
        const t = index / (BULB_COUNT - 1)
        return {
          key: `bulb-${index}`,
          x: (t - 0.5) * width,
          y: y - Math.sin(t * Math.PI) * 0.32,
          z,
        }
      }),
    [width, y, z],
  )

  const group = useRef<Group>(null)

  useFrame((state) => {
    const node = group.current
    if (!node) return

    const time = state.clock.elapsedTime
    node.children.forEach((child, index) => {
      const mesh = child as Mesh
      const material = mesh.material as MeshStandardMaterial
      if (!material || material.emissiveIntensity === undefined) return
      material.emissiveIntensity = 1.15 + Math.sin(time * 1.4 + index * 0.9) * 0.5
    })
  })

  return (
    <group>
      <group ref={group}>
        {bulbs.map((bulb) => (
          <mesh key={bulb.key} position={[bulb.x, bulb.y, bulb.z]}>
            <sphereGeometry args={[0.017, 10, 8]} />
            <meshStandardMaterial
              color="#ffdca6"
              emissive="#ffb65e"
              emissiveIntensity={1.15}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>

      <pointLight
        position={[0, y - 0.42, z + 0.3]}
        color="#ffc07a"
        intensity={1.1}
        distance={4.2}
        decay={2}
      />
    </group>
  )
}
