import { useState, useCallback, useEffect } from 'react';

interface UseAudioDurationReturn {
  duration: number | null;
  formattedDuration: string;
  detectDuration: (file: File | string) => Promise<number>;
  isDetecting: boolean;
}

export const useAudioDuration = (): UseAudioDurationReturn => {
  const [duration, setDuration] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const formatDuration = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const detectDuration = useCallback(async (source: File | string): Promise<number> => {
    setIsDetecting(true);
    
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      const handleLoadedMetadata = () => {
        const detectedDuration = audio.duration;
        setDuration(detectedDuration);
        setIsDetecting(false);
        cleanup();
        resolve(detectedDuration);
      };
      
      const handleError = () => {
        setIsDetecting(false);
        cleanup();
        reject(new Error('Failed to load audio'));
      };
      
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        if (typeof source !== 'string') {
          URL.revokeObjectURL(audio.src);
        }
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);
      
      if (typeof source === 'string') {
        audio.src = source;
      } else {
        audio.src = URL.createObjectURL(source);
      }
    });
  }, []);

  const formattedDuration = duration !== null ? formatDuration(duration) : '0:00';

  return {
    duration,
    formattedDuration,
    detectDuration,
    isDetecting,
  };
};

export const formatAudioDuration = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default useAudioDuration;
