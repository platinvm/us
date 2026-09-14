import {
  DMG,
  GROUND,
  HEARTS_TO_WIN,
  HER_NAME,
  LIVES,
  YOUR_NAME,
  VIEW_H,
  VIEW_W,
} from '../config'
import { BROKEN, HEART, MOON, PLAYER, drawNumber, drawSprite } from './sprites'
import { PLAYER_Y } from './step'
import type { World } from './step'
import { drawLines, halfCanvas, wrapText } from './text'

/**
 * Draws one frame onto the handheld's screen.
 *
 * The whole thing is four greens, because that is all the hardware had. That
 * constraint does most of the work here: the night sky is a dither rather than
 * a gradient, distance is expressed by dither density rather than by fog, and
 * the "gold" heart has to be told apart from the ordinary one by blinking.
 *
 * Static scenery is drawn once into an offscreen canvas and blitted, so the
 * per-frame cost is the falling hearts and nothing else.
 */

const SHADE: Record<string, string> = {
  lightest: DMG.lightest,
  light: DMG.light,
  dark: DMG.dark,
  darkest: DMG.darkest,
}

let scene: HTMLCanvasElement | null = null
let flashLayer: HTMLCanvasElement | null = null

/** Fills a rect with a checkerboard, which is how the hardware did grey. */
function dither(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cell: number,
  phase: number,
): void {
  for (let row = 0; row * cell < height; row += 1) {
    for (let col = 0; col * cell < width; col += 1) {
      if ((row + col + phase) % 2 !== 0) continue
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell)
    }
  }
}

function buildScene(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = VIEW_W
  canvas.height = VIEW_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Sky
  ctx.fillStyle = DMG.dark
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  // Darker towards the top, in bands of increasing dither density.
  ctx.fillStyle = DMG.darkest
  for (let band = 0; band < 6; band += 1) {
    const height = (VIEW_H * 0.42) / 6
    if (band < 2) continue
    dither(ctx, 0, band * height, VIEW_W, height, 4, band * 2)
  }

  // Aurora, a slow ribbon of half-tone across the upper sky.
  ctx.fillStyle = DMG.lightest
  for (let x = 0; x < VIEW_W; x += 3) {
    const y = 58 + Math.sin(x * 0.021) * 16 + Math.sin(x * 0.052) * 6
    for (let thickness = 0; thickness < 14; thickness += 4) {
      if ((x / 3 + thickness / 4) % 3 !== 0) continue
      ctx.fillRect(x, Math.round(y) + thickness, 3, 2)
    }
  }

  const ridge = (x: number, offset: number, amplitude: number, frequency: number) =>
    VIEW_H - GROUND - offset - Math.round(Math.sin(x * frequency) * amplitude)

  // Far ridge, with a half-tone along the skyline so it reads as distant.
  ctx.fillStyle = DMG.darkest
  for (let x = 0; x < VIEW_W; x += 2) {
    const y = ridge(x, 58, 15, 0.019)
    ctx.fillRect(x, y, 2, VIEW_H - y)
  }

  ctx.fillStyle = DMG.dark
  for (let x = 0; x < VIEW_W; x += 2) {
    const y = ridge(x, 58, 15, 0.019)
    for (let row = 0; row < 7; row += 2) {
      if ((x / 2 + row / 2) % 2 !== 0) continue
      ctx.fillRect(x, y + row, 2, 2)
    }
  }

  // Near ridge, solid and heavier.
  ctx.fillStyle = DMG.darkest
  for (let x = 0; x < VIEW_W; x += 2) {
    const y = ridge(x, 30, 9, 0.041)
    ctx.fillRect(x, y, 2, VIEW_H - y)
  }

  // Ground, with a lit lip along the top so it reads as a surface.
  ctx.fillStyle = DMG.darkest
  ctx.fillRect(0, VIEW_H - GROUND, VIEW_W, GROUND)
  ctx.fillStyle = DMG.lightest
  ctx.fillRect(0, VIEW_H - GROUND, VIEW_W, 2)
  ctx.fillStyle = DMG.dark
  dither(ctx, 0, VIEW_H - GROUND + 5, VIEW_W, GROUND - 5, 4, 0)

  return canvas
}

function buildFlash(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = VIEW_W
  canvas.height = VIEW_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // A 25% checkerboard, blitted at varying alpha for the hit flash.
  ctx.fillStyle = DMG.lightest
  dither(ctx, 0, 0, VIEW_W, VIEW_H, 4, 0)
  return canvas
}

function sceneLayer(): HTMLCanvasElement {
  scene ??= buildScene()
  return scene
}

function flashMask(): HTMLCanvasElement {
  flashLayer ??= buildFlash()
  return flashLayer
}

