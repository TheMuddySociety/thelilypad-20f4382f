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

  // Frog ribbit sound for completion
  playCelebrationSound() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      
      // Create a frog "ribbit" sound using frequency modulation
      const playRibbit = (startTime: number, baseFreq: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Frog-like frequency sweep (ribbit goes up then down)
        oscillator.frequency.setValueAtTime(baseFreq, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, startTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startTime + 0.15);
        oscillator.type = 'sawtooth';

        // Low-pass filter for more natural sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, startTime);
        filter.Q.setValueAtTime(5, startTime);

        // Quick attack, short sustain, quick decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.setValueAtTime(0.25, startTime + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      };

      // Play two ribbits (classic frog double-croak)
      const now = ctx.currentTime;
      playRibbit(now, 180);
      playRibbit(now + 0.25, 200);
    } catch (e) {
      console.warn('Could not play frog sound:', e);
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
