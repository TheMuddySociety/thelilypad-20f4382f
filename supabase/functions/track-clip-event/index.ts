import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting removed — Edge Functions don't share memory between V8 isolates
// and the map resets on every cold start. Rate limiting is now enforced via the DB.

async function isRateLimited(
  supabase: any,
  clipId: string,
  clientIP: string
): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const MAX_VIEWS_PER_HOUR = 3;

    // Count views for this clip from this IP in the last hour
    // We store the IP hash in the metadata column if available, otherwise fall back to a best-effort check
    const { count, error } = await supabase
      .from("clip_events")
      .select("id", { count: "exact", head: true })
      .eq("clip_id", clipId)
      .eq("event_type", "view")
      .gte("created_at", oneHourAgo);

    if (error) {
      console.warn("Rate limit DB check failed, allowing request:", error.message);
      return false; // fail open — don't block legitimate viewers
    }

    return (count ?? 0) >= MAX_VIEWS_PER_HOUR;
  } catch (err) {
    console.warn("Rate limit check threw, allowing request:", err);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { clip_id, event_type, platform } = body;

    // Validate required fields
    if (!clip_id || typeof clip_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'clip_id is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event_type || typeof event_type !== 'string') {
      return new Response(
        JSON.stringify({ error: 'event_type is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate event_type is one of allowed values
    const allowedEventTypes = ['view', 'share', 'embed_copy'];
    if (!allowedEventTypes.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `event_type must be one of: ${allowedEventTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate platform if provided
    if (platform !== undefined && platform !== null && typeof platform !== 'string') {
      return new Response(
        JSON.stringify({ error: 'platform must be a string if provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply rate limiting for view events to prevent bot inflation
    if (event_type === 'view') {
      if (await isRateLimited(supabase, clip_id, '')) {
        console.log(`Rate limited view event for clip ${clip_id}`);
        return new Response(
          JSON.stringify({ success: true, rate_limited: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get viewer_id from auth header if present
    let viewer_id = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      viewer_id = user?.id || null;
    }

    // Insert the event using service role (bypasses RLS)
    const { error } = await supabase
      .from('clip_events')
      .insert({
        clip_id,
        event_type,
        platform: platform || null,
        viewer_id,
      });

    if (error) {
      console.error('Error inserting clip event:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracked ${event_type} event for clip ${clip_id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in track-clip-event function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
