import { ExtrudeGeometry, Shape } from 'three'

/**
 * A heart, built from bezier curves and extruded so it is a real object with
 * thickness rather than a flat billboard.
 *
 * Shared by the hearts in the jar and the little ceramic hearts, so they are
 * all recognisably the same shape — and the same shape as the sprite in Heart
 * Catcher, which is the point.
 */
export function createHeartGeometry(size = 1, depth = 0.22): ExtrudeGeometry {
  const shape = new Shape()

  // Drawn around a 1-unit-tall origin, then scaled.
  shape.moveTo(0, -0.5)
  shape.bezierCurveTo(0.6, -0.06, 0.6, 0.44, 0.25, 0.5)
  shape.bezierCurveTo(0.07, 0.535, 0.01, 0.37, 0, 0.29)
  shape.bezierCurveTo(-0.01, 0.37, -0.07, 0.535, -0.25, 0.5)
  shape.bezierCurveTo(-0.6, 0.44, -0.6, -0.06, 0, -0.5)

  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 10,
  })

  geometry.translate(0, 0, -depth / 2)
  geometry.scale(size, size, size)
  geometry.computeVertexNormals()

  return geometry
}
