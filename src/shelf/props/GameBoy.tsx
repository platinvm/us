import { RoundedBox, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Group } from 'three'
import { NOTES, VIEW_H, VIEW_W } from '../../games/heartcatcher/config'
import { createAudioBus } from '../../games/heartcatcher/engine/audio'
import type { AudioBus } from '../../games/heartcatcher/engine/audio'
import { render } from '../../games/heartcatcher/engine/render'
import {
  createWorld,
  drainEvents,
  resumeRun,
  startRun,
  update,
} from '../../games/heartcatcher/engine/step'
import type { Input, World } from '../../games/heartcatcher/engine/step'
import type { ShelfPropProps } from '../../games/types'
import { useCanvasTexture } from './canvasTexture'

/*
 * The shell. Everything below is placed relative to `FACE`, the plane of the
 * front of the body, and each layer in front of it clears the one behind.
 *
 * The body is rounded, so its genuinely flat front face is inset by the corner
 * radius — anything mounted on it has to stay inside that inset or it pokes
 * through the curve and renders as a sliver of hatching.
 *
 *   0.56 wide, 0.84 tall, 0.08 deep
 *   flat front face is 0.50 x 0.78, inset 0.03 from every edge
 */
const BODY_W = 0.56
const BODY_H = 0.84
const BODY_D = 0.08
const FACE = BODY_D / 2
const CORNER = 0.03

/**
 * Deliberately a touch chunkier than the real thing. The screen is 71% of the
 * shell's width rather than 60%, so that when the device fills the frame the
 * game inside it is still big enough to play on a laptop.
 */
const SCREEN_W = 0.4
const SCREEN_H = SCREEN_W * (VIEW_H / VIEW_W)
const SCREEN_Y = 0.55

const PLATE = '#c8c3b8'
const PLATE_DARK = '#b2ada3'
const BEZEL = '#4c4c55'
const BUTTON_A = '#8d2250'
const BUTTON_B = '#2c2c34'

type PadDir = -1 | 0 | 1

/**
 * A letter printed on the shell.
 *
 * Drawn into a canvas sized to the plate it will sit on, so the glyph keeps its
 * proportions instead of being stretched to fit, and mapped with a basic
 * material so it stays legible in the room's warm low light.
 */
