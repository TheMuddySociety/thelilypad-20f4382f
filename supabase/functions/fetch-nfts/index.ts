import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

interface AlchemyNFT {
  tokenId: string;
  contract: {
    address: string;
    name?: string;
    symbol?: string;
  };
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    originalUrl?: string;
    thumbnailUrl?: string;
  };
  raw?: {
    metadata?: NFTMetadata;
  };
  collection?: {
    name?: string;
  };
}

interface AlchemyResponse {
  ownedNfts: AlchemyNFT[];
  totalCount: number;
  pageKey?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, network = "eth-mainnet", pageKey } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "Wallet address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ALCHEMY_API_KEY = Deno.env.get("ALCHEMY_API_KEY");
    if (!ALCHEMY_API_KEY) {
      console.error("ALCHEMY_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Alchemy API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Alchemy NFT API endpoint
    const baseUrl = `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner`;
    
    const params = new URLSearchParams({
      owner: walletAddress,
      withMetadata: "true",
      pageSize: "20",
    });

    if (pageKey) {
      params.append("pageKey", pageKey);
    }

    console.log(`Fetching NFTs for ${walletAddress} on ${network}`);

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Alchemy API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch NFTs from Alchemy", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: AlchemyResponse = await response.json();

    // Transform the response to a cleaner format
    const nfts = data.ownedNfts.map((nft) => ({
      tokenId: nft.tokenId,
      contractAddress: nft.contract.address,
      name: nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`,
      description: nft.description || nft.raw?.metadata?.description || "",
      image: nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || "",
      collection: nft.collection?.name || nft.contract.name || "Unknown Collection",
      attributes: nft.raw?.metadata?.attributes || [],
    }));

    console.log(`Found ${data.totalCount} total NFTs, returning ${nfts.length}`);

    return new Response(
      JSON.stringify({
        nfts,
        totalCount: data.totalCount,
        pageKey: data.pageKey,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-nfts function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});