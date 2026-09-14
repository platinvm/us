import { useEffect, useMemo } from 'react'
import { RepeatWrapping } from 'three'
import { SHELF, lowestDeckY } from './layout'
import { Fairylights } from './decorations/lights'
import { Merged } from './Merged'
import { FINISH, box, plane } from './parts'
import type { Part } from './parts'
import { useCanvasTexture } from './props/canvasTexture'
import { PRINT_SIZE, WALLPAPER_SIZE, paintPrint, paintWallpaper } from './wallpaper'

const WALL_Z = -SHELF.depth / 2 - 0.03

/**
 * A framed print on the wall.
 *
 * `crooked` is not a bug: the left one has been knocked and never straightened,
 * which does more for a room feeling lived in than any amount of detail on the
 * shelf itself.
 */
function Print({
  x,
  y,
  width,
  height,
  variant,
  crooked,
}: {
  x: number
  y: number
  width: number
  height: number
  variant: 'arc' | 'grid'
  crooked: number
}) {
  const print = useCanvasTexture(PRINT_SIZE.width, PRINT_SIZE.height, (ctx) =>
    paintPrint(ctx, variant),
  )

  // Frame and mount are one mesh. The sheet of glazing that used to cover the
  // artwork is gone: a `meshPhysicalMaterial` at 7% opacity is the most
  // expensive shader in the room, twice over, for a highlight nobody can point
  // at. The screw under the top edge went the same way — it sat behind the
  // frame, against the wall, and was never once drawn as anything but a pixel.
  const parts = useMemo<Part[]>(
    () => [
      {
        geometry: box(width, height, 0.03),
        color: '#4a3626',
        finish: FINISH.matte,
      },
      {
        geometry: plane(width - 0.05, height - 0.05),
        color: '#f4efe6',
        at: [0, 0, 0.016],
        finish: FINISH.sheet,
      },
    ],
    [width, height],
  )

  return (
    <group position={[x, y, WALL_Z + 0.012]} rotation={[0, 0, crooked]}>
      <Merged parts={parts} />

      <mesh position={[0, 0, 0.0175]}>
        <planeGeometry args={[width - 0.11, height - 0.11]} />
        <meshStandardMaterial map={print} roughness={0.85} />
      </mesh>
    </group>
  )
}

/**
 * The bedroom wall the shelf is bolted to: wallpaper, two prints that are not
 * quite straight, a couple of strips of tape, and the lights strung above.
 *
 * The wall is lit rather than flat-shaded, so the candle and the fairy lights
 * each throw their own warm patch — most of what makes this read as a room at
 * night rather than a render.
 */
export function Wall({
  rows,
  centreY,
  lightY,
}: {
  rows: number
  centreY: number
  lightY: number
}) {
  const wallpaper = useCanvasTexture(
    WALLPAPER_SIZE.width,
    WALLPAPER_SIZE.height,
    paintWallpaper,
  )

  useEffect(() => {
    wallpaper.wrapS = RepeatWrapping
    wallpaper.wrapT = RepeatWrapping
    wallpaper.repeat.set(3.5, 2.6)
    wallpaper.needsUpdate = true
  }, [wallpaper])

  const floor = lowestDeckY(rows) - SHELF.bracketDrop

  // Three strips of tape, in one mesh. Translucent, so it keeps a finish of
  // its own, but three of them are still cheaper than one before.
  const tape = useMemo<Part[]>(
    () =>
      [
        { x: -2.5, y: centreY + 1.4, width: 0.17, roll: 0.42 },
        { x: 2.42, y: centreY + 0.42, width: 0.13, roll: -0.62 },
        { x: 1.62, y: centreY - 1.3, width: 0.14, roll: 0.28 },
      ].map(
        (strip): Part => ({
          geometry: plane(strip.width, strip.width * 0.32),
          color: '#e6d3b8',
          at: [strip.x, strip.y, WALL_Z + 0.008],
          rotate: [0, 0, strip.roll],
          finish: FINISH.tape,
        }),
      ),
    [centreY],
  )

  return (
    <group>
      <mesh position={[0, centreY, WALL_Z]} receiveShadow>
        <planeGeometry args={[24, 15]} />
        <meshStandardMaterial map={wallpaper} roughness={0.95} metalness={0} />
      </mesh>

      <Print
        x={-1.9}
        y={centreY + 0.84}
        width={0.72}
        height={0.92}
        variant="arc"
        crooked={-0.055}
      />
      <Print
        x={1.94}
        y={centreY - 0.56}
        width={0.6}
        height={0.76}
        variant="grid"
        crooked={0.04}
      />

      <Merged parts={tape} castShadow={false} receiveShadow={false} />

      <Fairylights width={SHELF.width + 0.5} y={lightY} z={0.12} />

      {/* A soft pool of light low down, as if from a lamp out of frame. */}
      <pointLight
        position={[-2.6, floor + 1.1, 1.6]}
        color="#ffb27a"
        intensity={2.4}
        distance={6.5}
        decay={2}
      />
    </group>
  )
}
