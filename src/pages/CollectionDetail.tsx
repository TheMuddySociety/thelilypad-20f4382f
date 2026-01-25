import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { RpcHealthIndicator } from "@/components/RpcHealthIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionEditForm } from "@/components/launchpad/CollectionEditForm";
import { LaunchChecklist } from "@/components/launchpad/LaunchChecklist";
import { RevealManager } from "@/components/launchpad/RevealManager";
import { TransactionHistory } from "@/components/TransactionHistory";
import { NFTGallery } from "@/components/NFTGallery";
import { PhaseConfigManager } from "@/components/launchpad/PhaseConfigManager";
import { ContractDeployModal } from "@/components/launchpad/ContractDeployModal";
import { ContractAllowlistManager } from "@/components/launchpad/ContractAllowlistManager";
import { RevealHistory } from "@/components/RevealHistory";
import { RarityLeaderboard } from "@/components/RarityLeaderboard";
import { CollectionAnalytics } from "@/components/CollectionAnalytics";
import { NFTRevealModal } from "@/components/NFTRevealModal";
import { MintProcessOverlay } from "@/components/MintProcessOverlay";
import { MintCountdown } from "@/components/MintCountdown";
import { RevealCountdown } from "@/components/RevealCountdown";

import { BackToTop } from "@/components/BackToTop";
import { BuybackProgramInfo } from "@/components/BuybackProgramInfo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSEO } from "@/hooks/useSEO";
// EVM hooks removed
import { useSolanaMint } from "@/hooks/useSolanaMint";
import { useSolanaLaunch } from "@/hooks/useSolanaLaunch";
import {
  ArrowLeft,
  ExternalLink,
  Minus,
  Plus,
  Wallet,
  Clock,
  Users,
  Shield,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  FlaskConical,
  Globe,
  Droplets,
  AlertTriangle,
  Fuel,
  Loader2,
  Rocket,
  Pencil,
  Twitter,
  MessageCircle,
  Send,
  Eye,
  EyeOff,
  Info,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol, getExplorerUrl, isSolanaChain, getNetworkDisplayName, isTestnet as isChainTestnet } from "@/lib/chainUtils";
import { getMerkleProof, AllowlistEntry } from "@/utils/merkle";

// Metaplex Imports for Source of Truth
import { publicKey } from "@metaplex-foundation/umi";
import { fetchCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { initializeUmi } from "@/config/solana";

interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  unrevealed_image_url: string | null;
  is_revealed: boolean;
  scheduled_reveal_at: string | null;
  creator_address: string;
  creator_id: string;
  total_supply: number;
  minted: number;
  royalty_percent: number;
  status: string;
  phases: unknown;
  contract_address: string | null;
  created_at: string;
  social_twitter: string | null;
  social_discord: string | null;
  social_website: string | null;
  social_telegram: string | null;
  collection_type?: string;
  blockchain?: 'solana';
  chain?: 'solana';
  solana_standard?: string;
  layers_metadata?: unknown;
  artworks_metadata?: unknown;
}

interface Phase {
  id: string;
  name: string;
  price: string;
  maxPerWallet: number;
  supply: number;
  minted?: number;
  isActive?: boolean;
  startTime: string | null;
  endTime: string | null;
  requiresAllowlist: boolean;
  candyMachineAddress?: string;
}

// Solana chain info object for display
const solanaChainInfo = {
  name: "Solana",
  blockExplorers: { default: { url: "https://explorer.solana.com" } }
};

// Verify if address is in allowlist
const verifyAllowlist = (address: string, allowlistEntries: AllowlistEntry[]): boolean => {
  return allowlistEntries.some(e => e.walletAddress.toLowerCase() === address.toLowerCase());
};

// Check if a phase is currently live based on dates OR manual isActive flag
const isPhaseCurrentlyLive = (phase: Phase | null, collectionStatus?: string, hasContract?: boolean): boolean => {
  if (!phase) return false;

  // If manually marked active, it's live
  if (phase.isActive) return true;

  // For deployed collections with "live" or "upcoming" status, default to allowing minting
  // if no explicit isActive=false and no restrictive dates are set
  const isDeployedAndActive = hasContract && (collectionStatus === 'live' || collectionStatus === 'upcoming');

  // Parse dates
  const now = new Date();
  const startTime = phase.startTime ? new Date(phase.startTime) : null;
  const endTime = phase.endTime ? new Date(phase.endTime) : null;

  // Validate dates - if end is before start, treat as misconfigured and ignore dates
  const datesAreValid = !startTime || !endTime || endTime > startTime;

  if (!datesAreValid) {
    // Dates are misconfigured (end before start), fall back to deployment status
    return isDeployedAndActive;
  }

  // If start time is set and we're past it
  const hasStarted = !startTime || now >= startTime;
  // If end time is set and we haven't passed it
  const hasNotEnded = !endTime || now <= endTime;

  // If dates are properly set, use them
  if (startTime || endTime) {
    return hasStarted && hasNotEnded;
  }

  // No dates set - use deployment status
  return isDeployedAndActive;
};

