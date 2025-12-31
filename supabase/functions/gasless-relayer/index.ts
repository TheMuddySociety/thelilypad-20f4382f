import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  encodeFunctionData,
  verifyTypedData,
  type Hex,
} from "https://esm.sh/viem@2.41.2";
import { privateKeyToAccount } from "https://esm.sh/viem@2.41.2/accounts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Monad network configs
const MONAD_MAINNET = {
  id: 143,
  name: "Monad",
  rpcUrl: "https://rpc.monad.xyz",
};

const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
};

// NFT contract ABI for minting
const NFT_ABI = parseAbi([
  "function mintPublic(uint256 amount) payable",
  "function mintWithAllowlist(uint256 amount, bytes32[] calldata merkleProof) payable",
  "function activePhase() view returns (uint8)",
  "function phases(uint8) view returns (tuple(uint256 price, uint256 maxPerWallet, uint256 supply, uint256 minted, bool isActive, uint256 startTime, uint256 endTime, bool requiresAllowlist, bytes32 merkleRoot))",
]);

// Rate limiting: max 10 gasless txs per user per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10;

// Type definitions
interface MetaTransaction {
  id: string;
  user_id: string;
  user_address: string;
  action_type: string;
  collection_id: string | null;
  nonce: number;
  typed_data: TypedData;
  signature: string;
  deadline: string;
  status: string;
  tx_hash: string | null;
  error_message: string | null;
  gas_used: number | null;
  gas_paid_by: string;
  created_at: string;
  processed_at: string | null;
}

