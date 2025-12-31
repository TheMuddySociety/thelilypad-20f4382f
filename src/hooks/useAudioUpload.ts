import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/x-flac', 'audio/mp3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadProgress {
  [key: string]: number;
}

interface UseAudioUploadReturn {
  uploadAudio: (file: File, userId: string, collectionId?: string) => Promise<string | null>;
  uploadProgress: UploadProgress;
  isUploading: boolean;
  validateAudioFile: (file: File) => { valid: boolean; error?: string };
}

export const useAudioUpload = (): UseAudioUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isUploading, setIsUploading] = useState(false);

  const validateAudioFile = useCallback((file: File) => {
    // Check file type
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Accepted types: MP3, WAV, FLAC`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is 50MB`,
      };
    }

    return { valid: true };
  }, []);

  const uploadAudio = useCallback(async (
    file: File,
    userId: string,
    collectionId?: string
  ): Promise<string | null> => {
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return null;
    }

    setIsUploading(true);
    const fileId = `${Date.now()}-${file.name}`;
    
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${collectionId || 'drafts'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('collection-audio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('collection-audio')
        .getPublicUrl(data.path);

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      return publicUrl;
    } catch (error) {
      console.error('Audio upload error:', error);
      toast.error('Failed to upload audio file');
      return null;
    } finally {
      setIsUploading(false);
      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 2000);
    }
  }, [validateAudioFile]);

  return {
    uploadAudio,
    uploadProgress,
    isUploading,
    validateAudioFile,
  };
};

export default useAudioUpload;
