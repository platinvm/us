import { useEffect, useId, useMemo } from 'react'
import type { Part } from './parts'
import { mergeParts } from './parts'

/**
 * Draws a part list as the smallest number of meshes it can be drawn in.
 *
 * One mesh per finish, with the colours in the vertices. See `parts.ts` for why
 * this matters — the short version is that the shelf is charged per object, not
 * per pixel, and a cactus is thirty of them.
 *
 * `glow` is what a part list gives up by being merged: it can no longer change
 * a single part's colour on hover, because the colours are in the geometry. A
 * light of its own, on all of it at once, is what stands in — which is what the
 * poke was doing anyway, on top of the lift and the sparks.
 */
export function Merged({
  parts,
  glow = '#ffd9a8',
  active = false,
  castShadow = true,
  receiveShadow = true,
}: {
  parts: Part[]
  /** Emissive tint while the object is hovered or being poked. */
  glow?: string
  active?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const batches = useMemo(() => mergeParts(parts), [parts])

  // Batch keys are shared across every object that uses the same finishes, so
  // they are namespaced per instance — two merged objects are free to sit side
  // by side without one of them claiming the other's chunks.
  const id = useId()

  useEffect(
    () => () => {
      for (const batch of batches) batch.geometry.dispose()
    },
    [batches],
  )

  return (
    <>
      {batches.map((batch) => {
        const { finish } = batch

        return (
          <mesh
            key={`${id}-${batch.key}`}
            geometry={batch.geometry}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
          >
            <meshStandardMaterial
              vertexColors
              color="#ffffff"
              roughness={finish.roughness}
              metalness={finish.metalness ?? 0}
              transparent={finish.transparent ?? false}
              opacity={finish.opacity ?? 1}
              depthWrite={finish.depthWrite ?? true}
              side={finish.side}
              emissive={active ? glow : (finish.emissive ?? '#000000')}
              emissiveIntensity={active ? 0.22 : (finish.emissiveIntensity ?? 0)}
            />
          </mesh>
        )
      })}
    </>
  )
}
