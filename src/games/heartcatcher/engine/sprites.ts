/**
 * The pixel art, as readable string grids. `.` is transparent, any other
 * character is looked up in the matching palette (falling back to `X`).
 *
 * Ported verbatim from the original single-file game, with the canvas passed in
 * rather than captured from module scope, so the shelf's attract-mode preview
 * can draw the same art onto an offscreen canvas.
 */

export const PLAYER = [
  '....2222....',
  '..22222222..',
  '.2211111122.',
  '.2111111112.',
  '.2101111012.',
  '.2111111112.',
  '.2111001112.',
  '..11111111..',
  '...333333...',
  '..33333333..',
  '.1333333331.',
  '.1333333331.',
  '144444444441',
  '.4444444444.',
  '..44444444..',
  '...444444...',
]

export const PLAYER_PAL: Record<string, string> = {
  '0': '#241628',
  '1': '#f6c9a4',
  '2': '#5b3222',
  '3': '#ff4d8d',
  '4': '#c98a45',
}

export const HEART = [
  '.XX.XX.',
  'XoXXXXX',
  'XXXXXXX',
  '.XXXXX.',
  '..XXX..',
  '...X...',
]

export const BROKEN = [
  '.XX.XX.',
  'XXX.XXX',
  'XXXX.XX',
  '.XX.XX.',
  '..XXX..',
  '...X...',
]

export const MOON = [
  '..XXXX...',
  '.XXXXXX..',
  'XXXXX....',
  'XXXX.....',
  'XXXX.....',
  'XXXX.....',
  'XXXXX....',
  '.XXXXXX..',
  '..XXXX...',
]

export const DIGITS: Record<string, string[]> = {
  '0': ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  '3': ['XXX', '..X', 'XXX', '..X', 'XXX'],
  '4': ['X.X', 'X.X', 'XXX', '..X', '..X'],
  '5': ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  '6': ['XXX', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '..X', '..X', '..X'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
}

export type Palette = Record<string, string>

/** Blits one string-grid sprite at `scale` device pixels per art pixel. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  palette: Palette,
  x: number,
  y: number,
  scale: number,
): void {
  const px = Math.round(x)
  const py = Math.round(y)

  for (let row = 0; row < grid.length; row += 1) {
    const line = grid[row]
    for (let col = 0; col < line.length; col += 1) {
      const char = line[col]
      if (char === '.') continue
      ctx.fillStyle = palette[char] ?? palette.X
      ctx.fillRect(px + col * scale, py + row * scale, scale, scale)
    }
  }
}

/** Draws a zero-padded 3-digit number in the game's own digit font. */
export function drawNumber(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  scale: number,
  color: string,
): void {
  const text = String(value).padStart(3, '0')
  for (let i = 0; i < text.length; i += 1) {
    drawSprite(ctx, DIGITS[text[i]], { X: color }, x + i * 4 * scale, y, scale)
  }
}
