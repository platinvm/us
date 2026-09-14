import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the user's reduced-motion preference.
 *
 * Every animation in the shelf asks for this rather than assuming motion is
 * fine: the fly-to-camera transition collapses to a crossfade, and both games
 * keep their gameplay but drop their idle flourishes.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}