export default function CollectionDetail() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { network, isConnected, connect, balance, address } = useWallet();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mintAmount, setMintAmount] = useState(1);
  const [activePhase, setActivePhase] = useState<Phase | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAllowlistModalOpen, setIsAllowlistModalOpen] = useState(false);
  const [allowlistEntries, setAllowlistEntries] = useState<AllowlistEntry[]>([]);

  // Load allowlist entries for current phase
  useEffect(() => {
    const loadAllowlist = async () => {
      if (!collectionId || !activePhase?.requiresAllowlist) {
        setAllowlistEntries([]);
        return;
      }

      try {
        const { data } = await supabase
          .from("allowlist_entries")
          .select("wallet_address, max_mint")
          .eq("collection_id", collectionId)
          .eq("phase_name", activePhase.id);

        if (data) {
          setAllowlistEntries(data.map(e => ({
            walletAddress: e.wallet_address,
            maxMint: e.max_mint || 1
          })));
        }
      } catch (err) {
        console.error("Error loading allowlist:", err);
      }
    };

    loadAllowlist();
  }, [collectionId, activePhase]);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealedNfts, setRevealedNfts] = useState<Array<{
    tokenId: number;
    name: string;
    image: string | null;
    attributes: Array<{ trait_type: string; value: string; rarity?: number }>;
  }>>([]);
  const [revealTxHash, setRevealTxHash] = useState<string>("");

  // Deploy modal state
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  // Minting state (for Solana)
  const [isMinting, setIsMinting] = useState(false);
  const [mintStep, setMintStep] = useState<'idle' | 'waiting_wallet' | 'submitting' | 'processing' | 'syncing' | 'success' | 'error'>('idle');
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const resetMintState = () => {
    setIsMinting(false);
    setMintStep('idle');
    setMintTxHash(null);
    setMintError(null);
  };

  const solanaMint = useSolanaMint();

  const performSolanaMint = async (
    cmAddress: string | undefined,
    standard: string,
    amount: number,
    phaseId: string,
    mintArgs?: any,
    isForce: boolean = false
  ) => {
    let lastHash = null;

    for (let i = 0; i < amount; i++) {
      // ... (loading logic)
      if (amount > 1) {
        toast.loading(`Minting NFT ${i + 1} of ${amount}...`, { id: 'sol-mint-progress' });
      } else {
        toast.loading(isForce ? "🚀 Force Minting..." : "Minting NFT...", { id: 'sol-mint-progress' });
      }

      const result = cmAddress
        ? await solanaMint.mintFromCandyMachine(
          cmAddress,
          collection!.contract_address!,
          { phaseId, price: mintArgs?.price || 0, collectionId: collection!.id }
        )
        : await solanaMint.mintNFT(
          collection!.contract_address!,
          {
            name: `${collection!.name} #${collection!.minted + i + 1}${isForce ? ' (FORCE)' : ''}`,
            uri: collection!.image_url || '',
          }
        );

      lastHash = result.signature;
      setMintTxHash(lastHash);
    }

    // Force a supply poll after minting to update UI immediately
    if (cmAddress) {
      // We'll let the polling interval catch it or manually trigger refresh
      // But waiting a sec is good
      await new Promise(r => setTimeout(r, 1000));
    }

    return lastHash;
  };

  const [isInitializing, setIsInitializing] = useState(false);

  // Determine chain from collection data
  const collectionChain = collection?.chain || collection?.blockchain || 'solana';
  const isSolana = true;
  const currency = getCurrencySymbol(collectionChain);
  const collectionNetwork = getNetworkDisplayName(collectionChain);
  const isCollectionTestnet = isChainTestnet(collectionChain);
  const collectionExplorerUrl = getExplorerUrl(collectionChain, isCollectionTestnet ? 'testnet' : 'mainnet');

  const isTestnet = network === "testnet";
  const isWrongNetwork = false; // Always correct for now, or handled by SOL adapter
  const isCreator = currentUserId && collection?.creator_id === currentUserId;

  useSEO({
    title: collection?.name ? `${collection.name} | The Lily Pad` : "NFT Collection | The Lily Pad",
    description: collection?.description || "Mint NFTs from this collection on The Lily Pad. View phases, pricing, and mint progress."
  });

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch collection from database
  useEffect(() => {
    if (collectionId) {
      fetchCollection();
    }
  }, [collectionId]);

  const fetchCollection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching collection:", error);
        toast.error("Failed to load collection");
      } else if (data) {
        setCollection(data as unknown as Collection);
        // Set active phase from phases data (prefer the one marked active)
        const phases = data.phases as unknown as Phase[] | null;
        if (phases && Array.isArray(phases) && phases.length > 0) {
          const active = phases.find((p) => p.isActive);
          const publicPhase = phases.find((p) => p.id === "public");
          setActivePhase(active || publicPhase || phases[0]);
        }
      } else {
        toast.error("Collection not found");
        navigate("/launchpad");
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhases = (): Phase[] => {
    if (!collection?.phases) return [];
    try {
      return collection.phases as unknown as Phase[];
    } catch {
      return [];
    }
  };

  // Note: allowlistEntries is already loaded in the earlier useEffect (lines 174-200)

  // Calculate if user has enough balance
  const totalCost = activePhase ? parseFloat(activePhase.price) * mintAmount : 0;
  const userBalance = balance ? parseFloat(balance) : 0;



  const totalWithGas = totalCost; // No gas estimation needed for SOL UI yet
  const hasInsufficientBalance = isConnected && totalWithGas > userBalance;

  // Live supply from collection
  const liveSupply = collection?.minted || 0;
  const totalSupply = collection?.total_supply || 0;
  const [isLivePolling, setIsLivePolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Real-time supply polling - SOURCE OF TRUTH: ON-CHAIN
  useEffect(() => {
    if (!collection || !collectionId) return;

    // Use Contract as Source of Truth if deployed
    // If we have a contract_address (Candy Machine), we prefer fetching from chain
    const shouldUseOnChain = collection.contract_address && isSolana;

    // Only poll if not sold out (or simple interval)
    setIsLivePolling(shouldUseOnChain || liveSupply < totalSupply);

    // Initial Umi instance for polling
    const umi = initializeUmi(network);

    const pollSupply = async () => {
      try {
        if (shouldUseOnChain) {
          // POLL FROM CHAIN (Candy Machine)
          // Note: collection.contract_address is the CM address in our current flow for CM-based mints
          // Wait, logic check: in useSolanaLaunch, we return 'address' as CM address map to 'contract_address' in DB
          // So we can blindly fetch Account at contract_address
          try {
            const candyMachine = await fetchCandyMachine(umi, publicKey(collection.contract_address!));
            // Core Candy Machine uses 'data' sub-object for some fields
            const itemsAvailable = Number((candyMachine as any).data?.itemsAvailable ?? (candyMachine as any).itemsAvailable ?? 0);
            const itemsRedeemed = Number(candyMachine.itemsRedeemed ?? 0);

            // Update Local State if changed
            if (collection.minted !== itemsRedeemed || collection.total_supply !== itemsAvailable) {
              setCollection(prev => prev ? {
                ...prev,
                minted: itemsRedeemed,
                total_supply: itemsAvailable
              } : prev);
              setLastUpdated(new Date());
            }
          } catch (chainErr) {
            console.error("Failed to fetch on-chain CM:", chainErr);
            // Fallback to Supabase if chain fails? Or just log.
          }
        } else {
          // POLL FROM DB (Legacy/Fallback)
          const { data, error } = await supabase
            .from("collections")
            .select("minted")
            .eq("id", collectionId)
            .maybeSingle();

          if (!error && data && data.minted !== collection.minted) {
            setCollection(prev => prev ? { ...prev, minted: data.minted } : prev);
            setLastUpdated(new Date());
          }
        }
      } catch (err) {
        console.error("Error polling supply:", err);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollSupply, 5000);

    // Initial poll
    pollSupply();

    return () => {
      clearInterval(interval);
      setIsLivePolling(false);
    };
  }, [collectionId, collection?.contract_address, isSolana, network]); // Don't depend on liveSupply/totalSupply to avoid re-creating interval CONSTANTLY

  // Subscribe to real-time updates for the collection (DB fallback/sync)
  useEffect(() => {
    if (!collectionId) return;

    const channel = supabase
      .channel(`collection-${collectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections',
          filter: `id=eq.${collectionId}`
        },
        (payload) => {
          // Only update from DB if we are NOT using on-chain source of truth
          // Or if the update provides OTHER fields.
          // For now, let's allow it but On-Chain poll will override it quickly if active.
          if (payload.new && typeof payload.new.minted === 'number') {
            // Optional: Check if we prefer chain data
            if (!collection?.contract_address) {
              setCollection(prev => prev ? { ...prev, minted: payload.new.minted } : prev);
              setLastUpdated(new Date());
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collectionId, collection?.contract_address]);

  const phases = getPhases();
  const mintProgress = totalSupply > 0 ? (liveSupply / totalSupply) * 100 : 0;

  const handleRefreshSupply = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("minted")
        .eq("id", collectionId)
        .maybeSingle();

      if (!error && data) {
        setCollection(prev => prev ? { ...prev, minted: data.minted } : prev);
        setLastUpdated(new Date());
        toast.success("Supply updated");
      }
    } catch (err) {
      toast.error("Failed to refresh supply");
    }
    setIsRefreshing(false);
  };

  const handleSwitchNetwork = async () => {
    toast.info("Please switch to Solana in your wallet");
  };

  // Initialize contract phase (owner only)
  // Initialize contract phase (owner only) - Placeholder or removed for Solana
  const handleInitializeContract = async () => {
    // Solana CM initialization is handled during deployment
  };

  // Calculate remaining supply
  const remainingSupply = totalSupply - liveSupply;
  const exceedsSupply = mintAmount > remainingSupply;
  const isSoldOut = remainingSupply <= 0;

  const handleMint = async () => {
    // Check if wallet is connected
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to mint",
        action: {
          label: "Connect",
          onClick: () => connect(),
        },
      });
      return;
    }

    // Check if on wrong network and prompt to switch
    if (isWrongNetwork) {
      toast.error(`Wrong network detected`, {
        description: `Please switch to ${collectionNetwork} to mint`,
        action: {
          label: "Switch Network",
          onClick: handleSwitchNetwork,
        },
      });
      return;
    }

    // Check if collection is sold out
    if (isSoldOut) {
      toast.error("Sold Out", {
        description: "This collection is completely sold out",
      });
      return;
    }

    // Check if mint amount exceeds remaining supply
    if (exceedsSupply) {
      toast.error("Exceeds available supply", {
        description: `Only ${remainingSupply} NFT${remainingSupply === 1 ? '' : 's'} remaining. Please reduce your mint amount.`,
      });
      return;
    }

    // Check if user has sufficient balance (including gas)
    if (hasInsufficientBalance) {
      toast.error("Insufficient balance", {
        description: `You need ${(totalWithGas - userBalance).toFixed(4)} more ${currency} (including gas) to mint`,
      });
      return;
    }

    // Check if contract is deployed
    if (!collection?.contract_address) {
      toast.error("Contract not deployed", {
        description: "This collection's smart contract has not been deployed yet",
      });
      return;
    }

    if (!activePhase) {
      toast.error("No mint phase available");
      return;
    }

    // Prevent sending transactions when the phase is not active (common cause of "mint failed")
    if (!isPhaseCurrentlyLive(activePhase, collection?.status, !!collection?.contract_address)) {
      toast.error("Mint is not active", {
        description: "This phase is currently inactive. Wait for it to start, or ask the creator to activate the mint phase.",
      });
      return;
    }

    setIsMinting(true);
    setMintStep('waiting_wallet');

    let txHash: string | null = null;

    try {
      if (isSolana) {
        // Prepare mint args (guards)
        const mintArgs: any = {};

        // 1. Allowlist Guard
        if (activePhase.requiresAllowlist) {
          // Find user in allowlist
          const allowlistEntry = allowlistEntries.find(
            e => e.walletAddress.toLowerCase() === address.toLowerCase()
          );

          if (!allowlistEntry) {
            toast.error("Not in Allowlist", {
              description: "Your wallet is not authorized for this phase."
            });
            setIsMinting(false);
            return;
          }

          // Generate Proof
          // Note: We need to pass the FULL list to generate the tree, then get the proof for the user
          try {
            const { proof } = getMerkleProof(allowlistEntries, address);
            mintArgs.allowList = { proof };
          } catch (proofErr) {
            console.error("Proof generation failed:", proofErr);
            toast.error("Failed to generate allowlist proof");
            setIsMinting(false);
            return;
          }
        }

        // 2. Mint Limit Guard (if configured)
        // Note: The ID must match what was used in creation (currently hardcoded to 1 in useSolanaLaunch)
        if (activePhase.maxPerWallet) {
          mintArgs.mintLimit = { id: 1 };
        }

        // Fallback: If phase has no CM address, try using the collection contract address
        // (This handles cases where CM address was saved in contract_address field)
        const targetCmAddress = activePhase.candyMachineAddress || collection.contract_address;

        if (!targetCmAddress) {
          toast.error("No Candy Machine address found");
          setIsMinting(false);
          return;
        }

        txHash = await performSolanaMint(
          targetCmAddress,
          collection.solana_standard || 'core',
          mintAmount,
          activePhase.id,
          mintArgs
        );
        toast.success(`Successfully minted ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}!`, { id: 'sol-mint-progress' });
      } else {
        toast.error("EVM minting not supported in this view");
        setIsMinting(false);
        return;
      }
    } catch (err) {
      console.error("Mint error:", err);
      setIsMinting(false);
      setMintStep('error');
      return;
    }

    if (txHash) {
      // Generate mock revealed NFTs with random attributes for the reveal animation
      const mockAttributes = generateRandomAttributes(mintAmount, collection.minted);
      setRevealedNfts(mockAttributes);
      setRevealTxHash(txHash);
      setShowRevealModal(true);

      // Refresh collection data
      fetchCollection();
    }
  };

  // Test mint with simplified settings - forces 1 NFT, no custom gas overrides
  const handleTestMint = async () => {
    if (!isConnected) {
      toast.error("Wallet not connected");
      return;
    }

    if (!collection?.contract_address) {
      toast.error("Contract not deployed");
      return;
    }

    if (!activePhase) {
      toast.error("No mint phase available");
      return;
    }

    if (!activePhase.isActive) {
      toast.error("Mint phase not active");
      return;
    }

    toast.info("Test Mint Started", {
      description: "Minting 1 NFT with default gas settings...",
    });

    let txHash: string | null = null;

    try {
      txHash = await performSolanaMint(
        activePhase.candyMachineAddress,
        collection.solana_standard || 'core',
        1,
        activePhase.id,
        undefined
      );

      if (txHash) {
        const mockAttributes = generateRandomAttributes(1, collection.minted);
        setRevealedNfts(mockAttributes);
        setRevealTxHash(txHash);
        setShowRevealModal(true);
        fetchCollection();
      }
    } catch (err) {
      console.error("Test mint failed:", err);
      toast.error("Test mint failed");
    }
  };

  // FORCE MINT - bypasses ALL phase checks for urgent debugging
  const handleForceMint = async () => {
    if (!isConnected) {
      toast.error("Wallet not connected");
      return;
    }

    if (!collection?.contract_address) {
      toast.error("Contract not deployed");
      return;
    }

    // Get price from any phase, default to "0" (free mint) if none
    const phases = getPhases();
    const price = phases[0]?.price || "0";

    toast.info("🚀 Force Mint Started", {
      description: `Minting 1 NFT at ${price} ${currency} - bypassing phase checks...`,
    });

    try {
      const txHash = await performSolanaMint(
        phases[0]?.candyMachineAddress,
        collection.solana_standard || 'core',
        1,
        phases[0]?.id || 'public',
        undefined,
        true
      );

      if (txHash) {
        toast.success("Force Mint Submitted!", {
          description: `TX: ${txHash.slice(0, 10)}...`,
          id: 'sol-mint-progress'
        });
        const mockAttributes = generateRandomAttributes(1, collection.minted);
        setRevealedNfts(mockAttributes);
        setRevealTxHash(txHash);
        setShowRevealModal(true);
        fetchCollection();
      }
    } catch (err: any) {
      console.error("Force mint failed:", err);
      toast.error("Force Mint Failed", {
        description: err?.message || "Check console for details",
        id: 'sol-mint-progress'
      });
    }
  };

  // Generate random attributes for reveal animation (simulated - in production these would come from blockchain)
  const generateRandomAttributes = (quantity: number, currentMinted: number) => {
    const traitTypes = [
      { name: "Background", values: ["Cosmic", "Ocean", "Forest", "Desert", "Arctic", "Volcanic"], rarities: [5, 15, 25, 25, 20, 10] },
      { name: "Body", values: ["Rare Frog", "Common Frog", "Golden Frog", "Crystal Frog", "Shadow Frog"], rarities: [2, 60, 5, 3, 30] },
      { name: "Eyes", values: ["Laser", "Hypnotic", "Normal", "Sleepy", "Angry", "Happy"], rarities: [1, 5, 40, 20, 15, 19] },
      { name: "Accessory", values: ["Crown", "Top Hat", "None", "Monocle", "Headphones"], rarities: [2, 8, 50, 15, 25] },
      { name: "Mouth", values: ["Diamond Grill", "Smile", "Tongue Out", "Serious", "Singing"], rarities: [1, 35, 25, 25, 14] },
    ];

    return Array.from({ length: quantity }, (_, i) => {
      const tokenId = currentMinted + i + 1;
      const attributes = traitTypes.map(traitType => {
        // Weighted random selection
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedIndex = 0;
        for (let j = 0; j < traitType.rarities.length; j++) {
          cumulative += traitType.rarities[j];
          if (random <= cumulative) {
            selectedIndex = j;
            break;
          }
        }
        return {
          trait_type: traitType.name,
          value: traitType.values[selectedIndex],
          rarity: traitType.rarities[selectedIndex]
        };
      });

      return {
        tokenId,
        name: `${collection.name} #${tokenId}`,
        image: collection.image_url,
        attributes
      };
    });
  };

  const handleCopyAddress = () => {
    if (!collection?.contract_address) return;
    navigator.clipboard.writeText(collection.contract_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Contract address copied!");
  };

  const totalCostDisplay = totalCost.toFixed(2);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Skeleton className="h-64 w-full rounded-xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  // Not found state
  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <Rocket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Collection Not Found</h1>
          <p className="text-muted-foreground mb-4">This collection doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/launchpad")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Launchpad
          </Button>
        </main>
      </div>
    );
  }

  // Edit mode
  if (isEditMode && collection) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditMode(false)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collection
          </Button>
          <CollectionEditForm
            collection={collection}
            onSave={() => {
              setIsEditMode(false);
              fetchCollection();
            }}
            onCancel={() => setIsEditMode(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Banner */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 to-accent/20">
        {(collection.banner_url || collection.image_url) && (
          <img
            src={collection.banner_url || collection.image_url || ''}
            alt={collection.name}
            className="w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <main className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview Mode - Viewing as a collector would see this page</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(false)}
              className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Exit Preview
            </Button>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/marketplace" className="hover:text-primary transition-colors">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{collection.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Edit button row */}
        <div className="flex items-center justify-end mb-4">
          {isCreator && !isPreviewMode && (
            <div className="flex items-center gap-2">
              {!collection.contract_address && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPreviewMode(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Collection
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsDeployModalOpen(true)}
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy Contract
                  </Button>
                </>
              )}
              {collection.contract_address && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAllowlistModalOpen(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Allowlist
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Collection Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Collection Header */}
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-xl bg-muted border-4 border-background shadow-lg overflow-hidden flex items-center justify-center">
                {collection.image_url ? (
                  <img
                    src={collection.image_url}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Rocket className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold">{collection.name}</h1>
                  <Badge
                    variant="outline"
                    className={
                      collection.status === "live"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : collection.status === "upcoming"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-muted text-muted-foreground border-border"
                    }
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={isCollectionTestnet
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "bg-primary/10 text-primary border-primary/30"
                    }
                  >
                    {isCollectionTestnet ? (
                      <FlaskConical className="w-3 h-3 mr-1" />
                    ) : (
                      <Globe className="w-3 h-3 mr-1" />
                    )}
                    {collectionNetwork}
                  </Badge>

                </div>
                <p className="text-muted-foreground mb-3">{collection.symbol}</p>
                {collection.contract_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Contract:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {collection.contract_address.slice(0, 10)}...{collection.contract_address.slice(-8)}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAddress}>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <a
                      href={`${collectionExplorerUrl}/address/${collection.contract_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Launch Checklist for creators with undeployed collections (hidden in preview mode) */}
            {isCreator && !collection.contract_address && !isPreviewMode && (
              <LaunchChecklist
                collection={collection}
                onEditClick={() => setIsEditMode(true)}
                onDeployClick={() => setIsDeployModalOpen(true)}
                onAllowlistClick={() => setIsAllowlistModalOpen(true)}
              />
            )}

            {/* Reveal Manager for creators with deployed collections (hidden in preview mode) */}
            {isCreator && collection.contract_address && !isPreviewMode && collection.minted > 0 && (
              <RevealManager
                collectionId={collection.id}
                collectionName={collection.name}
                unrevealedImageUrl={collection.unrevealed_image_url}
                isCollectionRevealed={collection.is_revealed}
                scheduledRevealAt={collection.scheduled_reveal_at}
                onRevealComplete={fetchCollection}
              />
            )}

            {/* Collection Analytics */}
            <CollectionAnalytics
              collectionId={collection.id}
              totalSupply={collection.total_supply}
              minted={collection.minted}
            />

            {/* Buyback Program Info */}
            <BuybackProgramInfo collectionId={collection.id} />

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{collection.description || "No description provided."}</p>

                {/* Social Links */}
                {(collection.social_twitter || collection.social_discord || collection.social_website || collection.social_telegram) && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex flex-wrap gap-2">
                      {collection.social_twitter && (
                        <a
                          href={collection.social_twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-sm transition-colors"
                        >
                          <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                          Twitter
                        </a>
                      )}
                      {collection.social_discord && (
                        <a
                          href={collection.social_discord}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-sm transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 text-[#5865F2]" />
                          Discord
                        </a>
                      )}
                      {collection.social_website && (
                        <a
                          href={collection.social_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-sm transition-colors"
                        >
                          <Globe className="w-4 h-4 text-emerald-500" />
                          Website
                        </a>
                      )}
                      {collection.social_telegram && (
                        <a
                          href={collection.social_telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-sm transition-colors"
                        >
                          <Send className="w-4 h-4 text-[#0088cc]" />
                          Telegram
                        </a>
                      )}
                    </div>
                  </>
                )}

                <Separator className="my-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Creator</span>
                    <p className="font-medium truncate">{collection.creator_address.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Supply</span>
                    <p className="font-medium">{collection.total_supply.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Royalty</span>
                    <p className="font-medium">{collection.royalty_percent}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Network</span>
                    <p className="font-medium flex items-center gap-1">
                      {isCollectionTestnet ? (
                        <FlaskConical className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Globe className="w-3 h-3 text-primary" />
                      )}
                      {collectionNetwork}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mint Phases */}
            <Card>
              <CardHeader>
                <CardTitle>Mint Phases</CardTitle>
                <CardDescription>Track the progress of each mint phase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {phases.length > 0 ? phases.map((phase) => {
                  const phaseMinted = phase.minted || 0;
                  const phaseProgress = phase.supply > 0 ? (phaseMinted / phase.supply) * 100 : 0;
                  const PhaseIcon = phase.requiresAllowlist
                    ? (phase.id === "team" ? Shield : Users)
                    : Sparkles;
                  const isActive = activePhase?.id === phase.id;

                  return (
                    <div
                      key={phase.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30 hover:border-primary/50"
                        }`}
                      onClick={() => setActivePhase(phase)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <PhaseIcon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium">{phase.name}</span>
                          {isActive && (
                            <Badge variant="default" className="text-xs">Selected</Badge>
                          )}
                        </div>
                        <span className="font-semibold">
                          {phase.price === "0" ? "Free" : `${phase.price} ${currency}`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Max {phase.maxPerWallet} per wallet • {phase.supply.toLocaleString()} supply</span>
                        </div>
                        <Progress value={phaseProgress} className="h-2" />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-muted-foreground text-center py-4">No mint phases configured</p>
                )}
              </CardContent>
            </Card>

            {/* NFT Gallery */}
            <NFTGallery
              collectionId={collection.id}
              collectionName={collection.name}
              collectionImage={collection.image_url}
              unrevealedImage={collection.unrevealed_image_url}
              contractAddress={collection.contract_address}
            />

            {/* Reveal History */}
            <RevealHistory collectionId={collection.id} collectionName={collection.name} />

            {/* Rarity Leaderboard */}
            <RarityLeaderboard collectionId={collection.id} collectionName={collection.name} />
          </div>

          {/* Right Column - Mint Card */}
          <div className="space-y-6">
            {/* Phase Configuration Card - For creators after deployment */}
            {isCreator && collection.contract_address && (
              <PhaseConfigManager
                contractAddress={collection.contract_address}
                phases={phases}
                chain={collectionChain}
                onConfigured={() => {
                  fetchCollection();
                }}
              />
            )}

            {/* Live Supply Card */}
            <Card className={`border-primary/50 ${isLivePolling ? 'ring-1 ring-primary/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Live Supply</CardTitle>
                    {isLivePolling && (
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-green-500 font-medium">Live</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefreshSupply}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary transition-all duration-300">
                    {Math.min(liveSupply, totalSupply).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">
                    of {totalSupply.toLocaleString()} minted
                  </div>
                </div>
                <Progress value={totalSupply > 0 ? Math.min((liveSupply / totalSupply) * 100, 100) : 0} className="h-3" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {isLivePolling ? "Auto-updating every 5s" : "Updates paused"}
                  </p>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      Last: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mint Card */}
            <Card>
              <CardHeader>
                <CardTitle>Mint NFT</CardTitle>
                <CardDescription>
                  Currently in: <span className="text-foreground font-medium">{activePhase?.name || "No phase"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Phase Tabs */}
                {phases.length > 1 && (
                  <Tabs value={activePhase?.id || ""} onValueChange={(v) => {
                    const phase = phases.find(p => p.id === v);
                    if (phase) setActivePhase(phase);
                  }}>
                    <TabsList className="grid grid-cols-2">
                      {phases.slice(-2).map(phase => (
                        <TabsTrigger key={phase.id} value={phase.id}>
                          {phase.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}

                {/* Phase Countdown Timer */}
                {activePhase && (
                  <MintCountdown
                    startTime={activePhase.startTime}
                    endTime={activePhase.endTime}
                    phaseName={activePhase.name}
                    isSoldOut={isSoldOut || (activePhase.minted || 0) >= (activePhase.supply || 0)}
                  />
                )}

                {/* Reveal Countdown Timer */}
                {collection.scheduled_reveal_at && !collection.is_revealed && (
                  <RevealCountdown
                    scheduledRevealAt={collection.scheduled_reveal_at}
                    isRevealed={collection.is_revealed}
                  />
                )}

                {isConnected && !isWrongNetwork && (
                  <div className={`p-4 rounded-lg border ${hasInsufficientBalance ? 'bg-destructive/5 border-destructive/30' : 'bg-primary/5 border-primary/30'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${hasInsufficientBalance ? 'text-destructive' : 'text-primary'}`} />
                        <span className="text-sm font-medium">Your Balance</span>
                      </div>
                      <span className={`font-bold ${hasInsufficientBalance ? 'text-destructive' : 'text-primary'}`}>
                        {userBalance.toFixed(4)} {currency}
                      </span>
                    </div>
                    {hasInsufficientBalance && (
                      <div className="mt-2 flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">
                          Insufficient balance. Need {(totalWithGas - userBalance).toFixed(4)} more {currency} (incl. gas)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Price Info */}
                {activePhase && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price per NFT</span>
                      <span className="font-medium">
                        {activePhase.price === "0" ? "Free" : `${activePhase.price} ${currency}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max per wallet</span>
                      <span className="font-medium">{activePhase.maxPerWallet}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-medium">
                        {((activePhase.supply || 0) - (activePhase.minted || 0)).toLocaleString()}
                      </span>
                    </div>
                    {/* Allowlist Status */}
                    {activePhase.requiresAllowlist && (
                      <div className="flex justify-between text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Allowlist Status
                        </span>
                        {address && verifyAllowlist(address, allowlistEntries) ? (
                          <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                            <Check className="w-3 h-3 mr-1" />
                            Eligible
                          </Badge>
                        ) : address ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                            Not Eligible
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Connect wallet</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mint Error */}
                {mintError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">{mintError}</span>
                    </div>
                  </div>
                )}

                {/* Amount Selector */}
                {activePhase && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Amount</label>

                    {/* Quick Select Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 5, 10].filter(n => n <= (activePhase.maxPerWallet || 10)).map((amount) => (
                        <Button
                          key={amount}
                          variant={mintAmount === amount ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMintAmount(amount)}
                          className="flex-1 min-w-[60px]"
                        >
                          {amount}
                        </Button>
                      ))}
                      {(activePhase.maxPerWallet || 10) > 10 && (
                        <Button
                          variant={mintAmount === (activePhase.maxPerWallet || 10) ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMintAmount(activePhase.maxPerWallet || 10)}
                          className="flex-1 min-w-[60px]"
                        >
                          Max ({activePhase.maxPerWallet})
                        </Button>
                      )}
                    </div>

                    {/* Custom Amount Input */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMintAmount(Math.max(1, mintAmount - 1))}
                        disabled={mintAmount <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(Math.min(activePhase.maxPerWallet || 10, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="text-center flex-1"
                        min={1}
                        max={activePhase.maxPerWallet || 10}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMintAmount(Math.min(activePhase.maxPerWallet || 10, mintAmount + 1))}
                        disabled={mintAmount >= (activePhase.maxPerWallet || 10)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Supply Warning */}
                    {isSoldOut && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-destructive font-medium">
                          Sold out! No more NFTs available to mint.
                        </span>
                      </div>
                    )}

                    {!isSoldOut && exceedsSupply && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/30">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-destructive">
                          Only {remainingSupply} NFT{remainingSupply === 1 ? '' : 's'} remaining. Please reduce amount.
                        </span>
                      </div>
                    )}

                    {!isSoldOut && !exceedsSupply && remainingSupply <= 10 && remainingSupply > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Almost sold out! Only {remainingSupply} NFT{remainingSupply === 1 ? '' : 's'} left.
                        </span>
                      </div>
                    )}

                    {/* Bulk Mint Savings Indicator */}
                    {mintAmount > 1 && !exceedsSupply && !isSoldOut && (
                      <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg border border-accent/30">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span className="text-xs text-accent">
                          Bulk mint! {mintAmount} NFTs in a single transaction saves gas.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Network Status (Solana) */}
                {isConnected && !isWrongNetwork && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Network Status</span>
                      <RpcHealthIndicator />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span>Connected to Solana {network === 'mainnet' ? 'Mainnet' : 'Devnet'}</span>
                    </div>
                  </div>
                )}

                {/* Total Cost */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Mint Cost</span>
                    <span className="font-medium">
                      {totalCostDisplay === "0.00" ? "Free" : `${totalCostDisplay} ${currency}`}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {totalWithGas === 0 ? "Free" : `~${totalWithGas.toFixed(4)} ${currency}`}
                    </span>
                  </div>

                  {/* Fee Disclaimer */}
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/50">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      2.5% platform fee applies to sellers.{' '}
                      <Link to="/fees" className="text-primary hover:underline">
                        View all fees
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Wrong Network Warning */}
                {isWrongNetwork && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Wrong Network</span>
                    </div>
                    <p className="text-xs text-destructive/80 mb-3">
                      You're connected to a different network. Switch to {getNetworkDisplayName(collectionChain)} to mint.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/20"
                      onClick={handleSwitchNetwork}
                      disabled={isSwitchingNetwork}
                    >
                      {isSwitchingNetwork ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                          Switching...
                        </>
                      ) : (
                        <>
                          Switch to {getNetworkDisplayName(collectionChain)}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Not Connected Warning */}
                {!isConnected && (
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm font-medium">Wallet Not Connected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect your wallet to mint NFTs from this collection.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => connect()}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                )}

                {/* No Contract Warning */}
                {!collection?.contract_address && isConnected && !isWrongNetwork && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <Rocket className="w-4 h-4" />
                      <span className="text-sm font-medium">Contract Not Deployed</span>
                    </div>
                    <p className="text-xs text-amber-500/80">
                      The smart contract for this collection has not been deployed yet. Minting will be available once the creator deploys the contract.
                    </p>
                  </div>
                )}

                {/* Mint Button */}
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleMint}
                  disabled={
                    isMinting ||
                    isSwitchingNetwork ||
                    !activePhase ||
                    !isPhaseCurrentlyLive(activePhase, collection?.status, !!collection?.contract_address) ||
                    isSoldOut ||
                    exceedsSupply ||
                    (activePhase.minted || 0) >= (activePhase.supply || 0) ||
                    !isConnected ||
                    isWrongNetwork ||
                    hasInsufficientBalance ||
                    !collection?.contract_address ||
                    (activePhase?.requiresAllowlist && address && !verifyAllowlist(address, allowlistEntries))
                  }
                >
                  {isMinting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Minting...
                    </>
                  ) : !collection?.contract_address ? (
                    <>
                      <Rocket className="w-4 h-4" />
                      Contract Not Deployed
                    </>
                  ) : !activePhase ? (
                    "No Phase Available"
                  ) : !isPhaseCurrentlyLive(activePhase, collection?.status, !!collection?.contract_address) ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Mint Not Active
                    </>
                  ) : isSoldOut || (activePhase.minted || 0) >= (activePhase.supply || 0) ? (
                    "Sold Out"
                  ) : exceedsSupply ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Only {remainingSupply} Left
                    </>
                  ) : isWrongNetwork ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Wrong Network
                    </>
                  ) : !isConnected ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      Connect to Mint
                    </>
                  ) : hasInsufficientBalance ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Insufficient Balance
                    </>
                  ) : activePhase?.requiresAllowlist && address && !verifyAllowlist(address, allowlistEntries) ? (
                    <>
                      <Shield className="w-4 h-4" />
                      Not on Allowlist
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Mint {mintAmount} NFT{mintAmount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {activePhase?.requiresAllowlist && (
                  <p className="text-xs text-center text-muted-foreground">
                    This phase requires allowlist verification
                  </p>
                )}




                {isTestnet && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <p className="text-sm font-medium text-amber-500 mb-1">Solana Devnet Mode</p>
                    <p className="text-xs text-amber-500/80">
                      Using Devnet for testing. Ensure your wallet is set to Devnet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            {currentUserId && (
              <TransactionHistory userId={currentUserId} collectionId={collection.id} limit={5} />
            )}
          </div>
        </div>
      </main>

      {/* Deploy Contract Modal */}
      {collection && (
        <ContractDeployModal
          open={isDeployModalOpen}
          onOpenChange={setIsDeployModalOpen}
          collection={collection}
          onDeploySuccess={async (contractAddress) => {
            // Update collection with contract address
            await supabase
              .from("collections")
              .update({ contract_address: contractAddress, status: "live" })
              .eq("id", collection.id);
            fetchCollection();
            setIsDeployModalOpen(false);
          }}
        />
      )}

      {/* Allowlist Manager Modal */}
      {collection && currentUserId && (
        <ContractAllowlistManager
          open={isAllowlistModalOpen}
          onOpenChange={setIsAllowlistModalOpen}
          collectionId={collection.id}
          contractAddress={collection.contract_address}
          phases={phases}
          creatorId={currentUserId}
        />
      )}

      {/* NFT Reveal Modal */}
      <NFTRevealModal
        open={showRevealModal}
        onOpenChange={setShowRevealModal}
        nfts={revealedNfts}
        collectionName={collection?.name || ""}
        txHash={revealTxHash}
        explorerUrl={getExplorerUrl(collectionChain)}
      />

      {/* Mint Process Overlay */}
      <MintProcessOverlay
        isOpen={isMinting}
        step={mintStep}
        txHash={mintTxHash}
        error={mintError}
        onClose={resetMintState}
        onViewNFTs={() => {
          resetMintState();
          // Scroll to reveal history or gallery
          document.getElementById('reveal-history')?.scrollIntoView({ behavior: 'smooth' });
        }}
        collectionName={collection.name}
      />

      <BackToTop />
    </div>
  );
}