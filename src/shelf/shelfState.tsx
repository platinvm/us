import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Which prop, if any, has been picked up.
 *
 * Deliberately the whole of the shelf's state. There is no open/closed phase,
 * no overlay lifecycle and no handoff to synchronise: a prop is either on the
 * shelf or it is in your hands, and everything else is interpolation.
 */
type ShelfContextValue = {
  focusedId: string | null
  /**
   * True when the focused prop has drilled into a view of its own — a card
   * lifted out of the binder, say.
   *
   * Props report this rather than fighting over the Escape key. Two components
   * both listening for Escape and each trying to work out whether the other
   * got there first is a race that only ever resolves by accident; asking the
   * prop whether it is busy is decided on the render before the key is pressed.
   */
  subView: boolean
  setSubView: (value: boolean) => void
  /**
   * True while something is mid-animation — a prop being picked up or put back,
   * or a card coming out of the binder.
   *
   * Everything that can start an animation checks this first, so a second tap
   * while the first movement is still running is simply ignored rather than
   * fighting it. Animations always play to the end.
   */
  busy: boolean
  setBusy: (value: boolean) => void
  /** Pick a prop up. */
  focusTo: (id: string) => void
  /** Put it back, and reset anything it had opened. */
  release: () => void
  /** True when nothing is being held. */
  browsing: boolean
}

const ShelfContext = createContext<ShelfContextValue | null>(null)

export function ShelfProvider({ children }: { children: ReactNode }) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [subView, setSubViewState] = useState(false)
  const [busy, setBusyState] = useState(false)

  const focusTo = useCallback((id: string) => {
    setSubViewState(false)
    setFocusedId(id)
  }, [])

  const release = useCallback(() => {
    setSubViewState(false)
    setFocusedId(null)
  }, [])

  const setSubView = useCallback((value: boolean) => setSubViewState(value), [])
  const setBusy = useCallback((value: boolean) => setBusyState(value), [])

  const value = useMemo<ShelfContextValue>(
    () => ({
      focusedId,
      subView,
      setSubView,
      busy,
      setBusy,
      focusTo,
      release,
      browsing: focusedId === null,
    }),
    [focusedId, subView, setSubView, busy, setBusy, focusTo, release],
  )

  return <ShelfContext value={value}>{children}</ShelfContext>
}

export function useShelf(): ShelfContextValue {
  const value = useContext(ShelfContext)
  if (!value) throw new Error('useShelf must be used inside <ShelfProvider>')
  return value
}
