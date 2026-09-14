/**
 * Text for the handheld's screen.
 *
 * Drawn into a half-size offscreen canvas and then blitted at double size with
 * smoothing off, which turns ordinary antialiased text into the chunky
 * two-pixel-stem lettering the hardware would have produced. It is a cheap
 * trick and it is the difference between "a canvas with some text on it" and
 * "a screen from 1989".
 */

let scratch: HTMLCanvasElement | null = null

export function halfCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
} {
  if (!scratch) scratch = document.createElement('canvas')
  scratch.width = width
  scratch.height = height
  const ctx = scratch.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.imageSmoothingEnabled = false
  return { canvas: scratch, ctx }
}

/** Splits text into lines that fit `maxWidth`, breaking on spaces. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let line = ''

  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }

  if (line) lines.push(line)
  return lines
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centreX: number,
  startY: number,
  lineHeight: number,
): void {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, index) => {
    ctx.fillText(line, centreX, startY + index * lineHeight)
  })
}
