type Listener = () => void

const listeners = new Map<string, Set<Listener>>()

/**
 * A one-line event bus connecting the DOM to the 3D scene.
 *
 * The shelf is WebGL, so the accessible list of its contents in the document
 * has no way to reach it through normal means. This lets a button say "poke the
 * keys" and have the keys respond in the scene, without pulling state management
 * into what is otherwise a local animation.
 */
export function onPoke(id: string, listener: Listener): () => void {
  const set = listeners.get(id) ?? new Set<Listener>()
  listeners.set(id, set)
  set.add(listener)

  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(id)
  }
}

export function poke(id: string): void {
  const set = listeners.get(id)
  if (!set) return
  for (const listener of set) listener()
}
