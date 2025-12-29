// Web Audio API-based sound effects for NFT reveal animations
import { useCallback } from 'react';

class RevealSounds {
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

  // Dramatic whoosh sound when card starts flipping
  playFlipStart() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Could not play flip start sound:', e);
    }
  }

  // Magical reveal sound when NFT is revealed
  playReveal() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      
      // Sparkle ascending notes
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const startTime = ctx.currentTime + i * 0.08;
        oscillator.frequency.setValueAtTime(freq, startTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });

      // Add shimmer/bell overtone
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2093, ctx.currentTime); // C7
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch (e) {
      console.warn('Could not play reveal sound:', e);
    }
  }

  // Celebration fanfare for the confetti moment
  playCelebration() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      
      // Triumphant chord progression
      const chords = [
        [261.63, 329.63, 392], // C major
        [293.66, 369.99, 440], // D major
        [329.63, 415.30, 493.88], // E major
        [392, 493.88, 587.33], // G major (resolution)
      ];
      
      chords.forEach((chord, chordIndex) => {
        const startTime = ctx.currentTime + chordIndex * 0.15;
        
        chord.forEach((freq) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.setValueAtTime(freq * 2, startTime);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
          gainNode.gain.setValueAtTime(0.08, startTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

          oscillator.start(startTime);
          oscillator.stop(startTime + 0.35);
        });
      });

      // Add impact drum-like sound
      const drumOsc = ctx.createOscillator();
      const drumGain = ctx.createGain();
      
      drumOsc.connect(drumGain);
      drumGain.connect(ctx.destination);
      
      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(150, ctx.currentTime);
      drumOsc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      
      drumGain.gain.setValueAtTime(0.3, ctx.currentTime);
      drumGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      drumOsc.start(ctx.currentTime);
      drumOsc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Could not play celebration sound:', e);
    }
  }

  // Soft click for navigation
  playNavigate() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Could not play navigate sound:', e);
    }
  }

  // Skip all sound
  playSkip() {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(500, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Could not play skip sound:', e);
    }
  }
}

// Singleton instance
const revealSounds = new RevealSounds();

export function useRevealSounds() {
  const playFlipStart = useCallback(() => {
    revealSounds.playFlipStart();
  }, []);

  const playReveal = useCallback(() => {
    revealSounds.playReveal();
  }, []);

  const playCelebration = useCallback(() => {
    revealSounds.playCelebration();
  }, []);

  const playNavigate = useCallback(() => {
    revealSounds.playNavigate();
  }, []);

  const playSkip = useCallback(() => {
    revealSounds.playSkip();
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    revealSounds.setEnabled(enabled);
  }, []);

  const isEnabled = useCallback(() => {
    return revealSounds.isEnabled();
  }, []);

  return {
    playFlipStart,
    playReveal,
    playCelebration,
    playNavigate,
    playSkip,
    setEnabled,
    isEnabled,
  };
}
