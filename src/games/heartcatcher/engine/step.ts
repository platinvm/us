import {
  FINAL_MESSAGE,
  GROUND,
  HEARTS_TO_WIN,
  LIVES,
  MOVE_SPEED,
  NOTES,
  PLAYER_H,
  PLAYER_W,
  VIEW_H,
  VIEW_W,
} from '../config'

/**
 * The simulation, kept free of React and of the DOM.
 *
 * The original ran this against a module-level variable and called the screen
 * functions directly. Here `update` pushes `GameEvent`s instead, which whoever
 * owns the screen drains once a frame. That keeps the engine pure and stops the
 * renderer re-running for things that only matter to the presentation.
 */

export type Phase = 'title' | 'playing' | 'note' | 'win' | 'over'

export type ItemType = 'heart' | 'broken' | 'gold'

export type Item = {
  type: ItemType
  x: number
  y: number
  vy: number
  /** Spin phase, so falling hearts tumble instead of sliding. */
  wobble: number
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export type Star = {
  x: number
  y: number
  phase: number
  big: boolean
}

export type GameEvent =
  | { type: 'caught'; gold: boolean; combo: number }
  | { type: 'hurt' }
  | { type: 'note'; index: number }
  | { type: 'win' }
  | { type: 'over' }

export type Player = {
  x: number
  /** Where the jar wants to be, set by dragging. `null` while held by keys. */
  target: number | null
  bob: number
  /** Facing, so the sprite can lean into a direction. */
  facing: -1 | 1
}

export type World = {
  phase: Phase
  player: Player
  items: Item[]
  particles: Particle[]
  stars: Star[]
  score: number
  hearts: number
  lives: number
  combo: number
  /** Time left before the current run of catches lapses. */
  comboTimer: number
  /** Longest run of catches without dropping one. */
  bestCombo: number
  spawnIn: number
  shake: number
  flash: number
  noteIdx: number
  t: number
  events: GameEvent[]
  /**
   * Copy for the two screens that show prose. Kept on the world so the renderer
   * stays a pure function of it, rather than reaching for module state.
   */
  activeNote: string
  finalMessage: string
}

export type Input = {
  /** -1 left, 1 right, 0 nothing held. */
  dir: -1 | 0 | 1
}

export const PLAYER_Y = VIEW_H - GROUND - PLAYER_H

const ITEM_W = 14
const ITEM_H = 12

/** How long a combo survives without a catch, in seconds. */
const COMBO_WINDOW = 3.2

function makeStars(): Star[] {
  return Array.from({ length: 44 }, () => ({
    x: Math.floor(Math.random() * VIEW_W),
    y: Math.floor(Math.random() * (VIEW_H - GROUND - 90)),
    phase: Math.random() * 6.28,
    big: Math.random() < 0.22,
  }))
}

export function createWorld(): World {
  const world: World = {
    phase: 'title',
    player: { x: VIEW_W / 2 - PLAYER_W / 2, target: null, bob: 0, facing: 1 },
    items: [],
    particles: [],
    stars: [],
    score: 0,
    hearts: 0,
    lives: LIVES,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    spawnIn: 0.6,
    shake: 0,
    flash: 0,
    noteIdx: 0,
    t: 0,
    events: [],
    activeNote: NOTES[0] ?? '',
    finalMessage: FINAL_MESSAGE,
  }
  resetWorld(world)
  return world
}

export function resetWorld(world: World): void {
  world.player = { x: VIEW_W / 2 - PLAYER_W / 2, target: null, bob: 0, facing: 1 }
  world.items = []
  world.particles = []
  world.stars = makeStars()
  world.score = 0
  world.hearts = 0
  world.lives = LIVES
  world.combo = 0
  world.comboTimer = 0
  world.bestCombo = 0
  world.spawnIn = 0.6
  world.shake = 0
  world.flash = 0
  world.noteIdx = 0
  world.t = 0
  world.events.length = 0
  world.activeNote = NOTES[0] ?? ''
  world.finalMessage = FINAL_MESSAGE
}

/** Begins a fresh run. */
export function startRun(world: World): void {
  resetWorld(world)
  world.phase = 'playing'
}

/** Dismisses a note and continues the run. */
export function resumeRun(world: World): void {
  world.phase = 'playing'
}

/** How many hearts must be caught before note `i` appears. */
function noteThreshold(index: number): number {
  return Math.round(
    (HEARTS_TO_WIN * 0.85 * (index + 1)) / (NOTES.length + 1) + 3,
  )
}

function spawn(world: World): void {
  const progress = world.hearts / HEARTS_TO_WIN
  const roll = Math.random()

  let type: ItemType = 'heart'
  if (roll < 0.1 + progress * 0.18) type = 'broken'
  else if (roll > 0.93) type = 'gold'

  world.items.push({
    type,
    x: 10 + Math.random() * (VIEW_W - 34),
    y: -16,
    vy: 62 + Math.random() * 30 + progress * 54,
    wobble: Math.random() * 6.28,
  })
}

function burst(
  world: World,
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i += 1) {
    world.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 90,
      vy: -Math.random() * 80 - 16,
      life: 0.5 + Math.random() * 0.4,
      color,
    })
  }
}

