import { Environment, Lightformer, Preload } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { ACESFilmicToneMapping, Euler, Vector3 } from 'three'
import { findGame } from '../games/registry'
import { CAMERA_FOV, CameraRig } from './CameraRig'
import type { FocusTarget } from './CameraRig'
import { findDecoration } from './decorations'
import { Decoration } from './Decoration'
import { FramePacer, ResolutionGovernor, useRecentlyBusy } from './FramePacer'
import { SHELF, lowestDeckY, rowY } from './layout'
import { PALETTE } from './palette'
import { buildPlan } from './plan'
import { isMoving } from './sceneMotion'
import { ShelfSlot } from './ShelfSlot'
import { useShelf } from './shelfState'
import { ShelfUnit } from './ShelfUnit'
import { useSceneQuality } from './useSceneQuality'
import { ViewGestures } from './viewGestures'
import { Wall } from './Wall'

/**
 * How often shadows are redrawn while nothing that casts one is moving.
 *
 * Six frames is a tenth of a second: slow enough to be worth having, quick
 * enough that anything animating that never marked itself still reads as alive.
 */
const IDLE_SHADOW_INTERVAL = 6

/**
 * Keeps the shadow pass off the frame budget while the shelf is still.
 *
 * Nothing else in the scene draws itself twice, so this is the one place where
 * skipping work is worth more than everything else put together.
 */
function ShadowBudget() {
  const gl = useThree((state) => state.gl)
  const frame = useRef(0)

  useEffect(() => {
    // From here the shadow map is redrawn when this says so, not every frame.
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])

  useFrame(() => {
    frame.current += 1
    if (isMoving() || frame.current % IDLE_SHADOW_INTERVAL === 0) {
      gl.shadowMap.needsUpdate = true
    }
  })

  return null
}

/**
 * The shelf, on its wall, in a bedroom — and the games, on the shelf.
 *
 * There is one scene and one camera. Picking a game up moves the prop and the
 * camera, and nothing else: the wall, the furniture and the rest of the
 * collection stay exactly where they were and stay visible while you play.
 * That is the point — it should feel like reaching for something, not like
 * navigating away from it.
 */
