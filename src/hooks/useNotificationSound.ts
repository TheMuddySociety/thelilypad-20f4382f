import { useCallback, useEffect, useState } from "react";

export type NotificationSoundType = "none" | "chime" | "bell" | "pop" | "alert";

interface NotificationSoundSettings {
  sound: NotificationSoundType;
  volume: number;
}

const SOUND_SETTINGS_KEY = "notification_sound_settings";

const DEFAULT_SETTINGS: NotificationSoundSettings = {
  sound: "chime",
  volume: 0.5,
};

// Web Audio API based sound generation
const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

const playChime = (volume: number) => {
  const ctx = createAudioContext();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.setValueAtTime(1000, now + 0.1);
  osc.frequency.setValueAtTime(1200, now + 0.2);
  
  gain.gain.setValueAtTime(volume * 0.3, now);
  gain.gain.exponentialDecayTo?.(0.01, now + 0.4) || gain.gain.setValueAtTime(0.01, now + 0.4);
  
  osc.start(now);
  osc.stop(now + 0.4);
  
  setTimeout(() => ctx.close(), 500);
};

const playBell = (volume: number) => {
  const ctx = createAudioContext();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(880, now);
  osc.type = "sine";
  
  gain.gain.setValueAtTime(volume * 0.4, now);
  gain.gain.exponentialDecayTo?.(0.01, now + 0.8) || gain.gain.setValueAtTime(0.01, now + 0.8);
  
  osc.start(now);
  osc.stop(now + 0.8);
  
  setTimeout(() => ctx.close(), 900);
};

const playPop = (volume: number) => {
  const ctx = createAudioContext();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
  
  gain.gain.setValueAtTime(volume * 0.5, now);
  gain.gain.exponentialDecayTo?.(0.01, now + 0.15) || gain.gain.setValueAtTime(0.01, now + 0.15);
  
  osc.start(now);
  osc.stop(now + 0.15);
  
  setTimeout(() => ctx.close(), 200);
};

const playAlert = (volume: number) => {
  const ctx = createAudioContext();
  const now = ctx.currentTime;
  
  // Two-tone alert
  [0, 0.15].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(i === 0 ? 600 : 800, now + delay);
    osc.type = "square";
    
    gain.gain.setValueAtTime(volume * 0.2, now + delay);
    gain.gain.setValueAtTime(0, now + delay + 0.1);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.1);
  });
  
  setTimeout(() => ctx.close(), 400);
};

const getSavedSettings = (): NotificationSoundSettings => {
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Error reading sound settings:", e);
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: NotificationSoundSettings) => {
  try {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving sound settings:", e);
  }
};

export const useNotificationSound = () => {
  const [settings, setSettings] = useState<NotificationSoundSettings>(getSavedSettings);

  const playSound = useCallback(() => {
    if (settings.sound === "none" || settings.volume === 0) return;
    
    switch (settings.sound) {
      case "chime":
        playChime(settings.volume);
        break;
      case "bell":
        playBell(settings.volume);
        break;
      case "pop":
        playPop(settings.volume);
        break;
      case "alert":
        playAlert(settings.volume);
        break;
    }
  }, [settings]);

  const setSound = useCallback((sound: NotificationSoundType) => {
    setSettings(prev => {
      const next = { ...prev, sound };
      saveSettings(next);
      return next;
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings(prev => {
      const next = { ...prev, volume: Math.max(0, Math.min(1, volume)) };
      saveSettings(next);
      return next;
    });
  }, []);

  const previewSound = useCallback((sound: NotificationSoundType, volume: number) => {
    if (sound === "none" || volume === 0) return;
    
    switch (sound) {
      case "chime":
        playChime(volume);
        break;
      case "bell":
        playBell(volume);
        break;
      case "pop":
        playPop(volume);
        break;
      case "alert":
        playAlert(volume);
        break;
    }
  }, []);

  return {
    sound: settings.sound,
    volume: settings.volume,
    setSound,
    setVolume,
    playSound,
    previewSound,
  };
};
