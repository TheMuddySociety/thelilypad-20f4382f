import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StreamSource = 'camera' | 'screen';
export type StreamQuality = '480p' | '720p' | '1080p';

interface StreamState {
  isStreaming: boolean;
  isConnecting: boolean;
  isSwitchingSource: boolean;
  roomId: string | null;
  joinUrl: string | null;
  error: string | null;
  streamDbId: string | null;
  source: StreamSource | null;
  isPipEnabled: boolean;
}

interface StreamMetadata {
  title: string;
  category?: string;
  thumbnailUrl?: string;
}

interface StartStreamOptions {
  metadata?: StreamMetadata;
  source?: StreamSource;
  quality?: StreamQuality;
}

const qualitySettings: Record<StreamQuality, { width: number; height: number; frameRate: number }> = {
  '480p': { width: 854, height: 480, frameRate: 30 },
  '720p': { width: 1280, height: 720, frameRate: 30 },
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
};

export const useWebRTCStream = () => {
  const { toast } = useToast();
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    isConnecting: false,
    isSwitchingSource: false,
    roomId: null,
    joinUrl: null,
    error: null,
    streamDbId: null,
    source: null,
    isPipEnabled: false,
  });
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);

  const getMediaStream = useCallback(async (source: StreamSource, quality: StreamQuality = '720p'): Promise<MediaStream> => {
    const settings = qualitySettings[quality];
    
    if (source === 'screen') {
      // Get screen share with system audio if available
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: settings.width },
          height: { ideal: settings.height },
          frameRate: { ideal: settings.frameRate },
        },
        audio: true, // Capture system audio if available
      });

      // Try to get microphone audio as well
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        // Combine screen video with microphone audio
        const audioTracks = [...screenStream.getAudioTracks(), ...micStream.getAudioTracks()];
        const videoTracks = screenStream.getVideoTracks();
        
        return new MediaStream([...videoTracks, ...audioTracks]);
      } catch {
        // If mic access fails, just use screen stream
        return screenStream;
      }
    } else {
      // Camera stream
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: settings.width },
          height: { ideal: settings.height },
          frameRate: { ideal: settings.frameRate },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }
  }, []);

  const startStream = useCallback(async (options?: StartStreamOptions) => {
    const source = options?.source || 'camera';
    const quality = options?.quality || '720p';
    const metadata = options?.metadata;
    
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to stream');
      }

      // Get media based on source and quality
      const stream = await getMediaStream(source, quality);

      mediaStreamRef.current = stream;

      // Create a WebRTC room
      const { data: roomData, error: roomError } = await supabase.functions.invoke('webrtc-stream', {
        body: { action: 'create-room' },
      });

      if (roomError || !roomData?.success) {
        throw new Error(roomData?.error || roomError?.message || 'Failed to create room');
      }

      const roomId = roomData.room.id;

      // Join the room as broadcaster
      const { data: joinData, error: joinError } = await supabase.functions.invoke('webrtc-stream', {
        body: { action: 'join-room', roomId },
      });

      if (joinError || !joinData?.success) {
        throw new Error(joinData?.error || joinError?.message || 'Failed to join room');
      }

      // Create stream record in database
      const streamTitle = metadata?.title?.trim() || 'Live Stream';
      const streamCategory = metadata?.category || null;
      const streamThumbnail = metadata?.thumbnailUrl || null;

      const { data: streamRecord, error: dbError } = await supabase
        .from('streams')
        .insert({
          user_id: user.id,
          title: streamTitle,
          category: streamCategory,
          thumbnail_url: streamThumbnail,
          is_live: true,
          stream_key_id: roomId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to create stream record:', dbError);
        // Don't throw - stream can still work without DB record
      }

      setState({
        isStreaming: true,
        isConnecting: false,
        isSwitchingSource: false,
        roomId,
        joinUrl: joinData.user.joinUrl,
        error: null,
        streamDbId: streamRecord?.id || null,
        source,
        isPipEnabled: false,
      });

      toast({
        title: 'Stream started!',
        description: `You are now live${source === 'screen' ? ' (Screen Share)' : ''}. Share your stream link with viewers.`,
      });

      return { stream, roomId, joinUrl: joinData.user.joinUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start stream';
      console.error('Stream error:', error);
      
      // Stop any media tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      setState({
        isStreaming: false,
        isConnecting: false,
        isSwitchingSource: false,
        roomId: null,
        joinUrl: null,
        error: errorMessage,
        streamDbId: null,
        source: null,
        isPipEnabled: false,
      });

      toast({
        variant: 'destructive',
        title: 'Failed to start stream',
        description: errorMessage,
      });

      return null;
    }
  }, [toast, getMediaStream]);

  const stopStream = useCallback(async () => {
    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Update stream record to mark as ended
    if (state.streamDbId) {
      try {
        await supabase
          .from('streams')
          .update({
            is_live: false,
            ended_at: new Date().toISOString(),
          })
          .eq('id', state.streamDbId);
      } catch (error) {
        console.error('Failed to update stream record:', error);
      }
    }

    // Delete the room if we have one
    if (state.roomId) {
      try {
        await supabase.functions.invoke('webrtc-stream', {
          body: { action: 'delete-room', roomId: state.roomId },
        });
      } catch (error) {
        console.error('Failed to delete room:', error);
      }
    }

    // Stop PiP stream if active
    if (pipStreamRef.current) {
      pipStreamRef.current.getTracks().forEach(track => track.stop());
      pipStreamRef.current = null;
    }

    setState({
      isStreaming: false,
      isConnecting: false,
      isSwitchingSource: false,
      roomId: null,
      joinUrl: null,
      error: null,
      streamDbId: null,
      source: null,
      isPipEnabled: false,
    });

    toast({
      title: 'Stream ended',
      description: 'Your live stream has ended.',
    });
  }, [state.roomId, state.streamDbId, toast]);

  const getCurrentMediaStream = useCallback(() => {
    return mediaStreamRef.current;
  }, []);

  const switchSource = useCallback(async (newSource: StreamSource): Promise<MediaStream | null> => {
    if (!state.isStreaming || state.source === newSource) {
      return mediaStreamRef.current;
    }

    setState(prev => ({ ...prev, isSwitchingSource: true }));

    try {
      // Stop current video tracks (keep audio if switching to screen)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach(track => track.stop());
      }

      // Get new media stream
      const newStream = await getMediaStream(newSource);

      // Update the media stream reference
      mediaStreamRef.current = newStream;

      setState(prev => ({ 
        ...prev, 
        isSwitchingSource: false,
        source: newSource,
      }));

      toast({
        title: 'Source switched',
        description: `Now streaming from ${newSource === 'screen' ? 'screen share' : 'camera'}.`,
      });

      return newStream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch source';
      console.error('Switch source error:', error);

      setState(prev => ({ ...prev, isSwitchingSource: false }));

      toast({
        variant: 'destructive',
        title: 'Failed to switch source',
        description: errorMessage,
      });

      return null;
    }
  }, [state.isStreaming, state.source, getMediaStream, toast]);

  const togglePip = useCallback(async (): Promise<MediaStream | null> => {
    if (!state.isStreaming || state.source !== 'screen') {
      toast({
        variant: 'destructive',
        title: 'PiP not available',
        description: 'Picture-in-picture is only available during screen sharing.',
      });
      return null;
    }

    if (state.isPipEnabled) {
      // Disable PiP - stop camera stream
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach(track => track.stop());
        pipStreamRef.current = null;
      }
      setState(prev => ({ ...prev, isPipEnabled: false }));
      toast({
        title: 'Camera overlay disabled',
        description: 'Picture-in-picture mode turned off.',
      });
      return null;
    } else {
      // Enable PiP - start camera stream
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: false, // Audio already from main stream
        });
        
        pipStreamRef.current = cameraStream;
        setState(prev => ({ ...prev, isPipEnabled: true }));
        
        toast({
          title: 'Camera overlay enabled',
          description: 'Your camera is now visible as an overlay.',
        });
        
        return cameraStream;
      } catch (error) {
        console.error('Failed to enable PiP:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to enable camera overlay',
          description: 'Could not access camera for picture-in-picture.',
        });
        return null;
      }
    }
  }, [state.isStreaming, state.source, state.isPipEnabled, toast]);

  const getPipStream = useCallback(() => {
    return pipStreamRef.current;
  }, []);

  return {
    ...state,
    startStream,
    stopStream,
    switchSource,
    togglePip,
    getMediaStream: getCurrentMediaStream,
    getPipStream,
  };
};