export function update(world: World, input: Input, dt: number): void {
  world.t += dt
  world.player.bob += dt * 7
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 3.2)
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 4.5)

  if (world.combo > 0 && world.phase === 'playing') {
    world.comboTimer -= dt
    if (world.comboTimer <= 0) world.combo = 0
  }

  if (world.phase === 'playing' || world.phase === 'win') {
    for (let i = world.particles.length - 1; i >= 0; i -= 1) {
      const particle = world.particles[i]
      particle.life -= dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.vy += 230 * dt
      if (particle.life <= 0) world.particles.splice(i, 1)
    }
  }

  if (world.phase === 'win') {
    // Gentle celebration rain once the jar is full.
    world.spawnIn -= dt
    if (world.spawnIn <= 0) {
      world.spawnIn = 0.22
      world.items.push({
        type: Math.random() < 0.3 ? 'gold' : 'heart',
        x: Math.random() * (VIEW_W - 18),
        y: -16,
        vy: 46 + Math.random() * 46,
        wobble: Math.random() * 6.28,
      })
    }
    for (let i = world.items.length - 1; i >= 0; i -= 1) {
      const item = world.items[i]
      item.y += item.vy * dt
      item.wobble += dt * 3
      if (item.y > VIEW_H) world.items.splice(i, 1)
    }
    return
  }

  if (world.phase !== 'playing') return

  const player = world.player

  if (input.dir !== 0) {
    player.target = null
    player.x += input.dir * MOVE_SPEED * dt
    player.facing = input.dir
  } else if (player.target !== null) {
    const before = player.x
    player.x += (player.target - player.x) * Math.min(1, dt * 14)
    if (Math.abs(player.x - before) > 0.05) {
      player.facing = player.x > before ? 1 : -1
    }
  }
  player.x = Math.max(0, Math.min(VIEW_W - PLAYER_W, player.x))

  world.spawnIn -= dt
  if (world.spawnIn <= 0) {
    spawn(world)
    const progress = world.hearts / HEARTS_TO_WIN
    world.spawnIn =
      Math.max(0.42, 1.05 - progress * 0.55) * (0.75 + Math.random() * 0.5)
  }

  const jar = { x: player.x + 1, y: PLAYER_Y + 23, w: PLAYER_W - 2, h: 9 }

  for (let i = world.items.length - 1; i >= 0; i -= 1) {
    const item = world.items[i]
    item.y += item.vy * dt
    item.wobble += dt * 3

    const overlaps =
      item.x < jar.x + jar.w &&
      item.x + ITEM_W > jar.x &&
      item.y + ITEM_H > jar.y &&
      item.y + ITEM_H < jar.y + jar.h + 12

    if (overlaps) {
      world.items.splice(i, 1)

      if (item.type === 'broken') {
        world.lives -= 1
        world.shake = 1
        world.flash = 1
        world.combo = 0
        burst(world, item.x + 7, item.y + 6, 'dark', 8)
        world.events.push({ type: 'hurt' })
        if (world.lives <= 0) {
          world.phase = 'over'
          world.events.push({ type: 'over' })
          return
        }
      } else {
        const gold = item.type === 'gold'
        world.hearts += 1
        world.combo += 1
        world.comboTimer = COMBO_WINDOW
        world.bestCombo = Math.max(world.bestCombo, world.combo)

        // A run of catches is worth more than the catches themselves.
        const multiplier = 1 + Math.floor(world.combo / 5)
        world.score += (gold ? 50 : 10) * multiplier

        burst(
          world,
          item.x + 7,
          item.y + 6,
          gold ? 'lightest' : 'light',
          gold ? 12 : 7,
        )
        world.events.push({ type: 'caught', gold, combo: world.combo })

        if (world.hearts >= HEARTS_TO_WIN) {
          world.phase = 'win'
          world.items.length = 0
          world.spawnIn = 0.2
          world.events.push({ type: 'win' })
          return
        }

        if (
          world.noteIdx < NOTES.length &&
          world.hearts >= noteThreshold(world.noteIdx)
        ) {
          world.phase = 'note'
          world.events.push({ type: 'note', index: world.noteIdx })
          world.noteIdx += 1
          return
        }
      }
      continue
    }

    if (item.y > VIEW_H) world.items.splice(i, 1)
  }
}

/** Hands the queued events to the caller and clears the queue. */
export function drainEvents(world: World): GameEvent[] {
  if (world.events.length === 0) return []
  const drained = world.events.slice()
  world.events.length = 0
  return drained
}

/**
 * A cheap fingerprint of everything the presentation cares about, so callers
 * only react when something visible actually changed.
 */
export function snapshot(world: World): string {
  return `${world.phase}|${world.hearts}|${world.lives}|${world.score}|${world.combo}|${world.noteIdx}`
}
