import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

type Resource = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: CanvasTexture
}

/**
 * Builds a `CanvasTexture` from a drawing function.
 *
 * The shelf needs a handful of bespoke surfaces — marquee, attract-mode screen,
 * nameplates, sheen — and generating them at runtime means no image files, no
 * external font fetches, and no CDN. With `fps > 0` the canvas is repainted on
 * a timer and the texture re-uploaded, which is how the attract loop stays alive
 * without a video file.
 */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, time: number) => void,
  fps = 0,
): CanvasTexture {
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
  })

  const resource = useMemo<Resource>(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    return { canvas, ctx, texture }
  }, [width, height])

  // Paint the first frame before the browser paints, so nothing flashes empty.
  useLayoutEffect(() => {
    resource.ctx.clearRect(0, 0, width, height)
    drawRef.current(resource.ctx, 0)
    resource.texture.needsUpdate = true
  }, [resource, width, height])

  useEffect(() => {
    if (fps <= 0) return

    let frame = 0
    let previous = 0
    const started = performance.now()
    const interval = 1000 / fps

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - previous < interval) return
      previous = now
      resource.ctx.clearRect(0, 0, width, height)
      drawRef.current(resource.ctx, (now - started) / 1000)
      resource.texture.needsUpdate = true
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [resource, fps, width, height])

  useEffect(() => () => resource.texture.dispose(), [resource])

  return resource.texture
}
