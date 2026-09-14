import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'
import { FINISH, mergeParts, sphere } from '../parts'
import type { Part } from '../parts'

const BULB_COUNT = 14

/**
 * A string of warm bulbs sagging across the wall above the shelf.
 *
 * The bulbs sit on the same curve the wire follows, so the two can never
 * disagree, and only the bulbs emit — one point light stands in for the whole
 * string rather than fourteen.
 *
 * Fourteen bulbs used to mean fourteen meshes, each with its own material,
 * each poked once a frame to change one number. They are now two welded meshes
 * — alternating bulbs, so the string still shimmers along its length instead of
 * blinking as one — which gives the whole string two materials to animate.
 * That is the same picture for a fourteenth of the work.
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
  const strands = useMemo(() => {
    const halves: Part[][] = [[], []]

    for (let index = 0; index < BULB_COUNT; index += 1) {
      const t = index / (BULB_COUNT - 1)
      halves[index % 2].push({
        geometry: sphere(0.017, 10, 8),
        color: '#ffdca6',
        at: [(t - 0.5) * width, y - Math.sin(t * Math.PI) * 0.32, z],
        finish: FINISH.satin,
      })
    }

    return halves.map((parts) => mergeParts(parts)[0])
  }, [width, y, z])

  const meshes = useRef<(Mesh | null)[]>([])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // The two halves breathe out of step, which is what makes it read as a
    // string being blown about rather than a bulb being switched.
    meshes.current.forEach((mesh, index) => {
      const material = mesh?.material as MeshStandardMaterial | undefined
      if (!material) return
      material.emissiveIntensity = 1.15 + Math.sin(time * 1.4 + index * Math.PI) * 0.5
    })
  })

  return (
    <group>
      {strands.map((batch, index) => (
        <mesh
          // Not the batch's own key: both halves come out of the same finish,
          // so they would arrive at the parent with the same name.
          key={`strand-${index}`}
          ref={(element) => {
            meshes.current[index] = element
          }}
          geometry={batch.geometry}
        >
          <meshStandardMaterial
            vertexColors
            color="#ffffff"
            roughness={batch.finish.roughness}
            emissive="#ffb65e"
            emissiveIntensity={1.15}
          />
        </mesh>
      ))}

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
