import { VIEW_H, VIEW_W } from '../../games/heartcatcher/config'
import {
  HEART,
  MOON,
  PLAYER,
  PLAYER_PAL,
  drawSprite,
} from '../../games/heartcatcher/engine/sprites'

/**
 * Everything drawn onto the shelf props lives here.
 *
 * The attract loop is deliberately built from the real game's own sprite data
 * and its own 240x320 coordinate space, so the tiny screen on the shelf is
 * genuinely showing the game rather than a lookalike.
 */

const MONO = '"Courier New", Courier, monospace'

export const MARQUEE_SIZE = { width: 512, height: 160 } as const
export const SCREEN_SIZE = { width: VIEW_W, height: VIEW_H } as const
export const NAMEPLATE_SIZE = { width: 320, height: 64 } as const
/** Matches the binder prop's 0.52 x 0.68 face. */
export const BINDER_SIZE = { width: 512, height: 670 } as const

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** The lit header strip at the top of the mini cabinet. */
export function paintMarquee(ctx: CanvasRenderingContext2D, time: number): void {
  const { width, height } = ctx.canvas

  const background = ctx.createLinearGradient(0, 0, 0, height)
  background.addColorStop(0, '#1d1145')
  background.addColorStop(1, '#2a1758')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#4a2f9a'
  ctx.lineWidth = 8
  ctx.strokeRect(4, 4, width - 8, height - 8)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const pulse = 0.7 + 0.3 * Math.sin(time * 2.1)
  ctx.save()
  ctx.shadowColor = `rgba(255,77,141,${pulse.toFixed(3)})`
  ctx.shadowBlur = 28
  ctx.fillStyle = '#ff4d8d'
  ctx.font = `bold 46px ${MONO}`
  ctx.fillText('HEART', width / 2, height * 0.33)
  ctx.fillText('CATCHER', width / 2, height * 0.66)
  ctx.restore()

  ctx.fillStyle = '#5ce1e6'
  ctx.font = `bold 18px ${MONO}`
  ctx.fillText('2 YEARS · 1 PLAYER', width / 2, height * 0.9)
}

/**
 * The attract-mode loop shown on the cabinet screen while it sits on the shelf.
 * Uses the game's real sprites and its real 240x320 layout.
 */
export function paintAttract(ctx: CanvasRenderingContext2D, time: number): void {
  const width = VIEW_W
  const height = VIEW_H

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#150c33')
  sky.addColorStop(0.55, '#2a1758')
  sky.addColorStop(1, '#4a2172')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 26; i += 1) {
    const x = (i * 71) % width
    const y = (i * 43) % 200
    const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.4 + i))
    ctx.fillStyle = `rgba(247,242,255,${alpha.toFixed(2)})`
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1)
  }

  drawSprite(ctx, MOON, { X: '#ffeec2' }, width - 42, 22, 2)

  ctx.fillStyle = '#3a1a5e'
  for (let x = 0; x < width; x += 2) {
    const y =
      height - 16 - 16 - Math.round(Math.sin(x * 0.045) * 7 + Math.sin(x * 0.11) * 4)
    ctx.fillRect(x, y, 2, height - y)
  }
  ctx.fillStyle = '#241041'
  ctx.fillRect(0, height - 16, width, 16)
  ctx.fillStyle = '#3e1d63'
  ctx.fillRect(0, height - 16, width, 2)

  // Hearts drifting down on fixed, staggered paths.
  for (let i = 0; i < 7; i += 1) {
    const speed = 24 + i * 6
    const x = 16 + ((i * 53) % (width - 40))
    const y = ((time * speed + i * 61) % (height + 40)) - 30
    const gold = i === 3
    drawSprite(
      ctx,
      HEART,
      gold ? { X: '#ffd166', o: '#fff4cf' } : { X: '#ff4d8d', o: '#ffb3cd' },
      x,
      y,
      2,
    )
  }

  const playerX = width / 2 - 12 + Math.sin(time * 1.05) * (width / 2 - 30)
  drawSprite(ctx, PLAYER, PLAYER_PAL, playerX, height - 16 - 32, 2)

  // Blinking call to action, only while the cabinet is idle.
  if (Math.floor(time * 1.4) % 2 === 0) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffd166'
    ctx.font = `bold 15px ${MONO}`
    ctx.fillText('PRESS START', width / 2, height - 46)
  }

  // Vignette, so the screen reads as glass rather than a bright rectangle.
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.25,
    width / 2,
    height / 2,
    height * 0.62,
  )
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

