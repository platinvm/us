import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { SHELF, bracketOffsets, rowY } from './layout'
import { Merged } from './Merged'
import { PALETTE } from './palette'
import { FINISH, box, cylinder } from './parts'
import type { Part } from './parts'

/**
 * The wall shelf: planks on brackets, and nothing else.
 *
 * No side panels, no backboard, no plinth — the wall is the back and the room
 * continues past either end. Everything a floor-standing unit would need to
 * look finished would also make it look like furniture instead of a shelf
 * someone screwed to their bedroom wall.
 */

const WALL_Z = -SHELF.depth / 2 + 0.014

/**
 * One bracket, as the parts it is made of.
 *
 * Screw heads and all. They are a fraction of a pixel from a sofa, but the
 * bracket is one welded mesh now, so detail that used to cost two draws per
 * bracket costs nothing at all.
 */
function bracketParts(x: number): Part[] {
  // Everything here hangs below the plank's underside.
  const top = -SHELF.plank
  const plateCentre = top - SHELF.bracketDrop / 2
  const reach = SHELF.bracketReach

  return [
    // Plate screwed flat against the wall
    {
      geometry: box(0.048, SHELF.bracketDrop, 0.016),
      color: '#2e2e37',
      at: [x, plateCentre, WALL_Z],
      finish: FINISH.iron,
    },

    // Arm carrying the plank
    {
      geometry: box(0.048, 0.018, reach),
      color: '#2e2e37',
      at: [x, top - 0.011, WALL_Z + reach / 2],
      finish: FINISH.iron,
    },

    // Diagonal brace, tying the arm back to the bottom of the plate
    {
      geometry: box(0.024, 0.35, 0.011),
      color: '#26262e',
      at: [x, top - 0.15, WALL_Z + reach * 0.5],
      rotate: [0.72, 0, 0],
      finish: FINISH.iron,
    },

    // Screw heads, just enough to read as hardware
    ...[plateCentre - 0.09, plateCentre + 0.09].map(
      (y): Part => ({
        geometry: cylinder(0.007, 0.007, 0.004, 8),
        color: '#8b8b96',
        at: [x, y, WALL_Z + 0.009],
        rotate: [Math.PI / 2, 0, 0],
        finish: FINISH.iron,
      }),
    ),
  ]
}

export function ShelfUnit({ rows }: { rows: number }) {
  /**
   * Everything that is not a plank: the lit front edge and the dark back of
   * each deck, and three brackets under it, all welded into one mesh.
   *
   * The planks stay separate. Their rounded edge is a moulded shape that no
   * merge can reproduce from a box, and at two meshes for the whole shelf they
   * are not the problem.
   */
  const parts = useMemo(() => {
    const all: Part[] = []

    for (let row = 0; row < rows; row += 1) {
      const base = rowY(row)

      // Lit along the front edge, which is what makes a plank read as a
      // surface rather than a stripe.
      all.push({
        geometry: box(SHELF.width - 0.03, 0.006, 0.01),
        color: PALETTE.woodDeckEdge,
        at: [0, base - 0.004, SHELF.depth / 2 - 0.005],
        finish: FINISH.lit,
      })

      // Where the plank meets the wall, kept dark so it sits into it.
      all.push({
        geometry: box(SHELF.width, SHELF.plank, 0.008),
        color: PALETTE.woodSideOuter,
        at: [0, base - SHELF.plank / 2, -SHELF.depth / 2 + 0.004],
        finish: FINISH.matte,
      })

      for (const x of bracketOffsets()) {
        for (const part of bracketParts(x)) {
          all.push({ ...part, at: [part.at![0], base + part.at![1], part.at![2]] })
        }
      }
    }

    return all
  }, [rows])

  return (
    <group>
      {Array.from({ length: rows }, (_, row) => (
        <group key={`plank-${row}`} position={[0, rowY(row), 0]}>
          <RoundedBox
            args={[SHELF.width, SHELF.plank, SHELF.depth]}
            radius={0.01}
            smoothness={3}
            position={[0, -SHELF.plank / 2, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={PALETTE.woodDeckTop} roughness={0.68} />
          </RoundedBox>
        </group>
      ))}

      <Merged parts={parts} />
    </group>
  )
}
