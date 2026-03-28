/**
 * Procedurally generates a pleasant notification "ding" using the native Web Audio API.
 * This guarantees the sound plays instantly without needing to load MP3 files from a server.
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    
    // Create oscillator for the sound wave
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // High-pitched bell frequency profile
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // High pitch
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1) // Slightly drops
    
    // Fast attack, slow fade envelope (sounds like a strike)
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05) // max volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8) // decay
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch (e) {
    console.error('Audio playback failed or was blocked by browser auto-play policy', e)
  }
}