export function ShelfScene() {
  const { focusedId, release, browsing, busy } = useShelf()
  const quality = useSceneQuality()
  const recentlyBusy = useRecentlyBusy()

  /**
   * The most resolution this device is allowed to render at.
   *
   * The device's own pixel ratio, kept inside the tier: a phone reporting 3
   * does not mean 3, it means "has spare pixels to waste", and a desktop
   * reporting 1 does not mean it has a fast GPU.
   */
  const ceiling = useMemo(
    () =>
      Math.min(
        quality.dprMax,
        Math.max(quality.dprMin, window.devicePixelRatio || 1),
      ),
    [quality],
  )

  /**
   * Whether everyone can stop trying so hard.
   *
   * Nothing being held, nothing being carried, and nothing touched for a
   * second and a half: the shelf is furniture at that point, and a still room
   * does not need sixty frames a second to stay still.
   */
  const idle = !focusedId && !busy && !recentlyBusy
  const fps = idle ? quality.idleFps : 60

  const plan = useMemo(() => buildPlan(), [])
  const rows = plan.length

  const framing = useMemo(() => {
    // Measured from the plan, not the registries, so it accounts for the scale
    // each item is actually placed at.
    let tallest = 0.5

    for (const row of plan) {
      for (const item of row) {
        const scale = item.scale ?? 1
        const height =
          item.kind === 'game'
            ? (findGame(item.id)?.focus.size[1] ?? 0) * scale
            : (findDecoration(item.id)?.footprint[1] ?? 0) * scale
        tallest = Math.max(tallest, height + (item.y ?? 0))
      }
    }

    const top = rowY(0) + tallest + 0.16
    const bottom = lowestDeckY(rows) - SHELF.plank - SHELF.bracketDrop - 0.1

    return {
      centreY: (top + bottom) / 2,
      height: top - bottom,
      lightY: top + 0.4,
    }
  }, [plan, rows])

  /**
   * Where the camera should end up for whichever prop is in your hands.
   *
   * A prop picks up two rotations on its way into your hands: the yaw and roll
   * of the spot it sits on, and the lean it takes on once it is being held.
   * Both have to be applied to the aim point *and* to the camera's offset, or
   * the camera ends up square to the world instead of to the prop and whatever
   * it is aiming at lands off-centre in the frame.
   */
  const focusTarget = useMemo<FocusTarget | null>(() => {
    const game = findGame(focusedId)
    if (!game) return null

    for (let row = 0; row < plan.length; row += 1) {
      const placed = plan[row].find(
        (item) => item.kind === 'game' && item.id === game.id,
      )
      if (!placed) continue

      const { focus } = game
      const scale = (placed.scale ?? 1) * focus.scale
      const shelfRotation = new Euler(0, placed.yaw ?? 0, placed.roll ?? 0, 'XYZ')
      const heldRotation = new Euler(
        focus.turn[0],
        focus.turn[1],
        focus.turn[2],
        'XYZ',
      )
      const lift = new Vector3(...focus.lift)

      const aim = new Vector3(...focus.camera.aim)
        .multiplyScalar(scale)
        .applyEuler(heldRotation)
        .add(lift)
        .applyEuler(shelfRotation)

      const offset = new Vector3(
        0,
        focus.camera.height,
        focus.camera.distance,
      )
        .applyEuler(heldRotation)
        .applyEuler(shelfRotation)

      return {
        position: [placed.x + aim.x, rowY(row) + aim.y, (placed.z ?? 0) + aim.z],
        offset: [offset.x, offset.y, offset.z],
        // `size` is the prop at rest and at scale 1, so the pick-up scale is
        // what turns it into the size it actually is in your hands.
        size: [focus.size[0] * scale, focus.size[1] * scale],
      }
    }

    return null
  }, [focusedId, plan])

  return (
    <Canvas
      shadows="percentage"
      // Above the idle rate there is nothing to gain from driving the loop by
      // hand, so it is handed back to react-three-fiber.
      frameloop={idle && quality.idleFps < 60 ? 'demand' : 'always'}
      dpr={[quality.dprMin, ceiling]}
      camera={{ fov: CAMERA_FOV, position: [0, framing.centreY, 6], near: 0.05, far: 60 }}
      gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
      // Tapping the wall or anything else puts a game back — but not while it
      // is still on its way to or from your hands.
      onPointerMissed={() => {
        if (!browsing && !busy) release()
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.06
      }}
    >
      <color attach="background" args={[PALETTE.wallBottom]} />

      <ResolutionGovernor min={quality.dprMin} max={ceiling} enabled={!idle} />
      <FramePacer fps={fps} />
      <ViewGestures />
      <ShadowBudget />

      <ambientLight intensity={0.38} color="#c9b6e0" />
      <hemisphereLight args={['#ffd9b0', '#3a2a48', 0.5]} />

      <directionalLight
        position={[3.4, 4.6, 3.2]}
        intensity={1.45}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={2.8}
        shadow-camera-bottom={-2.8}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      <directionalLight position={[-4, 2, 2]} intensity={0.36} color="#9aa8ff" />

      {/* Reflections from light shapes rather than a downloaded environment. */}
      <Environment resolution={128}>
        <Lightformer intensity={1.5} color="#ffe9cd" position={[0, 5, 4]} scale={[10, 4, 1]} />
        <Lightformer
          intensity={0.85}
          color="#8ea2ff"
          position={[-6, 2, -2]}
          rotation-y={Math.PI / 2}
          scale={[8, 6, 1]}
        />
        <Lightformer
          intensity={0.55}
          color="#ff9ecb"
          position={[6, 1.4, -2]}
          rotation-y={-Math.PI / 2}
          scale={[8, 6, 1]}
        />
      </Environment>

      <Suspense fallback={null}>
        <CameraRig
          contentWidth={SHELF.width}
          contentHeight={framing.height}
          centreY={framing.centreY}
          focusTarget={focusTarget}
        />
        <Wall rows={rows} centreY={framing.centreY} lightY={framing.lightY} />
        <ShelfUnit rows={rows} />

        {plan.map((row, rowIndex) =>
          row.map((item, column) => {
            const key = `${rowIndex}-${column}-${item.kind}-${item.id}`
            const position: [number, number, number] = [
              item.x,
              rowY(rowIndex) + (item.y ?? 0),
              item.z ?? 0,
            ]
            const yaw = item.yaw ?? 0
            const roll = item.roll ?? 0
            const scale = item.scale ?? 1

            if (item.kind === 'game') {
              const game = findGame(item.id)
              if (!game) return null
              return (
                <ShelfSlot
                  key={key}
                  game={game}
                  position={position}
                  yaw={yaw}
                  roll={roll}
                  scale={scale}
                />
              )
            }

            const decoration = findDecoration(item.id)
            if (!decoration) return null
            return (
              <Decoration
                key={key}
                definition={decoration}
                position={position}
                yaw={yaw}
                roll={roll}
                scale={scale}
              />
            )
          }),
        )}

        <Preload all />
      </Suspense>
    </Canvas>
  )
}
