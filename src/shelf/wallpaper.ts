export const WALLPAPER_SIZE = { width: 512, height: 512 } as const

/**
 * The wallpaper, as a tileable texture.
 *
 * Faint vertical stripes with a pin-dot between them. Kept very low contrast on
 * purpose: it should register as "this is a room" at the edge of vision and
 * disappear completely once you are looking at the shelf.
 */
export function paintWallpaper(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas

  const base = ctx.createLinearGradient(0, 0, 0, height)
  base.addColorStop(0, '#4a3550')
  base.addColorStop(1, '#3a2a44')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
  for (let x = 0; x < width; x += 64) {
    ctx.fillRect(x, 0, 26, height)
  }

  ctx.fillStyle = 'rgba(255, 236, 208, 0.07)'
  for (let y = 32; y < height; y += 64) {
    for (let x = 32; x < width; x += 64) {
      ctx.beginPath()
      ctx.arc(x, y, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export const PRINT_SIZE = { width: 360, height: 460 } as const

/**
 * The two prints on the wall.
 *
 * Deliberately vague — a big shape and a grid — so they read as "art someone
 * liked" from across the room without any of it having to be legible.
 */
export function paintPrint(
  ctx: CanvasRenderingContext2D,
  variant: 'arc' | 'grid',
): void {
  const { width, height } = ctx.canvas

  if (variant === 'arc') {
    const field = ctx.createLinearGradient(0, 0, width, height)
    field.addColorStop(0, '#e8d3c2')
    field.addColorStop(1, '#c9a68f')
    ctx.fillStyle = field
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#8a5a4a'
    ctx.beginPath()
    ctx.arc(width * 0.5, height * 0.62, width * 0.34, Math.PI, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#2f2a3c'
    ctx.beginPath()
    ctx.arc(width * 0.68, height * 0.3, width * 0.09, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.fillStyle = '#f1ece2'
  ctx.fillRect(0, 0, width, height)

  const tones = ['#8d9bb5', '#b5a18d', '#6f7f6a', '#c4a7a1', '#9a8fb0']
  const cell = width / 3
  let tone = 0

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      ctx.fillStyle = tones[tone % tones.length]
      tone += 1
      ctx.fillRect(
        col * cell + 10,
        row * (height / 4) + 10,
        cell - 20,
        height / 4 - 20,
      )
    }
  }
}
