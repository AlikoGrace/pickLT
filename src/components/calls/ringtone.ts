/**
 * Incoming-call ring for the web: a soft two-burst dual tone (440 + 480 Hz,
 * the classic ring cadence, at low amplitude) followed by silence, looped.
 * Built as an inline WAV data-URL like the chime in `NotificationWrapper` and
 * the alarm in `MoveRequestPopup` — an `<audio>` element is far more reliable
 * across browsers than Web Audio oscillators for autoplay.
 *
 * Browsers only let audio start after the page has had a user gesture, so the
 * element is warmed up on the first click/key/touch. A ring that arrives before
 * any interaction stays silent; the modal (and, with the tab hidden, the
 * browser notification) still shows.
 */

let dataUrl: string | null = null
let audio: HTMLAudioElement | null = null
let ringing = false

function ringDataUrl(): string {
  if (dataUrl) return dataUrl
  const sampleRate = 22050
  const duration = 3.0
  const samples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + samples * 2)
  const dv = new DataView(buffer)
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i))
  }
  ws(0, 'RIFF')
  dv.setUint32(4, 36 + samples * 2, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  dv.setUint32(16, 16, true)
  dv.setUint16(20, 1, true)
  dv.setUint16(22, 1, true)
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * 2, true)
  dv.setUint16(32, 2, true)
  dv.setUint16(34, 16, true)
  ws(36, 'data')
  dv.setUint32(40, samples * 2, true)

  // Two 0.4 s bursts (0.0–0.4 s, 0.6–1.0 s), then 2 s of silence.
  const bursts = [
    { start: 0, end: 0.4 },
    { start: 0.6, end: 1.0 },
  ]
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    let sample = 0
    for (const b of bursts) {
      if (t < b.start || t > b.end) continue
      const local = t - b.start
      const len = b.end - b.start
      // 20 ms fade in/out so the bursts don't click.
      const env = Math.min(1, local / 0.02, (len - local) / 0.02)
      sample = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) * 0.18 * env
    }
    dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  dataUrl = 'data:audio/wav;base64,' + btoa(binary)
  return dataUrl
}

function ringAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(ringDataUrl())
    audio.loop = true
    audio.volume = 0.7
  }
  return audio
}

if (typeof window !== 'undefined') {
  const warmUp = () => {
    const a = ringAudio()
    a.muted = true
    a.play()
      .then(() => {
        // A ring that started while the warm-up was in flight keeps playing.
        if (!ringing) {
          a.pause()
          a.currentTime = 0
        }
        a.muted = false
      })
      .catch(() => {
        a.muted = false
      })
    window.removeEventListener('click', warmUp)
    window.removeEventListener('touchstart', warmUp)
    window.removeEventListener('keydown', warmUp)
  }
  window.addEventListener('click', warmUp, { once: true })
  window.addEventListener('touchstart', warmUp, { once: true })
  window.addEventListener('keydown', warmUp, { once: true })
}

export function startRing(): void {
  if (typeof window === 'undefined') return
  ringing = true
  const a = ringAudio()
  a.muted = false
  a.currentTime = 0
  a.play().catch(() => {})
}

export function stopRing(): void {
  ringing = false
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
}
