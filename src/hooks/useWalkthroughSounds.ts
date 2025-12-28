// Web Audio API-based sound effects for the walkthrough
// No external files or APIs needed

class WalkthroughSounds {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Subtle click sound for step transitions
  playStepSound() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Could not play step sound:', e);
    }
  }

  // Soft "whoosh" for going back
  playBackSound() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(500, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Could not play back sound:', e);
    }
  }

  // Celebratory chime for completion
  playCelebrationSound() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      
      // Play a sequence of ascending notes
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const noteDuration = 0.15;
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * noteDuration);
        oscillator.type = 'sine';

        const startTime = ctx.currentTime + i * noteDuration;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration + 0.1);

        oscillator.start(startTime);
        oscillator.stop(startTime + noteDuration + 0.2);
      });

      // Add a final sustained chord
      setTimeout(() => {
        const chordFreqs = [523.25, 659.25, 783.99]; // C major chord
        chordFreqs.forEach((freq) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.setValueAtTime(freq * 2, ctx.currentTime);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
        });
      }, notes.length * noteDuration * 1000);
    } catch (e) {
      console.warn('Could not play celebration sound:', e);
    }
  }

  // Skip/dismiss sound
  playSkipSound() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Could not play skip sound:', e);
    }
  }
}

// Singleton instance
export const walkthroughSounds = new WalkthroughSounds();

// React hook for using sounds
import { useCallback } from 'react';

export function useWalkthroughSounds() {
  const playStep = useCallback(() => {
    walkthroughSounds.playStepSound();
  }, []);

  const playBack = useCallback(() => {
    walkthroughSounds.playBackSound();
  }, []);

  const playCelebration = useCallback(() => {
    walkthroughSounds.playCelebrationSound();
  }, []);

  const playSkip = useCallback(() => {
    walkthroughSounds.playSkipSound();
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    walkthroughSounds.setEnabled(enabled);
  }, []);

  const isEnabled = useCallback(() => {
    return walkthroughSounds.isEnabled();
  }, []);

  return {
    playStep,
    playBack,
    playCelebration,
    playSkip,
    setEnabled,
    isEnabled,
  };
}
