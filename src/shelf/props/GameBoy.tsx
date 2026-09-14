import { RoundedBox, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import type { Group } from 'three'
import { NOTES, VIEW_H, VIEW_W } from '../../games/heartcatcher/config'
import { createAudioBus } from '../../games/heartcatcher/engine/audio'
import type { AudioBus } from '../../games/heartcatcher/engine/audio'
import { render } from '../../games/heartcatcher/engine/render'
import {
  closeMenu,
  createWorld,
  drainEvents,
  moveMenu,
  openMenu,
  resumeRun,
  selectedItem,
  startRun,
  toTitle,
  update,
} from '../../games/heartcatcher/engine/step'
import type { Input, World } from '../../games/heartcatcher/engine/step'
import type { ShelfPropProps } from '../../games/types'
import { useShelf } from '../shelfState'
import { useCanvasTexture } from './canvasTexture'

/**
 * How often the screen repaints while the handheld is sitting on the shelf.
 *
 * Twelve times a second: enough that the attract screen is visibly alive from
 * across the room, cheap enough that nobody pays for a run that is not being
 * watched. In your hands it goes back to every frame.
 */
const IDLE_SCREEN_INTERVAL = 1 / 12

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
  const { release } = useShelf()

  const input = useRef<Input>({ dir: 0 })
  const padDir = useRef<PadDir>(0)
  const heldKeys = useRef<Set<string>>(new Set())
  const audioRef = useRef<AudioBus | null>(null)
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

  /**
   * The mip chain is only worth building when the screen is small.
   *
   * On the shelf it is a few dozen pixels across and wants the pyramid, or the
   * pixel art crawls. Held up in front of you it is magnified, where the mip
   * chain is not read at all — and rebuilding one on every frame of a running
   * game cost more than drawing the game did.
   */
  useEffect(() => {
    screen.texture.generateMipmaps = !focused
    screen.texture.minFilter = focused ? LinearFilter : LinearMipmapLinearFilter
    screen.texture.needsUpdate = true
  }, [focused, screen])

  /* ----------------------------------------------------------------- audio */

  useEffect(() => {
    const bus = createAudioBus()
    audioRef.current = bus
    return () => {
      bus.dispose()
      audioRef.current = null
    }
  }, [])

  const toggleSound = useCallback(() => {
    world.soundOn = !world.soundOn
    if (audioRef.current) audioRef.current.enabled = world.soundOn
    audioRef.current?.unlock()
  }, [world])

  /** Does whatever the highlighted pause row says. */
  const choosePauseItem = useCallback(() => {
    const item = selectedItem(world)
    // Exit is the same thing Escape does: the handheld goes back on the shelf,
    // which resets the run on its way out.
    if (item === 'exit') release()
    else if (item === 'sound') toggleSound()
    // Restart deals a fresh run and drops straight back into play, which is
    // what you want after losing the last life on a note you have already read.
    else if (item === 'restart') startRun(world)
    else closeMenu(world)
  }, [world, release, toggleSound])

  const primary = useCallback(() => {
    audioRef.current?.unlock()
    if (world.phase === 'paused') choosePauseItem()
    else if (world.phase === 'title') startRun(world)
    else if (world.phase === 'note') resumeRun(world)
    else if (world.phase === 'win' || world.phase === 'over') startRun(world)
  }, [world, choosePauseItem])

  /** B opens the menu, and closes it again if it is already open. */
  const toggleMenu = useCallback(() => {
    audioRef.current?.unlock()
    if (world.phase === 'paused') closeMenu(world)
    else openMenu(world)
  }, [world])

  const dirFromKeys = () => {
    const held = heldKeys.current
    const left = held.has('arrowleft') || held.has('a')
    const right = held.has('arrowright') || held.has('d')
    if (left === right) return 0
    return left ? -1 : 1
  }

  /* ------------------------------------------------------------- one frame */

  const screenClock = useRef(0)

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

    // The simulation always advances — the attract screen has stars to blink
    // and a prompt to flash — but the picture and its upload are rationed
    // while the handheld is on the shelf. A game nobody is holding does not
    // need sixty new frames a second of a screen the size of a stamp.
    screenClock.current += dt
    if (focused || screenClock.current >= IDLE_SCREEN_INTERVAL) {
      screenClock.current = 0
      render(screen.ctx, world)
      screen.texture.needsUpdate = true
    }

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
      // The shelf has it back, so the run is over and the attract screen goes
      // back on. Leaving the world mid-run was what let a game carry on playing
      // itself, out of sight, on the shelf.
      toTitle(world)
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const left = key === 'arrowleft' || key === 'a'
      const right = key === 'arrowright' || key === 'd'

      if (left || right) {
        event.preventDefault()
        // With the menu up, the directions walk it instead of the jar.
        if (world.phase === 'paused') moveMenu(world, left ? -1 : 1)
        else heldKeys.current.add(key)
        return
      }

      if (key === ' ' || key === 'enter') {
        event.preventDefault()
        primary()
        return
      }

      if (key === 'b' || key === 's') {
        event.preventDefault()
        toggleMenu()
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
  }, [focused, primary, toggleMenu, world])

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
    // The D-pad walks the menu too, rather than shoving a frozen jar about.
    if (world.phase === 'paused') {
      moveMenu(world, direction)
      return
    }
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

      {/* D-pad. Oversized for the shell on purpose: it is the control a thumb
          holds for a whole run and has to find without looking. */}
      <group position={[-0.15, 0.218, FACE + 0.008]}>
        <mesh castShadow>
          <boxGeometry args={[0.17, 0.058, 0.016]} />
          <meshStandardMaterial color={BUTTON_B} roughness={0.45} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.058, 0.17, 0.016]} />
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
      {hitbox('pad-left', [-0.1925, 0.218, FACE + 0.05], [0.085, 0.2, 0.05], holdPad(-1), dropPad(-1))}
      {hitbox('pad-right', [-0.1075, 0.218, FACE + 0.05], [0.085, 0.2, 0.05], holdPad(1), dropPad(1))}
      {hitbox('button-b', [0.115, 0.2, FACE + 0.06], [0.08, 0.08, 0.05], toggleMenu, () => {})}
      {hitbox('button-a', [0.205, 0.253, FACE + 0.06], [0.08, 0.08, 0.05], primary, () => {})}
    </group>
  )
}