export function render(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.save()

  if (world.shake > 0) {
    ctx.translate(
      Math.round((Math.random() - 0.5) * 6 * world.shake),
      Math.round((Math.random() - 0.5) * 6 * world.shake),
    )
  }

  ctx.drawImage(sceneLayer(), 0, 0)

  // Stars
  for (const star of world.stars) {
    const alpha = 0.4 + 0.6 * Math.sin(world.t * 1.8 + star.phase)
    if (alpha < 0.35) continue
    ctx.fillStyle = DMG.lightest
    const size = star.big ? 2 : 1
    ctx.fillRect(star.x, star.y, size, size)
  }

  // Moon, dithered down one edge so it has a shadow side.
  drawSprite(ctx, MOON, { X: DMG.lightest }, VIEW_W - 76, 30, 4)
  ctx.fillStyle = DMG.dark
  dither(ctx, VIEW_W - 76 + 12, 30, 24, 36, 4, 1)

  // Particles
  for (const particle of world.particles) {
    ctx.fillStyle = SHADE[particle.color] ?? DMG.lightest
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2.4))
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2)
  }
  ctx.globalAlpha = 1

  // Falling items. They rock side to side, so a heart never looks like a decal.
  for (const item of world.items) {
    const sway = Math.round(Math.sin(item.wobble) * 1.5)
    const x = item.x + sway
    const y = item.y

    if (item.type === 'broken') {
      drawSprite(ctx, BROKEN, { X: DMG.light, o: DMG.darkest }, x, y, 2)
    } else if (item.type === 'gold') {
      // No fifth colour, so gold blinks instead.
      const on = Math.floor(world.t * 8) % 2 === 0
      drawSprite(
        ctx,
        HEART,
        on ? { X: DMG.lightest, o: DMG.lightest } : { X: DMG.light, o: DMG.light },
        x,
        y,
        2,
      )
    } else {
      drawSprite(ctx, HEART, { X: DMG.lightest, o: DMG.dark }, x, y, 2)
    }
  }

  // Player
  const bob = world.phase === 'win' ? Math.round(Math.sin(world.player.bob) * 2) : 0
  drawSprite(
    ctx,
    PLAYER,
    {
      '0': DMG.darkest,
      '1': DMG.lightest,
      '2': DMG.dark,
      '3': DMG.lightest,
      '4': DMG.light,
    },
    world.player.x,
    PLAYER_Y + bob,
    2,
  )

  drawHud(ctx, world)
  drawOverlay(ctx, world)

  if (world.flash > 0) {
    ctx.globalAlpha = Math.min(1, world.flash) * 0.7
    ctx.drawImage(flashMask(), 0, 0)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

/* ---------------------------------------------------------------- screens */

const MONO = '"Courier New", Courier, monospace'

/**
 * Title, note, win and game-over panels, all drawn onto the same screen as the
 * game itself. There is no DOM here — if it is not on the handheld's screen, it
 * does not exist.
 */
function drawOverlay(ctx: CanvasRenderingContext2D, world: World): void {
  if (world.phase === 'playing') return

  const halfW = VIEW_W / 2
  const halfH = VIEW_H / 2
  const layer = halfCanvas(halfW, halfH)
  const g = layer.ctx

  g.clearRect(0, 0, halfW, halfH)

  // Dark panel with a whisper of half-tone. Full-strength dither behind text
  // is period-correct and completely unreadable, so it is dialled right down.
  g.fillStyle = DMG.darkest
  g.fillRect(0, 0, halfW, halfH)
  g.globalAlpha = 0.3
  g.fillStyle = DMG.dark
  dither(g, 0, 0, halfW, halfH, 2, 0)
  g.globalAlpha = 1

  g.strokeStyle = DMG.dark
  g.lineWidth = 1
  g.strokeRect(0.5, 0.5, halfW - 1, halfH - 1)

  g.textAlign = 'center'
  g.textBaseline = 'middle'

  const prompt = 'PRESS A'

  if (world.phase === 'title') {
    g.fillStyle = DMG.lightest
    g.font = `bold 17px ${MONO}`
    g.fillText('HEART', halfW / 2, 46)
    g.fillText('CATCHER', halfW / 2, 66)

    g.fillStyle = DMG.light
    g.font = `12px ${MONO}`
    g.fillText(`FILL THE JAR WITH ${HEARTS_TO_WIN}`, halfW / 2, 96)
    g.fillText(`${LIVES} LIVES`, halfW / 2, 112)

    // Blinks between two shades rather than on and off, so the instruction is
    // never actually absent.
    g.fillStyle = Math.floor(world.t * 1.6) % 2 === 0 ? DMG.lightest : DMG.light
    g.font = `bold 12px ${MONO}`
    g.fillText(prompt, halfW / 2, 150)
  }

  if (world.phase === 'note') {
    g.fillStyle = DMG.lightest
    g.font = `11px ${MONO}`
    const lines = wrapText(g, world.activeNote, halfW - 28)
    drawLines(g, lines, halfW / 2, halfH / 2 - lines.length * 7, 14)

    g.fillStyle = DMG.light
    g.font = `bold 11px ${MONO}`
    g.fillText(prompt, halfW / 2, halfH - 22)
  }

  if (world.phase === 'win') {
    g.fillStyle = DMG.lightest
    g.font = `bold 14px ${MONO}`
    g.fillText('HAPPY 2ND', halfW / 2, 52)
    g.fillText('ANNIVERSARY', halfW / 2, 70)

    g.fillStyle = DMG.light
    g.font = `10px ${MONO}`
    const lines = wrapText(g, world.finalMessage, halfW - 30)
    drawLines(g, lines, halfW / 2, 96, 13)

    g.fillStyle = DMG.lightest
    g.font = `bold 10px ${MONO}`
    g.fillText(`${HER_NAME} + ${YOUR_NAME}`, halfW / 2, 146)
    g.fillText(`SCORE ${world.score}`, halfW / 2, 160)

    g.fillStyle = DMG.light
    g.font = `bold 11px ${MONO}`
    g.fillText(prompt, halfW / 2, halfH - 20)
  }

  if (world.phase === 'over') {
    g.fillStyle = DMG.lightest
    g.font = `bold 16px ${MONO}`
    g.fillText('ALMOST', halfW / 2, 70)

    g.fillStyle = DMG.light
    g.font = `10px ${MONO}`
    const lines = wrapText(
      g,
      `${world.hearts} of ${HEARTS_TO_WIN} hearts caught, best combo x${world.bestCombo}. She would want you to try again.`,
      halfW - 30,
    )
    drawLines(g, lines, halfW / 2, 106, 13)

    g.fillStyle = DMG.lightest
    g.font = `bold 11px ${MONO}`
    g.fillText(prompt, halfW / 2, halfH - 20)
  }

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(layer.canvas, 0, 0, VIEW_W, VIEW_H)
}

function drawHud(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.fillStyle = DMG.darkest
  ctx.fillRect(0, 0, VIEW_W, 34)
  ctx.fillStyle = DMG.light
  ctx.fillRect(0, 34, VIEW_W, 1)

  // Hearts caught
  drawSprite(ctx, HEART, { X: DMG.lightest, o: DMG.dark }, 8, 9, 2)
  drawNumber(ctx, Math.min(999, world.hearts), 22, 9, 2, DMG.lightest)
  ctx.fillStyle = DMG.light
  ctx.fillRect(48, 18, 2, 2)
  drawNumber(ctx, HEARTS_TO_WIN, 56, 9, 2, DMG.light)

  // The jar, filling up. The whole point of the game, made literal.
  const jarX = Math.round(VIEW_W / 2) - 11
  const jarW = 22
  const jarTop = 6
  const jarH = 22

  ctx.fillStyle = DMG.lightest
  ctx.fillRect(jarX - 1, jarTop - 2, jarW + 2, 1)
  ctx.fillRect(jarX - 1, jarTop, 1, jarH)
  ctx.fillRect(jarX + jarW, jarTop, 1, jarH)
  ctx.fillRect(jarX - 1, jarTop + jarH, jarW + 2, 1)

  const filled = Math.round((Math.min(world.hearts, HEARTS_TO_WIN) / HEARTS_TO_WIN) * (jarH - 2))
  ctx.fillStyle = DMG.lightest
  ctx.fillRect(jarX + 1, jarTop + jarH - 1 - filled, jarW - 2, filled)
  ctx.fillStyle = DMG.dark
  dither(ctx, jarX + 3, jarTop + 3, jarW - 6, jarH - 6, 4, 0)

  // Combo, once it is worth mentioning.
  if (world.combo >= 5) {
    const multiplier = 1 + Math.floor(world.combo / 5)
    const blink = Math.floor(world.t * 6) % 2 === 0
    drawNumber(ctx, multiplier, VIEW_W / 2 - 6, 34, 2, blink ? DMG.lightest : DMG.light)
  }

  // Lives
  for (let i = 0; i < LIVES; i += 1) {
    const alive = i < world.lives
    drawSprite(
      ctx,
      HEART,
      alive
        ? { X: DMG.lightest, o: DMG.dark }
        : { X: DMG.dark, o: DMG.dark },
      VIEW_W - 14 - i * 20,
      9,
      2,
    )
  }
}