interface TypedData {
  domain: { name: string; version: string; chainId: number };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metaTransactionId } = await req.json();

    if (!metaTransactionId) {
      return new Response(
        JSON.stringify({ error: "Missing metaTransactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the meta transaction
    const { data: metaTx, error: fetchError } = await supabase
      .from("meta_transactions")
      .select("*")
      .eq("id", metaTransactionId)
      .single();

    if (fetchError || !metaTx) {
      console.error("Error fetching meta transaction:", fetchError);
      return new Response(
        JSON.stringify({ error: "Meta transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transaction = metaTx as MetaTransaction;

    // Check if already processed
    if (transaction.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          error: `Transaction already ${transaction.status}`,
          txHash: transaction.tx_hash 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check deadline
    const deadline = new Date(transaction.deadline).getTime();
    if (Date.now() > deadline) {
      await supabase
        .from("meta_transactions")
        .update({ status: "expired", processed_at: new Date().toISOString() })
        .eq("id", metaTransactionId);

      return new Response(
        JSON.stringify({ error: "Signature expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentCount } = await supabase
      .from("meta_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_address", transaction.user_address)
      .gte("created_at", windowStart);

    if ((recentCount || 0) > MAX_REQUESTS_PER_WINDOW) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the signature
    const typedData = transaction.typed_data;

    // Validate signature
    try {
      const isValid = await verifyTypedData({
        address: transaction.user_address as Hex,
        domain: typedData.domain,
        types: {
          [typedData.primaryType]: typedData.types[typedData.primaryType],
        },
        primaryType: typedData.primaryType,
        message: typedData.message,
        signature: transaction.signature as Hex,
      });

      if (!isValid) {
        throw new Error("Invalid signature");
      }
    } catch (sigError) {
      console.error("Signature verification failed:", sigError);
      await supabase
        .from("meta_transactions")
        .update({ 
          status: "failed", 
          error_message: "Invalid signature",
          processed_at: new Date().toISOString() 
        })
        .eq("id", metaTransactionId);

      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check and increment nonce
    const { data: nonceData } = await supabase
      .from("user_nonces")
      .select("nonce")
      .eq("user_address", transaction.user_address)
      .single();

    const currentNonce = nonceData?.nonce ?? 0;
    const requestNonce = transaction.nonce;

    if (requestNonce !== currentNonce) {
      await supabase
        .from("meta_transactions")
        .update({ 
          status: "failed", 
          error_message: `Invalid nonce. Expected ${currentNonce}, got ${requestNonce}`,
          processed_at: new Date().toISOString() 
        })
        .eq("id", metaTransactionId);

      return new Response(
        JSON.stringify({ error: `Invalid nonce. Expected ${currentNonce}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get relayer private key
    const relayerPrivateKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!relayerPrivateKey) {
      console.error("RELAYER_PRIVATE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Relayer not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine network
    const chainId = typedData.domain.chainId;
    const network = chainId === MONAD_TESTNET.id ? MONAD_TESTNET : MONAD_MAINNET;

    // Create wallet and public clients
    const account = privateKeyToAccount(relayerPrivateKey as Hex);
    
    const publicClient = createPublicClient({
      chain: {
        id: network.id,
        name: network.name,
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: { default: { http: [network.rpcUrl] } },
      },
      transport: http(network.rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: {
        id: network.id,
        name: network.name,
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: { default: { http: [network.rpcUrl] } },
      },
      transport: http(network.rpcUrl),
    });

    // Update status to submitted
    await supabase
      .from("meta_transactions")
      .update({ status: "submitted" })
      .eq("id", metaTransactionId);

    // Build and send the transaction based on action type
    let txHash: Hex;
    const message = typedData.message as {
      collection: string;
      quantity: string;
      maxPrice: string;
    };

    if (transaction.action_type === "mint") {
      // Prepare mint transaction
      const contractAddress = message.collection as Hex;
      const quantity = BigInt(message.quantity);
      const maxPrice = BigInt(message.maxPrice);

      // Check if phase requires allowlist
      const activePhase = await publicClient.readContract({
        address: contractAddress,
        abi: NFT_ABI,
        functionName: "activePhase",
      });

      const phaseInfo = await publicClient.readContract({
        address: contractAddress,
        abi: NFT_ABI,
        functionName: "phases",
        args: [activePhase],
      }) as { requiresAllowlist: boolean; price: bigint };

      const totalValue = phaseInfo.price * quantity;

      // Ensure we don't exceed max price
      if (totalValue > maxPrice) {
        await supabase
          .from("meta_transactions")
          .update({ 
            status: "failed", 
            error_message: "Price increased above max allowed",
            processed_at: new Date().toISOString() 
          })
          .eq("id", metaTransactionId);

        return new Response(
          JSON.stringify({ error: "Price increased above max allowed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Encode mint function data
      let data: Hex;
      if (phaseInfo.requiresAllowlist) {
        // For allowlist mints, we need the merkle proof
        // This is a simplified version - in production you'd need to generate the proof
        data = encodeFunctionData({
          abi: NFT_ABI,
          functionName: "mintWithAllowlist",
          args: [quantity, []], // Empty proof for now - needs implementation
        });
      } else {
        data = encodeFunctionData({
          abi: NFT_ABI,
          functionName: "mintPublic",
          args: [quantity],
        });
      }

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account,
        to: contractAddress,
        data,
        value: totalValue,
      });

      // Send transaction
      txHash = await walletClient.sendTransaction({
        to: contractAddress,
        data,
        value: totalValue,
        gas: gasEstimate + gasEstimate / 10n, // Add 10% buffer
      });

      console.log(`Mint transaction sent: ${txHash}`);
    } else {
      // For other action types (list, offer, etc.) - database-only operations
      // These don't need on-chain transactions, just signature verification
      txHash = `0x${"0".repeat(64)}` as Hex; // Placeholder for off-chain operations
    }

    // Update nonce
    await supabase
      .from("user_nonces")
      .upsert({
        user_address: transaction.user_address,
        nonce: currentNonce + 1,
        updated_at: new Date().toISOString(),
      });

    // Update meta transaction with tx hash
    await supabase
      .from("meta_transactions")
      .update({ 
        tx_hash: txHash,
        processed_at: new Date().toISOString()
      })
      .eq("id", metaTransactionId);

    // Wait for transaction confirmation (async)
    waitForConfirmation(publicClient, txHash, metaTransactionId, supabase).catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash,
        message: "Transaction submitted successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Relayer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to wait for transaction confirmation
async function waitForConfirmation(
  publicClient: ReturnType<typeof createPublicClient>,
  txHash: Hex,
  metaTxId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 120_000, // 2 minutes
    });

    if (receipt.status === "success") {
      await supabase
        .from("meta_transactions")
        .update({ 
          status: "confirmed",
          gas_used: Number(receipt.gasUsed),
          processed_at: new Date().toISOString()
        })
        .eq("id", metaTxId);
      
      console.log(`Transaction confirmed: ${txHash}`);
    } else {
      await supabase
        .from("meta_transactions")
        .update({ 
          status: "failed",
          error_message: "Transaction reverted",
          gas_used: Number(receipt.gasUsed),
          processed_at: new Date().toISOString()
        })
        .eq("id", metaTxId);
      
      console.log(`Transaction reverted: ${txHash}`);
    }
  } catch (error) {
    console.error(`Error waiting for confirmation:`, error);
    await supabase
      .from("meta_transactions")
      .update({ 
        status: "failed",
        error_message: error instanceof Error ? error.message : "Confirmation failed",
        processed_at: new Date().toISOString()
      })
      .eq("id", metaTxId);
  }
}
