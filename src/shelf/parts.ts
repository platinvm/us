import {
  BoxGeometry,
  BufferAttribute,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import type { BufferGeometry, Side } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Merging the small parts of an object into one mesh.
 *
 * A cactus is thirty-odd little meshes and a shelf bracket is five. None of them
 * is expensive to *draw* — the GPU does not care in the slightest. The cost is
 * entirely on this side of the driver. Every mesh is projected, frustum-tested,
 * sorted, has its material looked up and its uniforms pushed, sixty times a
 * second, on the thread that also has to animate the falling hearts. That is the
 * bill, and it is charged per object.
 *
 * So the parts of anything that never moves on its own are welded into one mesh
 * here: transforms baked into the vertices, and per-part colour baked into a
 * vertex colour attribute — which is how the pieces can share a single material
 * without all coming out the same shade.
 *
 * Parts are grouped by *finish*: the surface properties that cannot be baked
 * into a vertex (roughness, metalness, transparency). A cactus comes out as one
 * mesh, a keyring as two, and nothing has to be modelled differently to be
 * cheap.
 */

export type Finish = {
  /**
   * What this surface is called.
   *
   * The name is carried on the object rather than looked up in a list, because
   * a merged mesh has to group its parts by finish and the production build is
   * free to inline or duplicate these literals — so two references to `matte`
   * are not guaranteed to be the same object. Comparing names always works.
   */
  name: string
  roughness: number
  metalness?: number
  transparent?: boolean
  opacity?: number
  depthWrite?: boolean
  side?: Side
  /** A surface that lights itself, like the lit front edge of a plank. */
  emissive?: string
  emissiveIntensity?: number
}

/**
 * The surfaces in the room. Deliberately a short list — every extra one is
 * another mesh — so near-identical roughnesses share a finish.
 */
export const FINISH = {
  /** Unglazed clay, unvarnished wood, cloth, paper, stone. */
  matte: { name: 'matte', roughness: 0.86 },
  /** Painted wood, most plastics, leaves. */
  satin: { name: 'satin', roughness: 0.6 },
  /** Glazed ceramic, polished plastic. */
  glossy: { name: 'glossy', roughness: 0.3 },
  /** Brushed or polished metal: brass, steel, the jar's lid. */
  metal: { name: 'metal', roughness: 0.32, metalness: 0.86 },
  /** Dull metal, kept apart from the bright kind: brackets, hardware. */
  iron: { name: 'iron', roughness: 0.55, metalness: 0.7 },
  /** The front edge of a plank, which is lit so the top reads as a surface. */
  lit: { name: 'lit', roughness: 0.5, emissive: '#9d7657', emissiveIntensity: 0.16 },
  /** Something warmed from inside: the hearts in the jar. */
  ember: { name: 'ember', roughness: 0.45, emissive: '#ff4d8d', emissiveIntensity: 0.08 },
  /** Flat stock seen from both sides: cards, tape. */
  sheet: { name: 'sheet', roughness: 0.5, side: DoubleSide },
  /** Translucent and flat: washi tape holding a print to the wall. */
  tape: {
    name: 'tape',
    roughness: 0.9,
    transparent: true,
    opacity: 0.72,
    side: DoubleSide,
  },
  /** Barely there: the jar, the candle glass, the glazing on a print. */
  glass: {
    name: 'glass',
    roughness: 0.06,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: DoubleSide,
  },
} satisfies Record<string, Finish>

export type Part = {
  /** The shape, at its own size and origin. Consumed — and disposed — by the merge. */
  geometry: BufferGeometry
  color: string
  /** Where the part sits, relative to the object's base. */
  at?: [number, number, number]
  /**
   * Turn about the vertical, applied at `at` and before `offset`.
   *
   * This is the one bit of hierarchy worth keeping: anything arranged in a ring
   * — cactus spines, petals, the keys on a ring — is naturally written as a
   * part at some radius, swung round. It is the same thing the JSX said with a
   * wrapping `<group rotation-y>`, so transcribing a part list is mechanical.
   */
  spin?: number
  /** Where the part sits inside that turn. */
  offset?: [number, number, number]
  /** Rotation in radians, XYZ. */
  rotate?: [number, number, number]
  /** Uniform, or per-axis. */
  scale?: number | [number, number, number]
  finish?: Finish
}

export type Batch = {
  key: string
  geometry: BufferGeometry
  finish: Finish
}

/**
 * Welds a list of parts into one geometry per finish.
 *
 * The inputs are disposed on the way through: they only ever existed to be
 * merged, so the caller should treat the array it passed in as spent.
 */
export function mergeParts(parts: Part[]): Batch[] {
  const buckets = new Map<string, { finish: Finish; geometries: BufferGeometry[] }>()
  const colour = new Color()

  for (const part of parts) {
    const finish: Finish = part.finish ?? FINISH.matte
    const geometry = prepare(part.geometry)
    part.geometry.dispose()

    const local = new Matrix4().compose(
      new Vector3(...(part.offset ?? [0, 0, 0])),
      new Quaternion().setFromEuler(new Euler(...(part.rotate ?? [0, 0, 0]))),
      scaleVector(part.scale),
    )
    const placed = new Matrix4()
      .makeTranslation(...(part.at ?? [0, 0, 0]))
      .multiply(new Matrix4().makeRotationY(part.spin ?? 0))
      .multiply(local)
    geometry.applyMatrix4(placed)

    // Bake the colour, so each part keeps its shade while sharing one material.
    // `Color` converts out of sRGB into the working space for us, which is what
    // the shader expects a vertex colour to be in.
    colour.set(part.color)
    const count = geometry.getAttribute('position').count
    const colours = new Float32Array(count * 3)
    for (let vertex = 0; vertex < count; vertex += 1) {
      colours[vertex * 3] = colour.r
      colours[vertex * 3 + 1] = colour.g
      colours[vertex * 3 + 2] = colour.b
    }
    geometry.setAttribute('color', new BufferAttribute(colours, 3))

    const bucket = buckets.get(finish.name) ?? { finish, geometries: [] }
    bucket.geometries.push(geometry)
    buckets.set(finish.name, bucket)
  }

  const batches: Batch[] = []

  for (const [name, bucket] of buckets) {
    const { geometries } = bucket
    const merged =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false)
    // The pieces live inside the merged mesh now; only that one is needed.
    for (const geometry of geometries) {
      if (geometry !== merged) geometry.dispose()
    }
    if (!merged) continue

    batches.push({ key: `finish-${name}`, geometry: merged, finish: bucket.finish })
  }

  return batches
}

