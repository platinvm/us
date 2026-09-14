import { RoundedBox } from '@react-three/drei'
import { SHELF, bracketOffsets, rowY } from './layout'
import { PALETTE } from './palette'

/**
 * The wall shelf: planks on brackets, and nothing else.
 *
 * No side panels, no backboard, no plinth — the wall is the back and the room
 * continues past either end. Everything a floor-standing unit would need to
 * look finished would also make it look like furniture instead of a shelf
 * someone screwed to their bedroom wall.
 */

const WALL_Z = -SHELF.depth / 2 + 0.014

function Bracket({ x }: { x: number }) {
  // Everything here hangs below the plank's underside.
  const top = -SHELF.plank
  const plateCentre = top - SHELF.bracketDrop / 2
  const reach = SHELF.bracketReach

  return (
    <group position={[x, 0, 0]}>
      {/* Plate screwed flat against the wall */}
      <mesh position={[0, plateCentre, WALL_Z]} castShadow>
        <boxGeometry args={[0.048, SHELF.bracketDrop, 0.016]} />
        <meshStandardMaterial color="#2e2e37" metalness={0.82} roughness={0.45} />
      </mesh>

      {/* Arm carrying the plank */}
      <mesh position={[0, top - 0.011, WALL_Z + reach / 2]} castShadow>
        <boxGeometry args={[0.048, 0.018, reach]} />
        <meshStandardMaterial color="#2e2e37" metalness={0.82} roughness={0.45} />
      </mesh>

      {/* Diagonal brace, tying the arm back to the bottom of the plate */}
      <mesh
        position={[0, top - 0.15, WALL_Z + reach * 0.5]}
        rotation={[0.72, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.024, 0.35, 0.011]} />
        <meshStandardMaterial color="#26262e" metalness={0.8} roughness={0.55} />
      </mesh>

      {/* Screw heads, just enough to read as hardware */}
      {[plateCentre - 0.09, plateCentre + 0.09].map((y) => (
        <mesh key={y} position={[0, y, WALL_Z + 0.009]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.004, 8]} />
          <meshStandardMaterial color="#8b8b96" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

export function ShelfUnit({ rows }: { rows: number }) {
  return (
    <group>
      {Array.from({ length: rows }, (_, row) => (
        <group key={`row-${row}`} position={[0, rowY(row), 0]}>
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

          {/* Lit along the front edge, which is what makes a plank read as a
              surface rather than a stripe. */}
          <mesh position={[0, -0.004, SHELF.depth / 2 - 0.005]}>
            <boxGeometry args={[SHELF.width - 0.03, 0.006, 0.01]} />
            <meshStandardMaterial
              color={PALETTE.woodDeckEdge}
              emissive={PALETTE.woodDeckEdge}
              emissiveIntensity={0.16}
              roughness={0.5}
            />
          </mesh>

          {/* Where the plank meets the wall, kept dark so it sits into it. */}
          <mesh position={[0, -SHELF.plank / 2, -SHELF.depth / 2 + 0.004]}>
            <boxGeometry args={[SHELF.width, SHELF.plank, 0.008]} />
            <meshStandardMaterial color={PALETTE.woodSideOuter} roughness={0.9} />
          </mesh>

          {bracketOffsets().map((x) => (
            <Bracket key={x} x={x} />
          ))}
        </group>
      ))}
    </group>
  )
}
