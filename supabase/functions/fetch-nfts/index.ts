import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported EVM networks
const EVM_NETWORKS = [
  "eth-mainnet",
  "polygon-mainnet",
  "arb-mainnet",
  "opt-mainnet",
  "base-mainnet",
];

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

// Solana NFT response types
interface SolanaNFT {
  mint: string;
  name?: string;
  description?: string;
  image?: string;
  collection?: {
    name?: string;
  };
}

interface SolanaResponse {
  nfts: SolanaNFT[];
  pageKey?: string;
}

async function fetchEVMNFTs(
  apiKey: string,
  walletAddress: string,
  network: string,
  pageKey?: string
) {
  const baseUrl = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`;
  
  const params = new URLSearchParams({
    owner: walletAddress,
    withMetadata: "true",
    pageSize: "20",
  });

  if (pageKey) {
    params.append("pageKey", pageKey);
  }

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alchemy API error: ${response.status} - ${errorText}`);
  }

  const data: AlchemyResponse = await response.json();

  const nfts = data.ownedNfts.map((nft) => ({
    tokenId: nft.tokenId,
    contractAddress: nft.contract.address,
    name: nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`,
    description: nft.description || nft.raw?.metadata?.description || "",
    image: nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || "",
    collection: nft.collection?.name || nft.contract.name || "Unknown Collection",
    attributes: nft.raw?.metadata?.attributes || [],
  }));

  return {
    nfts,
    totalCount: data.totalCount,
    pageKey: data.pageKey,
  };
}

async function fetchSolanaNFTs(
  apiKey: string,
  walletAddress: string,
  pageKey?: string
) {
  const baseUrl = `https://solana-mainnet.g.alchemy.com/nft/v2/${apiKey}/getNFTsForOwner`;
  
  const params = new URLSearchParams({
    owner: walletAddress,
    pageSize: "20",
  });

  if (pageKey) {
    params.append("pageKey", pageKey);
  }

  console.log(`Fetching Solana NFTs for ${walletAddress}`);

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Solana API error:", response.status, errorText);
    throw new Error(`Alchemy Solana API error: ${response.status} - ${errorText}`);
  }

  const data: SolanaResponse = await response.json();

  const nfts = (data.nfts || []).map((nft) => ({
    tokenId: nft.mint,
    contractAddress: nft.mint,
    name: nft.name || `Solana NFT`,
    description: nft.description || "",
    image: nft.image || "",
    collection: nft.collection?.name || "Solana Collection",
    attributes: [],
  }));

  return {
    nfts,
    totalCount: nfts.length,
    pageKey: data.pageKey,
  };
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

    console.log(`Fetching NFTs for ${walletAddress} on ${network}`);

    let result;
    
    if (network === "solana-mainnet") {
      result = await fetchSolanaNFTs(ALCHEMY_API_KEY, walletAddress, pageKey);
    } else if (EVM_NETWORKS.includes(network)) {
      result = await fetchEVMNFTs(ALCHEMY_API_KEY, walletAddress, network, pageKey);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported network: ${network}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${result.totalCount} total NFTs, returning ${result.nfts.length}`);

    return new Response(
      JSON.stringify(result),
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