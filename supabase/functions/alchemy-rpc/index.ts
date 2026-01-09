import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to your domains
const ALLOWED_ORIGINS = [
  'https://lilypad.tv',
  'https://www.lilypad.tv',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

// Get CORS headers with origin validation
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';

  // Check if origin is in allowed list or if it's a Lovable preview URL
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.includes('.lovable.app') ||
    origin.includes('.lovableproject.com');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Allowed network values
const ALLOWED_NETWORKS = ['solana-mainnet', 'solana-devnet'];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');

    if (!alchemyApiKey) {
      console.error('ALCHEMY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Alchemy API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { network = 'solana-mainnet', ...rpcRequest } = body;

    // Validate network parameter to prevent injection
    if (!ALLOWED_NETWORKS.includes(network)) {
      console.error(`Invalid network requested: ${network}`);
      return new Response(
        JSON.stringify({ error: `Invalid network. Allowed: ${ALLOWED_NETWORKS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying RPC request to ${network}:`, JSON.stringify(rpcRequest).substring(0, 200));

    // Build the Alchemy URL based on the validated network
    const alchemyUrl = `https://${network}.g.alchemy.com/v2/${alchemyApiKey}`;

    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcRequest),
    });

    const data = await response.json();

    console.log(`RPC response status: ${response.status}`);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in alchemy-rpc function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
