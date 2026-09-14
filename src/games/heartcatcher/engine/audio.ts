/**
 * The chiptune sound effects, ported from the original's `tone()` helper.
 *
 * The `AudioContext` is created lazily, because browsers refuse to start one
 * before a gesture and warn loudly if you try. `unlock()` is called from the
 * first real interaction so the very first caught heart already has sound.
 */

export type Sfx = {
  catch: () => void
  gold: () => void
  hurt: () => void
  note: () => void
  win: () => void
  over: () => void
}

export type AudioBus = {
  enabled: boolean
  unlock: () => void
  dispose: () => void
  sfx: Sfx
}

type AudioContextConstructor = new () => AudioContext

function resolveAudioContext(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

export function createAudioBus(): AudioBus {
  let context: AudioContext | null = null
  let disposed = false

  function ensure(): AudioContext | null {
    if (disposed) return null
    if (context) return context
    const Constructor = resolveAudioContext()
    if (!Constructor) return null
    try {
      context = new Constructor()
      return context
    } catch {
      return null
    }
  }

  function tone(
    frequency: number,
    duration: number,
    delay = 0,
    volume = 0.05,
    type: OscillatorType = 'square',
  ): void {
    if (!bus.enabled || disposed) return
    const audio = ensure()
    if (!audio) return

    try {
      const start = audio.currentTime + delay
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(volume, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(start + duration)
    } catch {
      // Sound is a nice-to-have; never let it break the game.
    }
  }

  const bus: AudioBus = {
    enabled: true,

    unlock() {
      const audio = ensure()
      if (audio && audio.state === 'suspended') void audio.resume()
    },

    dispose() {
      disposed = true
      bus.enabled = false
      if (context) {
        void context.close()
        context = null
      }
    },

    sfx: {
      catch: () => {
        tone(660, 0.07)
        tone(990, 0.09, 0.06)
      },
      gold: () => {
        tone(784, 0.06)
        tone(1046, 0.06, 0.05)
        tone(1318, 0.12, 0.1)
      },
      hurt: () => {
        tone(180, 0.18, 0, 0.06, 'sawtooth')
        tone(120, 0.22, 0.1, 0.05, 'sawtooth')
      },
      note: () => {
        tone(523, 0.12)
        tone(659, 0.12, 0.1)
        tone(784, 0.2, 0.2)
      },
      win: () => {
        const notes = [523, 659, 784, 1046, 784, 1046, 1318]
        notes.forEach((frequency, index) =>
          tone(frequency, 0.22, index * 0.16, 0.05, 'triangle'),
        )
      },
      over: () => {
        const notes = [392, 330, 262]
        notes.forEach((frequency, index) =>
          tone(frequency, 0.28, index * 0.18, 0.05, 'sawtooth'),
        )
      },
    },
  }

  return bus
}