/** The little engraved plaque under each shelf slot. */
export function paintNameplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  accent: string,
  muted: boolean,
): void {
  const { width, height } = ctx.canvas

  ctx.fillStyle = muted ? 'rgba(18,12,26,0.72)' : 'rgba(12,8,20,0.92)'
  roundedRect(ctx, 2, 2, width - 4, height - 4, 10)
  ctx.fill()

  ctx.strokeStyle = muted ? 'rgba(120,100,150,0.5)' : accent
  ctx.lineWidth = 3
  roundedRect(ctx, 4.5, 4.5, width - 9, height - 9, 8)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold 26px ${MONO}`
  ctx.fillStyle = muted ? 'rgba(200,190,220,0.6)' : '#f6f1ff'
  if (!muted) {
    ctx.shadowColor = accent
    ctx.shadowBlur = 14
  }
  ctx.fillText(title.toUpperCase(), width / 2, height / 2 + 1)
  ctx.shadowBlur = 0
}

/**
 * The back of a trading card: a navy field, a lighter inner border and a
 * centred mark. Generated rather than shipped, because a card seen edge-on
 * needs a back and one more PNG would be silly.
 */
export function paintCardBack(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas

  const field = ctx.createLinearGradient(0, 0, 0, height)
  field.addColorStop(0, '#2b4ea8')
  field.addColorStop(1, '#1a2f6b')
  ctx.fillStyle = field
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#8fb4ff'
  ctx.lineWidth = width * 0.03
  roundedRect(ctx, width * 0.07, height * 0.05, width * 0.86, height * 0.9, width * 0.03)
  ctx.stroke()

  // The same heart the games use, drawn small and pale in the middle.
  const size = Math.min(width, height) * 0.34
  const cx = width / 2
  const cy = height / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.beginPath()
  ctx.moveTo(0, size * 0.5)
  ctx.bezierCurveTo(-size * 0.6, size * 0.06, -size * 0.6, -size * 0.44, -size * 0.25, -size * 0.5)
  ctx.bezierCurveTo(-size * 0.07, -size * 0.535, 0, -size * 0.37, 0, -size * 0.29)
  ctx.bezierCurveTo(0, -size * 0.37, size * 0.07, -size * 0.535, size * 0.25, -size * 0.5)
  ctx.bezierCurveTo(size * 0.6, -size * 0.44, size * 0.6, size * 0.06, 0, size * 0.5)
  ctx.closePath()
  ctx.fillStyle = 'rgba(180,208,255,0.5)'
  ctx.fill()
  ctx.restore()
}

/** The little photo in the polaroid frame. */
export function paintPhoto(ctx: CanvasRenderingContext2D, time: number): void {
  const { width, height } = ctx.canvas

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#f7b7c8')
  sky.addColorStop(0.55, '#e0c3f0')
  sky.addColorStop(1, '#9fa8e8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  // Sun, sitting low.
  ctx.fillStyle = 'rgba(255,236,190,0.95)'
  ctx.beginPath()
  ctx.arc(width * 0.68, height * 0.34, Math.min(width, height) * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // Two figures on the horizon, holding hands.
  const groundY = height * 0.72
  ctx.fillStyle = '#4a3a63'
  ctx.beginPath()
  ctx.arc(width * 0.4, groundY - height * 0.2, width * 0.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(width * 0.36, groundY - height * 0.17, width * 0.08, height * 0.19)
  ctx.beginPath()
  ctx.arc(width * 0.55, groundY - height * 0.19, width * 0.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(width * 0.51, groundY - height * 0.16, width * 0.08, height * 0.18)

  ctx.strokeStyle = '#4a3a63'
  ctx.lineWidth = width * 0.018
  ctx.beginPath()
  ctx.moveTo(width * 0.44, groundY - height * 0.09)
  ctx.lineTo(width * 0.51, groundY - height * 0.09)
  ctx.stroke()

  // A slow shimmer, so the photo is not perfectly static.
  const glow = 0.05 + 0.04 * Math.sin(time * 0.8)
  ctx.fillStyle = `rgba(255,255,255,${glow.toFixed(3)})`
  ctx.fillRect(0, 0, width, height)
}

/**
 * The binder cover.
 *
 * No title anywhere — just a deep navy field, a ring of small stamped stars,
 * a bevelled border and the heart the rest of the site uses. A cover you
 * recognise at a glance and never have to read.
 */
export function paintBinderCover(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas

  const field = ctx.createLinearGradient(0, 0, width, height)
  field.addColorStop(0, '#2a3670')
  field.addColorStop(0.5, '#1d2657')
  field.addColorStop(1, '#141a3f')
  ctx.fillStyle = field
  ctx.fillRect(0, 0, width, height)

  // Stamped stars, in a loose grid, so the cover has texture up close.
  ctx.fillStyle = 'rgba(150, 175, 255, 0.12)'
  for (let y = 26; y < height - 18; y += 44) {
    for (let x = 26; x < width - 18; x += 44) {
      const cx = x + ((y / 44) % 2) * 22
      ctx.beginPath()
      for (let point = 0; point < 8; point += 1) {
        const angle = (point / 8) * Math.PI * 2
        const radius = point % 2 === 0 ? 3.4 : 1.4
        const px = cx + Math.cos(angle) * radius
        const py = y + Math.sin(angle) * radius
        if (point === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }
  }

  // Bevelled border.
  ctx.strokeStyle = 'rgba(190, 210, 255, 0.35)'
  ctx.lineWidth = 5
  roundedRect(ctx, 12, 12, width - 24, height - 24, 14)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(120, 145, 225, 0.45)'
  ctx.lineWidth = 2
  roundedRect(ctx, 22, 22, width - 44, height - 44, 10)
  ctx.stroke()

  // Recessed panel in the middle, holding the logo.
  const panelW = width * 0.68
  const panelH = height * 0.3
  const panelX = (width - panelW) / 2
  const panelY = (height - panelH) / 2

  const panel = ctx.createLinearGradient(0, panelY, 0, panelY + panelH)
  panel.addColorStop(0, '#fdfbf5')
  panel.addColorStop(1, '#ece5d6')
  ctx.fillStyle = panel
  roundedRect(ctx, panelX, panelY, panelW, panelH, 12)
  ctx.fill()

  ctx.strokeStyle = 'rgba(190, 205, 250, 0.85)'
  ctx.lineWidth = 3
  roundedRect(ctx, panelX, panelY, panelW, panelH, 12)
  ctx.stroke()

  // A single diagonal sheen across the whole cover.
  const sheen = ctx.createLinearGradient(0, height, width, 0)
  sheen.addColorStop(0.32, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.09)')
  sheen.addColorStop(0.68, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, width, height)
}

