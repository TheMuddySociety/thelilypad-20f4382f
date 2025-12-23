import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting (resets on function cold start)
// For production, consider using Redis or a database table
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_VIEWS_PER_CLIP_PER_IP = 3; // Max 3 views per clip per IP per hour

function getClientIP(req: Request): string {
  // Try various headers for client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a hash of user-agent + timestamp bucket for some uniqueness
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `ua-${userAgent.substring(0, 50)}`;
}

function isRateLimited(clipId: string, clientIP: string): boolean {
  const key = `${clipId}:${clientIP}`;
  const now = Date.now();
  
  const existing = rateLimitMap.get(key);
  
  if (!existing || now > existing.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (existing.count >= MAX_VIEWS_PER_CLIP_PER_IP) {
    return true;
  }
  
  existing.count++;
  return false;
}

// Clean up old entries periodically to prevent memory leaks
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
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

    // Get client IP for rate limiting
    const clientIP = getClientIP(req);

    // Apply rate limiting for view events to prevent bot inflation
    if (event_type === 'view') {
      if (isRateLimited(clip_id, clientIP)) {
        console.log(`Rate limited view event for clip ${clip_id} from IP ${clientIP.substring(0, 20)}...`);
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

    // Periodic cleanup of rate limit map
    if (Math.random() < 0.01) { // 1% chance to cleanup on each request
      cleanupRateLimitMap();
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