/**
 * Reduces a geometry to the two attributes a merged mesh can carry, and drops
 * the index.
 *
 * `mergeGeometries` refuses inputs that disagree about which attributes, or
 * which indexing scheme, they use, so normalising first is what lets a capsule,
 * a cone and a torus end up in the same buffer. Normals are recomputed when a
 * shape arrives without them. Nothing here is textured, so uv is dropped rather
 * than padded out.
 */
function prepare(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone()

  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position' && name !== 'normal') flat.deleteAttribute(name)
  }
  if (!flat.getAttribute('normal')) flat.computeVertexNormals()

  return flat
}

/** A part's scale, as a vector, defaulting to none. */
function scaleVector(scale: Part['scale']): Vector3 {
  if (scale === undefined) return new Vector3(1, 1, 1)
  if (typeof scale === 'number') return new Vector3(scale, scale, scale)
  return new Vector3(...scale)
}

/* ------------------------------------------------------------------ shapes */
/*
 * Shorthands, so a part list reads like a list of parts and not like three.js.
 *
 * Every one takes the arguments of the constructor it wraps, in the same order,
 * so transcribing a `<mesh><fooGeometry args={[...]}/></mesh>` into a part is a
 * mechanical move: paste the args, and say where it sits and what colour it is.
 */

export const box = (
  width: number,
  height: number,
  depth: number,
  widthSegments = 1,
  heightSegments = 1,
  depthSegments = 1,
): BufferGeometry =>
  new BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)

export const cylinder = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments = 12,
  heightSegments = 1,
  openEnded = false,
): BufferGeometry =>
  new CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments,
    heightSegments,
    openEnded,
  )

export const sphere = (
  radius: number,
  widthSegments = 12,
  heightSegments = 10,
): BufferGeometry => new SphereGeometry(radius, widthSegments, heightSegments)

export const capsule = (
  radius: number,
  length: number,
  capSegments = 5,
  radialSegments = 14,
): BufferGeometry => new CapsuleGeometry(radius, length, capSegments, radialSegments)

export const cone = (
  radius: number,
  height: number,
  radialSegments = 6,
): BufferGeometry => new ConeGeometry(radius, height, radialSegments)

export const torus = (
  radius: number,
  tube: number,
  radialSegments = 8,
  tubularSegments = 24,
  arc = Math.PI * 2,
): BufferGeometry =>
  new TorusGeometry(radius, tube, radialSegments, tubularSegments, arc)

export const disc = (radius: number, segments = 24): BufferGeometry =>
  new CircleGeometry(radius, segments)

export const plane = (width: number, height: number): BufferGeometry =>
  new PlaneGeometry(width, height)
