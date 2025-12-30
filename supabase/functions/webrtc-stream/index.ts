import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, streamId, roomId } = await req.json();
    console.log(`WebRTC Stream action: ${action}`, { streamId, roomId });

    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY not configured');
    }

    switch (action) {
      case 'create-room': {
        // Create a WebRTC room for browser-based streaming
        const response = await fetch('https://livepeer.studio/api/room', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to create room:', error);
          throw new Error(`Failed to create room: ${error}`);
        }

        const room = await response.json();
        console.log('Room created:', room);

        return new Response(JSON.stringify({
          success: true,
          room: {
            id: room.id,
            name: room.name,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join-room': {
        if (!roomId) {
          throw new Error('roomId is required to join a room');
        }

        // Create a user token to join the room
        const response = await fetch(`https://livepeer.studio/api/room/${roomId}/user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'broadcaster',
            canPublish: true,
            canPublishData: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to join room:', error);
          throw new Error(`Failed to join room: ${error}`);
        }

        const user = await response.json();
        console.log('User joined room:', user);

        return new Response(JSON.stringify({
          success: true,
          user: {
            id: user.id,
            joinUrl: user.joinUrl,
            token: user.token,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join-as-viewer': {
        if (!roomId) {
          throw new Error('roomId is required to join as viewer');
        }

        // Create a viewer token (cannot publish)
        const response = await fetch(`https://livepeer.studio/api/room/${roomId}/user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'viewer',
            canPublish: false,
            canPublishData: false,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to join as viewer:', error);
          throw new Error(`Failed to join as viewer: ${error}`);
        }

        const user = await response.json();
        console.log('Viewer joined room:', user);

        return new Response(JSON.stringify({
          success: true,
          user: {
            id: user.id,
            joinUrl: user.joinUrl,
            token: user.token,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete-room': {
        if (!roomId) {
          throw new Error('roomId is required to delete a room');
        }

        const response = await fetch(`https://livepeer.studio/api/room/${roomId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to delete room:', error);
          throw new Error(`Failed to delete room: ${error}`);
        }

        console.log('Room deleted:', roomId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Room deleted',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-room': {
        if (!roomId) {
          throw new Error('roomId is required');
        }

        const response = await fetch(`https://livepeer.studio/api/room/${roomId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to get room:', error);
          throw new Error(`Failed to get room: ${error}`);
        }

        const room = await response.json();
        console.log('Room fetched:', room);

        return new Response(JSON.stringify({
          success: true,
          room,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WebRTC Stream error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
