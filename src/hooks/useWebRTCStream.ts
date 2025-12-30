import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreamState {
  isStreaming: boolean;
  isConnecting: boolean;
  roomId: string | null;
  joinUrl: string | null;
  error: string | null;
}

export const useWebRTCStream = () => {
  const { toast } = useToast();
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    isConnecting: false,
    roomId: null,
    joinUrl: null,
    error: null,
  });
  
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

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

      setState({
        isStreaming: true,
        isConnecting: false,
        roomId,
        joinUrl: joinData.user.joinUrl,
        error: null,
      });

      toast({
        title: 'Stream started!',
        description: 'You are now live. Share your stream link with viewers.',
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
        roomId: null,
        joinUrl: null,
        error: errorMessage,
      });

      toast({
        variant: 'destructive',
        title: 'Failed to start stream',
        description: errorMessage,
      });

      return null;
    }
  }, [toast]);

  const stopStream = useCallback(async () => {
    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
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

    setState({
      isStreaming: false,
      isConnecting: false,
      roomId: null,
      joinUrl: null,
      error: null,
    });

    toast({
      title: 'Stream ended',
      description: 'Your live stream has ended.',
    });
  }, [state.roomId, toast]);

  const getMediaStream = useCallback(() => {
    return mediaStreamRef.current;
  }, []);

  return {
    ...state,
    startStream,
    stopStream,
    getMediaStream,
  };
};