function ShellLabel({
  text,
  position,
  width,
  height,
  fontPx,
}: {
  text: string
  position: [number, number, number]
  width: number
  height: number
  fontPx: number
}) {
  const canvasW = 128
  const canvasH = Math.max(16, Math.round((canvasW * height) / width))

  const texture = useCanvasTexture(canvasW, canvasH, (ctx) => {
    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.fillStyle = '#4b4b55'
    ctx.font = `bold ${fontPx}px Helvetica, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvasW / 2, canvasH / 2 + 1)
  })

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * The handheld, and the game.
 *
 * There is no separate game screen: the canvas the engine draws into is the
 * texture on the little screen, and the D-pad and buttons on the front are the
 * controls. You play it by clicking the object sitting on the shelf, or with
 * the arrow keys once you have picked it up.
 *
 * The screen runs all the time, so it is alive on the shelf. The controls only
 * respond once the thing is actually in your hands.
 */
export function GameBoy({ focused, hovered }: ShelfPropProps) {
  const [world] = useState<World>(createWorld)

  const input = useRef<Input>({ dir: 0 })
  const padDir = useRef<PadDir>(0)
  const heldKeys = useRef<Set<string>>(new Set())
  const audioRef = useRef<AudioBus | null>(null)
  const soundOn = useRef(true)
  const [hoveringButton, setHoveringButton] = useState(false)
  const shell = useRef<Group>(null)

  /* ----------------------------------------------------------- the screen */

  const screen = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = VIEW_W
    canvas.height = VIEW_H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')
    ctx.imageSmoothingEnabled = false

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    return { ctx, texture }
  }, [])

  useEffect(() => () => screen.texture.dispose(), [screen])

  /* ----------------------------------------------------------------- audio */

  useEffect(() => {
    const bus = createAudioBus()
    audioRef.current = bus
    return () => {
      bus.dispose()
      audioRef.current = null
    }
  }, [])

  const primary = useCallback(() => {
    audioRef.current?.unlock()
    if (world.phase === 'title') startRun(world)
    else if (world.phase === 'note') resumeRun(world)
    else if (world.phase === 'win' || world.phase === 'over') startRun(world)
  }, [world])

  const toggleSound = useCallback(() => {
    soundOn.current = !soundOn.current
    if (audioRef.current) audioRef.current.enabled = soundOn.current
    audioRef.current?.unlock()
  }, [])

  const dirFromKeys = () => {
    const held = heldKeys.current
    const left = held.has('arrowleft') || held.has('a')
    const right = held.has('arrowright') || held.has('d')
    if (left === right) return 0
    return left ? -1 : 1
  }

  /* ------------------------------------------------------------- one frame */

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta)
    input.current.dir = padDir.current !== 0 ? padDir.current : dirFromKeys()

    update(world, input.current, dt)

    for (const event of drainEvents(world)) {
      if (event.type === 'note') {
        world.activeNote = NOTES[event.index] ?? world.activeNote
      }
      if (!focused) continue

      const audio = audioRef.current
      switch (event.type) {
        case 'caught':
          if (event.gold) audio?.sfx.gold()
          else audio?.sfx.catch()
          break
        case 'hurt':
          audio?.sfx.hurt()
          break
        case 'note':
          audio?.sfx.note()
          break
        case 'win':
          audio?.sfx.win()
          break
        case 'over':
          audio?.sfx.over()
          break
      }
    }

    render(screen.ctx, world)
    screen.texture.needsUpdate = true

    if (shell.current) {
      const time = state.clock.elapsedTime
      shell.current.position.y = Math.sin(time * 1.1) * 0.004
      shell.current.rotation.z = Math.sin(time * 0.7) * 0.008
    }
  })

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (!focused) {
      heldKeys.current.clear()
      padDir.current = 0
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (key === 'arrowleft' || key === 'arrowright' || key === 'a' || key === 'd') {
        event.preventDefault()
        heldKeys.current.add(key)
        return
      }

      if (key === ' ' || key === 'enter') {
        event.preventDefault()
        primary()
        return
      }

      if (key === 's' || key === 'b') {
        event.preventDefault()
        toggleSound()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.key.toLowerCase())
    }

    const onBlur = () => heldKeys.current.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [focused, primary, toggleSound])

  // A press that ends away from the button should still release it.
  useEffect(() => {
    const onPointerUp = () => {
      padDir.current = 0
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [])

  useCursor(hoveringButton && focused)

  const holdPad = (direction: -1 | 1) => () => {
    audioRef.current?.unlock()
    padDir.current = direction
    world.player.target = null
  }

  const dropPad = (direction: -1 | 1) => () => {
    if (padDir.current === direction) padDir.current = 0
  }

  const hitbox = (
    key: string,
    position: [number, number, number],
    size: [number, number, number],
    onDown: () => void,
    onUp: () => void,
  ) => (
    <mesh
      key={key}
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (event.pointerType === 'touch') return
        setHoveringButton(true)
      }}
      onPointerOut={() => setHoveringButton(false)}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (!focused) return
        onDown()
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        onUp()
      }}
      onPointerCancel={(event) => {
        event.stopPropagation()
        onUp()
      }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  )

  /* ---------------------------------------------------------------- render */

  return (
    <group ref={shell}>
      <RoundedBox
        args={[BODY_W, BODY_H, BODY_D]}
        radius={CORNER}
        smoothness={4}
        position={[0, BODY_H / 2, 0]}
        castShadow
        receiveShadow
        onClick={(event) => {
          // Clicking the shell itself is not clicking "away".
          if (focused) event.stopPropagation()
        }}
      >
        <meshStandardMaterial
          color={hovered && !focused ? '#d8d3c8' : PLATE}
          roughness={0.6}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Raised plate around the screen */}
      <mesh position={[0, SCREEN_Y, FACE + 0.002]}>
        <boxGeometry args={[0.47, 0.44, 0.008]} />
        <meshStandardMaterial color={PLATE_DARK} roughness={0.7} />
      </mesh>

      {/* Bezel, sitting on the plate */}
      <mesh position={[0, SCREEN_Y, FACE + 0.01]}>
        <boxGeometry args={[0.445, 0.42, 0.008]} />
        <meshStandardMaterial color={BEZEL} roughness={0.46} metalness={0.14} />
      </mesh>

      {/* The screen. Everything the game draws ends up here. */}
      <mesh position={[0, SCREEN_Y, FACE + 0.0155]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>

      {/* Power light */}
      <mesh position={[-0.2, 0.295, FACE + 0.0055]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.005, 10]} />
        <meshStandardMaterial
          color="#b83a3a"
          emissive="#e04a4a"
          emissiveIntensity={0.7}
          roughness={0.35}
        />
      </mesh>

      {/* D-pad */}
      <group position={[-0.15, 0.225, FACE + 0.008]}>
        <mesh castShadow>
          <boxGeometry args={[0.125, 0.042, 0.016]} />
          <meshStandardMaterial color={BUTTON_B} roughness={0.45} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.042, 0.125, 0.016]} />
          <meshStandardMaterial color={BUTTON_B} roughness={0.45} />
        </mesh>
      </group>

      {/* A and B */}
      {[
        { x: 0.115, y: 0.2 },
        { x: 0.205, y: 0.253 },
      ].map((button) => (
        <mesh
          key={`${button.x}-${button.y}`}
          position={[button.x, button.y, FACE + 0.013]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.036, 0.032, 0.018, 18]} />
          <meshStandardMaterial
            color={BUTTON_A}
            roughness={0.4}
            emissive={BUTTON_A}
            emissiveIntensity={hovered ? 0.14 : 0}
          />
        </mesh>
      ))}

      {/* The letters. On the real thing they are printed under each button, and
          without them the whole lower half reads as an abstract toy. */}
      <ShellLabel
        text="B"
        position={[0.12, 0.148, FACE + 0.004]}
        width={0.045}
        height={0.03}
        fontPx={60}
      />
      <ShellLabel
        text="A"
        position={[0.21, 0.2, FACE + 0.004]}
        width={0.045}
        height={0.03}
        fontPx={60}
      />

      {/* Start, Select and the speaker grille are gone. Two buttons and a
          D-pad is all this needs; the rest was clutter that read as stripes. */}

      {/* Where you actually press */}
      {hitbox('pad-left', [-0.182, 0.225, FACE + 0.05], [0.068, 0.14, 0.05], holdPad(-1), dropPad(-1))}
      {hitbox('pad-right', [-0.118, 0.225, FACE + 0.05], [0.068, 0.14, 0.05], holdPad(1), dropPad(1))}
      {hitbox('button-b', [0.115, 0.2, FACE + 0.06], [0.08, 0.08, 0.05], toggleSound, () => {})}
      {hitbox('button-a', [0.205, 0.253, FACE + 0.06], [0.08, 0.08, 0.05], primary, () => {})}
    </group>
  )
}
