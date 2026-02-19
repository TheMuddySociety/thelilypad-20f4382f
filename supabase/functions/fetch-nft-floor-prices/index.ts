import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FloorPriceResponse {
  contractAddress: string;
  floorPrice: number | null;
  currency: string;
  marketplace: string;
}

async function fetchEVMFloorPrice(
  apiKey: string,
  contractAddress: string,
  network: string
): Promise<FloorPriceResponse> {
  const baseUrl = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getFloorPrice`;
  const url = `${baseUrl}?contractAddress=${contractAddress}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch floor price for ${contractAddress}: ${response.status}`);
      return {
        contractAddress,
        floorPrice: null,
        currency: 'ETH',
        marketplace: 'unknown',
      };
    }

    const data = await response.json();

    // Alchemy returns floor prices from multiple marketplaces
    // We'll prioritize OpenSea, then LooksRare, then others
    const openSea = data.openSea;
    const looksRare = data.looksRare;

    let floorPrice: number | null = null;
    let marketplace = 'unknown';
    let currency = 'ETH';

    if (openSea?.floorPrice) {
      floorPrice = openSea.floorPrice;
      marketplace = 'OpenSea';
      currency = openSea.priceCurrency || 'ETH';
    } else if (looksRare?.floorPrice) {
      floorPrice = looksRare.floorPrice;
      marketplace = 'LooksRare';
      currency = looksRare.priceCurrency || 'ETH';
    }

    return {
      contractAddress,
      floorPrice,
      currency,
      marketplace,
    };
  } catch (error) {
    console.error(`Error fetching floor price for ${contractAddress}:`, error);
    return {
      contractAddress,
      floorPrice: null,
      currency: 'ETH',
      marketplace: 'unknown',
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth guard ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // --- End auth guard ---

  try {
    const { contractAddresses, network } = await req.json();

    if (!contractAddresses || !Array.isArray(contractAddresses) || contractAddresses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'contractAddresses array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    if (!apiKey) {
      console.error('ALCHEMY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Alchemy API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Solana doesn't have the same floor price API structure
    if (network === 'solana-mainnet') {
      return new Response(
        JSON.stringify({
          floorPrices: [],
          note: 'Floor price fetching for Solana is not yet supported'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 10 unique contracts to avoid rate limits
    const uniqueContracts = [...new Set(contractAddresses)].slice(0, 10);

    console.log(`Fetching floor prices for ${uniqueContracts.length} contracts on ${network}`);

    // Fetch floor prices in parallel with a small delay between requests
    const floorPrices: FloorPriceResponse[] = [];
    for (const contractAddress of uniqueContracts) {
      const result = await fetchEVMFloorPrice(apiKey, contractAddress, network);
      floorPrices.push(result);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Successfully fetched ${floorPrices.length} floor prices`);

    return new Response(
      JSON.stringify({ floorPrices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-nft-floor-prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch floor prices';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
