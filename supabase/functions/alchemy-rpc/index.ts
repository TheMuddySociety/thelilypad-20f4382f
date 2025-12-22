import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const { network = 'monad-mainnet', ...rpcRequest } = body;
    
    console.log(`Proxying RPC request to ${network}:`, JSON.stringify(rpcRequest).substring(0, 200));

    // Build the Alchemy URL based on the network
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
