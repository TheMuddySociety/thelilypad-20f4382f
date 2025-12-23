import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
const LIVEPEER_API_URL = 'https://livepeer.studio/api';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!LIVEPEER_API_KEY) {
    console.error('LIVEPEER_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'Livepeer API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, streamId, name, userId } = await req.json();
    console.log(`Livepeer action: ${action}`, { streamId, name, userId });

    switch (action) {
      case 'create': {
        // Create a new Livepeer stream
        const response = await fetch(`${LIVEPEER_API_URL}/stream`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name || 'LilyPad Stream',
            profiles: [
              { name: '720p', bitrate: 2000000, fps: 30, width: 1280, height: 720 },
              { name: '480p', bitrate: 1000000, fps: 30, width: 854, height: 480 },
              { name: '360p', bitrate: 500000, fps: 30, width: 640, height: 360 },
            ],
            record: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Livepeer create stream error:', errorText);
          throw new Error(`Failed to create stream: ${errorText}`);
        }

        const stream = await response.json();
        console.log('Created Livepeer stream:', stream.id);

        return new Response(
          JSON.stringify({
            id: stream.id,
            streamKey: stream.streamKey,
            playbackId: stream.playbackId,
            rtmpIngestUrl: `rtmp://rtmp.livepeer.studio/live`,
            playbackUrl: `https://livepeercdn.studio/hls/${stream.playbackId}/index.m3u8`,
            streamUrl: `https://lvpr.tv/?v=${stream.playbackId}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        // Get stream info
        const response = await fetch(`${LIVEPEER_API_URL}/stream/${streamId}`, {
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Livepeer get stream error:', errorText);
          throw new Error(`Failed to get stream: ${errorText}`);
        }

        const stream = await response.json();
        console.log('Got Livepeer stream:', stream.id, 'isActive:', stream.isActive);

        return new Response(
          JSON.stringify({
            id: stream.id,
            name: stream.name,
            isActive: stream.isActive,
            playbackId: stream.playbackId,
            streamKey: stream.streamKey,
            rtmpIngestUrl: `rtmp://rtmp.livepeer.studio/live`,
            playbackUrl: `https://livepeercdn.studio/hls/${stream.playbackId}/index.m3u8`,
            createdAt: stream.createdAt,
            lastSeen: stream.lastSeen,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        // List all streams
        const response = await fetch(`${LIVEPEER_API_URL}/stream?streamsonly=1`, {
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Livepeer list streams error:', errorText);
          throw new Error(`Failed to list streams: ${errorText}`);
        }

        const streams = await response.json();
        console.log('Listed Livepeer streams:', streams.length);

        const formattedStreams = streams.map((stream: any) => ({
          id: stream.id,
          name: stream.name,
          isActive: stream.isActive,
          playbackId: stream.playbackId,
          streamKey: stream.streamKey,
          rtmpIngestUrl: `rtmp://rtmp.livepeer.studio/live`,
          playbackUrl: `https://livepeercdn.studio/hls/${stream.playbackId}/index.m3u8`,
          createdAt: stream.createdAt,
          lastSeen: stream.lastSeen,
        }));

        return new Response(
          JSON.stringify(formattedStreams),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        // Delete a stream
        const response = await fetch(`${LIVEPEER_API_URL}/stream/${streamId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Livepeer delete stream error:', errorText);
          throw new Error(`Failed to delete stream: ${errorText}`);
        }

        console.log('Deleted Livepeer stream:', streamId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in livepeer-stream function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
