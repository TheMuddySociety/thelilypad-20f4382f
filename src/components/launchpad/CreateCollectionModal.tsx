import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tags,
  Image as ImageIcon,
  Rocket,
  AlertTriangle,
  FolderOpen,
  Layers,
  Wand2,
  Settings,
  AlertCircle,
  Hash,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { FolderUploader } from "./FolderUploader";
import { GuardConfigurator } from "./GuardConfigurator";
import { LaunchpadPreview } from "./LaunchpadPreview";
import { ModeSelector } from "./ModeSelector";
import { LayerManager, Layer } from "./LayerManager";
import { TraitRarityEditor } from "./TraitRarityEditor";
import { ArtworkUploader, type ArtworkItem } from "./ArtworkUploader";
import { useWallet } from "@/providers/WalletProvider";
import { useSolanaLaunch, LaunchpadPhase } from "@/hooks/useSolanaLaunch";

import { useXRPLLaunch } from "@/hooks/useXRPLLaunch";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { validateAssets, AssetFile } from "@/utils/assetValidator";
import { generateAssets, GeneratedAsset } from "@/lib/assetGenerator";
import { SupportedChain, CHAINS } from "@/config/chains";
import { ChainIcon } from "./ChainSelector";
import { getCollectionStorageInfo, getChainRootUri } from "@/lib/payloadMapper";
import { useChain } from "@/providers/ChainProvider";
import { useChainTheme } from "@/hooks/useChainTheme";

const DRAFT_KEY = "collection-draft";

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionCreated?: () => void;
  /**
   * The currently selected blockchain to deploy on
   */
  selectedChain?: SupportedChain;
  /**
   * Collection type from the Launchpad tile click.
   * Drives step flow: "generative" | "1of1" | "xrpl-589" | "music" | "core" etc.
   */
  defaultStandard?: string;
}

// Default Phases
const defaultPhases: LaunchpadPhase[] = [
  {
    id: "public",
    price: 0.1,
    startTime: null,
    endTime: null,
    maxPerWallet: 5,
  },
];

// Step definitions based on mode
const BASIC_STEPS = [
  { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
  { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
  { id: 2, title: "Assets", icon: FolderOpen, description: "Upload your Folder" },
  { id: 3, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
  { id: 4, title: "Launch", icon: Rocket, description: "Deploy Collection" },
];

const ADVANCED_STEPS = [
  { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
  { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
  { id: 2, title: "Layers", icon: Layers, description: "Import Trait Layers" },
  { id: 3, title: "Rarity", icon: Sparkles, description: "Configure Rarity" },
  { id: 4, title: "Generate", icon: Wand2, description: "Create Unique NFTs" },
  { id: 5, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
  { id: 6, title: "Launch", icon: Rocket, description: "Deploy Collection" },
];

const ONEOF1_STEPS = [
  { id: 0, title: "Essentials", icon: Tags, description: "Name & Story" },
  { id: 1, title: "Artworks", icon: Palette, description: "Upload Pieces" },
  { id: 2, title: "Editions", icon: Hash, description: "Set Editions" },
  { id: 3, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
  { id: 4, title: "Launch", icon: Rocket, description: "Deploy" },
];

type CollectionFlowType = "generative" | "1of1" | "xrpl-589" | "music";

function resolveFlowType(standard?: string): CollectionFlowType {
  if (standard === "1of1") return "1of1";
  if (standard === "xrpl-589") return "xrpl-589";
  if (standard === "music") return "music";
  return "generative";
}

export function CreateCollectionModal({
  open,
  onOpenChange,
  onCollectionCreated,
  selectedChain = 'solana',
  defaultStandard,
}: CreateCollectionModalProps) {
  const { address, network } = useWallet();
  const { chain } = useChain();
  const { theme } = chain;

  // Apply theme only when modal is open
  useChainTheme(open);

  // Chain hooks
  const solanaLaunch = useSolanaLaunch();

  const xrplLaunch = useXRPLLaunch();

  // Get current chain config
  const currentChain = CHAINS[selectedChain];
  const chainSymbol = currentChain.symbol;

  // Check if full deployment is supported for this chain
  const isChainFullySupported = selectedChain === 'solana' || selectedChain === 'xrpl' || selectedChain === 'monad';

  // Resolve collection flow type from tile selection
  const flowType = resolveFlowType(defaultStandard as string);
  const is1of1 = flowType === "1of1";

  // Wizard State
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // Get steps based on mode and flow type
  const STEPS = is1of1 ? ONEOF1_STEPS : mode === "basic" ? BASIC_STEPS : ADVANCED_STEPS;
  const maxStep = STEPS.length - 1;

  // Collection Data
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [royaltyPercent, setRoyaltyPercent] = useState(5);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Basic Mode: Asset Data
  const [folderAssets, setFolderAssets] = useState<{ name: string; uri: string; file: File; jsonFile?: File }[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ file: string, error: string }[]>([]);

  // Advanced Mode: Layer Data
  const [layers, setLayers] = useState<Layer[]>([]);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [targetSupply, setTargetSupply] = useState(100); // No limit - user sets their own

  // 1/1 Mode: Artwork Data
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [editionCounts, setEditionCounts] = useState<Record<string, number>>({});

  // Config Data
  const [phases, setPhases] = useState<LaunchpadPhase[]>(defaultPhases);
  const [treasuryWallet, setTreasuryWallet] = useState("");

  // Pre-select mode from tile
  useEffect(() => {
    if (open) {
      // 1/1 flow skips mode selection entirely
      if (is1of1) {
        setMode('basic');
      } else if (defaultStandard === 'advanced') {
        setMode('advanced');
      } else {
        setMode('basic');
      }
    }
  }, [open, defaultStandard, is1of1]);

  // Draft auto-save whenever key fields change
  useEffect(() => {
    if (!open) return;
    const draft = {
      name,
      symbol,
      description,
      totalSupply: String(folderAssets.length || targetSupply),
      royalty: String(royaltyPercent),
      currentStep,
      layers,
      phases,
      imageUrl: coverImage || '',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [open, name, symbol, description, currentStep, layers, phases, folderAssets.length, targetSupply, royaltyPercent, coverImage]);

  // Clear draft on modal close without deploy
  useEffect(() => {
    if (!open) return;
    return () => {
      // Draft persists on close so user can resume — we only clear it on successful deploy
    };
  }, [open]);

  // Handler for Image Upload (Cover)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handler for Folder Upload
  const handleAssetsLoaded = (assets: { name: string; uri: string; file: File; jsonFile?: File }[]) => {
    // Validate
    const filesToValidate: AssetFile[] = assets.flatMap(a => [
      { name: a.file.name, file: a.file },
      a.jsonFile ? { name: a.jsonFile.name, file: a.jsonFile } : null
    ]).filter((x): x is AssetFile => x !== null);

    const errors = validateAssets(filesToValidate);
    setValidationErrors(errors);

    if (errors.length === 0) {
      setFolderAssets(assets);
      toast.success(`${assets.length} assets packed and ready!`);
    } else {
      toast.error(`Found ${errors.length} issues with your assets.`);
    }
  };

  // Deployment Logic
  const handleDeploy = async () => {
    if (!name || !symbol) return toast.error("Please fill in basic info.");
    if (selectedChain === 'solana' && !coverFile) return toast.error("Please upload a cover image.");
    if (folderAssets.length === 0) return toast.error("Please upload assets.");

    try {
      toast.loading(`Initializing ${currentChain.name} deployment...`, { id: 'deploy-status' });

      // 1. Get Supabase User & Create Initial Collection Row to get ID
      let { data: { user } } = await supabase.auth.getUser();

      // Fallback: If no user session found but wallet is connected, try to establish session on the fly
      if (!user && address) {
        toast.loading("Establishing secure session...", { id: 'deploy-status' });
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              wallet_address: address,
              wallet_type: selectedChain
            }
          }
        });

        if (authError) {
          console.error("Auth fallback failed:", authError);
          throw new Error("Could not establish a secure session. Please try reconnecting your wallet.");
        }

        user = authData.user;
        console.log("Auto-established fallback session for deployment:", user?.id);
      }

      if (!user) throw new Error("User session not found. Please log in.");

      toast.loading("Reserving collection ID...", { id: 'deploy-status' });
      const { data: placeholderCollection, error: placeholderError } = await supabase
        .from("collections")
        .insert({
          name,
          symbol,
          description,
          creator_id: user.id,
          creator_address: address!,
          status: "upcoming",
          chain: network === "mainnet" ? selectedChain : `${selectedChain}-devnet`,
          collection_type: "generative",
          total_supply: folderAssets.length,
          phases: phases as any,
          royalty_percent: royaltyPercent,
        })
        .select('id')
        .single();

      if (placeholderError) {
        console.error("Placeholder error:", placeholderError);
        throw new Error("Failed to initialize collection record.");
      }

      const collectionId = placeholderCollection.id;
      const storageInfo = getCollectionStorageInfo(collectionId);
      const baseUri = getChainRootUri(selectedChain, collectionId);

      // 2. Upload Collection Assets to Supabase Storage FIRST (Deterministic logic)
      toast.loading(`Uploading ${folderAssets.length} assets to storage...`, { id: 'deploy-status' });
      const batchSize = 5;
      for (let i = 0; i < folderAssets.length; i += batchSize) {
        const batch = folderAssets.slice(i, i + batchSize);
        await Promise.all(batch.map(async (asset, index) => {
          const tokenId = i + index;
          const fileExt = asset.file.name.split('.').pop() || 'png';

          // Image
          await supabase.storage.from('nfts').upload(`${collectionId}/${tokenId}.${fileExt}`, asset.file, { upsert: true });

          // Metadata
          const metadata = {
            name: `${name} #${tokenId + 1}`,
            symbol: symbol,
            description: description,
            image: storageInfo.itemImageUri(tokenId, fileExt),
            attributes: [],
            properties: {
              files: [{ uri: storageInfo.itemImageUri(tokenId, fileExt), type: asset.file.type || `image/${fileExt}` }],
              category: 'image',
            }
          };
          await supabase.storage.from('nfts').upload(`${collectionId}/${tokenId}.json`, JSON.stringify(metadata), {
            upsert: true,
            contentType: 'application/json'
          });
        }));
        toast.loading(`Storage: ${Math.min(i + batchSize, folderAssets.length)} assets uploaded...`, { id: 'deploy-status' });
      }

      // 3. Chain-Specific On-Chain Deployment
      let deployedContractAddress = "";
      let finalImageUrl = "";

      if (selectedChain === 'solana') {
        // Solana: Upload cover to Arweave, deploy Core Collection + Candy Machine
        toast.loading("Uploading cover to Arweave...", { id: 'deploy-status' });

        const imageUri = await solanaLaunch.uploadFile(coverFile!);
        finalImageUrl = imageUri;

        const collMetadata = {
          name, symbol, description, image: imageUri,
          properties: { files: [{ uri: imageUri, type: coverFile!.type }], category: "image" }
        };
        const collMetadataUri = await solanaLaunch.uploadMetadata(collMetadata);

        toast.loading("Deploying Solana Collection...", { id: 'deploy-status' });
        const collection = await solanaLaunch.deploySolanaCollection({
          name, symbol, uri: collMetadataUri,
          sellerFeeBasisPoints: royaltyPercent * 100,
          creators: [{ address: address!, share: 100 }]
        });
        if (!collection) throw new Error("Collection deployment failed.");
        deployedContractAddress = collection.address;

        toast.loading("Creating Solana Candy Machine...", { id: 'deploy-status' });
        const cm = await solanaLaunch.createLaunchpadCandyMachine(
          collection.address, folderAssets.length, phases,
          { name, symbol, uri: collMetadataUri, sellerFeeBasisPoints: royaltyPercent * 100, creators: [] },
          treasuryWallet || undefined,
          baseUri
        );
        if (!cm) throw new Error("Candy Machine creation failed.");

        const itemsToInsert = folderAssets.map((_, index) => ({ name: `${name} #${index + 1}`, uri: `${index}.json` }));
        await solanaLaunch.insertItemsToCandyMachine(cm.address, itemsToInsert);

      } else if (selectedChain === 'xrpl') {
        // XRPL: Set Account Domain for deterministic metadata resolution.
        // Individual NFTs are minted on-demand during mint flow, not at deploy time.
        toast.loading("Setting XRPL Account Domain...", { id: 'deploy-status' });
        const xrplRes = await xrplLaunch.deployXRPLCollection({
          name, symbol, description,
          totalSupply: folderAssets.length,
          baseUri, // Deterministic Domain Strategy
        });
        deployedContractAddress = xrplRes.address;
        // Use the first asset's Supabase URL as the cover image for XRPL (no Arweave)
        finalImageUrl = storageInfo.itemImageUri(0, 'png');
      }

      // 4. Update Supabase with final details
      await supabase
        .from("collections")
        .update({
          contract_address: deployedContractAddress,
          image_url: finalImageUrl || storageInfo.itemImageUri(0, 'png'),
          status: "active",
        })
        .eq('id', collectionId);

      // Clear draft on successful deploy
      localStorage.removeItem(DRAFT_KEY);

      toast.success(`${currentChain.name} Launch Successful!`, { id: 'deploy-status' });
      onCollectionCreated?.();
      onOpenChange(false);

    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Deployment failed", { id: 'deploy-status' });
    }
  };

  const nextStep = () => {
    if (is1of1) {
      // 1/1 flow: Step 0 = Essentials, Step 1 = Artworks, Step 2 = Editions, Step 3 = Mint, Step 4 = Launch
      if (currentStep === 0 && (!name || !symbol)) {
        return toast.error("Name and Symbol are required");
      }
      if (currentStep === 1 && artworks.length === 0) {
        return toast.error("Please upload at least one artwork");
      }
      setDirection(1);
      setCurrentStep(s => Math.min(s + 1, maxStep));
      return;
    }

    // Mode selection step - just move forward
    if (currentStep === 0) {
      setDirection(1);
      setCurrentStep(1);
      return;
    }

    // Essentials validation
    if (currentStep === 1 && (!name || !symbol)) {
      return toast.error("Name and Symbol are required");
    }

    // Basic Mode: Step 2 = Assets
    if (mode === "basic" && currentStep === 2 && folderAssets.length === 0) {
      return toast.error("Please upload assets first");
    }

    // Advanced Mode: Step 2 = Layers
    if (mode === "advanced" && currentStep === 2 && layers.length === 0) {
      return toast.error("Please add at least one layer");
    }

    // Advanced Mode: Step 4 = Generate (must have generated assets)
    if (mode === "advanced" && currentStep === 4 && generatedAssets.length === 0) {
      return toast.error("Please generate assets first");
    }

    setDirection(1);
    setCurrentStep(s => Math.min(s + 1, maxStep));
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep(s => Math.max(s - 1, 0));
  };

  // Handle asset generation (Advanced Mode)
  const handleGenerate = async () => {
    if (layers.length === 0) {
      return toast.error("Please add at least one layer");
    }

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: targetSupply });

    try {
      const assets = await generateAssets(
        layers,
        {
          collectionName: name,
          collectionSymbol: symbol,
          description,
          totalSupply: targetSupply,
          allowDuplicates: false,
        },
        (current, total) => setGenerationProgress({ current, total })
      );

      setGeneratedAssets(assets);
      toast.success(`Generated ${assets.length} unique assets!`);
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate assets");
    } finally {
      setIsGenerating(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[85vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col md:flex-row shadow-2xl">

        {/* LEFT PANEL: CONFIGURATION */}
        <div className="w-full md:w-[55%] lg:w-[420px] flex flex-col border-r border-border bg-card/50">
          {/* Header - Compact */}
          <div className="px-4 py-3 border-b border-border" style={{ background: `linear-gradient(to right, ${theme.primaryColor}10, transparent)` }}>
            <div className="flex items-center gap-1.5 mb-0.5" style={{ color: theme.primaryColor }}>
              <Sparkles className="w-3 h-3" />
              <span className="text-[10px] font-mono uppercase tracking-widest">
                {is1of1 ? '1/1 & Limited Editions' : 'Create Collection'}
              </span>
            </div>
            <h1 className="text-base font-bold gradient-text">
              {is1of1 ? 'Artwork Launchpad' : 'Launchpad Wizard'}
            </h1>
          </div>

          {/* Steps Indicator - Compact (clickable for completed steps) */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto bg-muted/20 border-b border-border/50">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (isDone) {
                      setDirection(-1);
                      setCurrentStep(step.id);
                    }
                  }}
                  disabled={!isDone}
                  className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium transition-all disabled:cursor-default"
                  style={isActive ? {
                    backgroundColor: `${theme.primaryColor}20`,
                    borderColor: theme.primaryColor,
                    color: theme.primaryColor
                  } : isDone ? {
                    backgroundColor: `${theme.secondaryColor}10`,
                    borderColor: `${theme.secondaryColor}30`,
                    color: theme.secondaryColor,
                    cursor: 'pointer'
                  } : {
                    borderColor: 'transparent',
                    opacity: 0.4
                  }}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span className="hidden lg:inline">{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 relative">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >

                {/* STEP 0: MODE SELECTION (generative only) or ESSENTIALS (1/1) */}
                {currentStep === 0 && !is1of1 && (
                  <ModeSelector mode={mode} onModeChange={setMode} />
                )}

                {/* ESSENTIALS: Step 1 (generative) or Step 0 (1/1) */}
                {((is1of1 && currentStep === 0) || (!is1of1 && currentStep === 1)) && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label>Select Cover Image</Label>
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 hover:bg-white/5 transition-colors text-center cursor-pointer relative group">
                        <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCoverUpload} accept="image/*" />
                        {coverImage ? (
                          <img src={coverImage} className="max-h-48 mx-auto rounded-md shadow-lg" alt="Cover" />
                        ) : (
                          <div className="space-y-2 text-muted-foreground">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Drag & drop or click to upload</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Collection Name</Label>
                      <Input
                        value={name} onChange={e => setName(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 text-lg"
                        placeholder="e.g. Galactic Apes"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <Label>Symbol</Label>
                        <Input
                          value={symbol} onChange={e => setSymbol(e.target.value)}
                          className="bg-white/5 border-white/10 font-mono uppercase"
                          placeholder="APE"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Royalty %</Label>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={royaltyPercent}
                          onChange={e => setRoyaltyPercent(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
                          className="bg-white/5 border-white/10"
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Supply (Est.)</Label>
                        <Input
                          disabled
                          value={folderAssets.length || "Auto"}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Description</Label>
                      <Textarea
                        value={description} onChange={e => setDescription(e.target.value)}
                        className="bg-white/5 border-white/10 min-h-[100px]"
                        placeholder="Tell the story behind your collection..."
                      />
                    </div>
                  </div>
                )}

                {/* 1/1 STEP 1: ARTWORKS UPLOAD */}
                {is1of1 && currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-2" style={{ color: theme.primaryColor }}>
                        <Palette className="w-4 h-4" /> Upload Your Artworks
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Drop individual images — each becomes a unique NFT. You can add titles, descriptions, and trait attributes per piece.
                      </p>
                    </div>
                    <ArtworkUploader
                      artworks={artworks}
                      onArtworksChange={setArtworks}
                      collectionType="one_of_one"
                      creatorId={address || 'anonymous'}
                      maxItems={100}
                      chainSymbol={chainSymbol}
                    />
                  </div>
                )}

                {/* 1/1 STEP 2: EDITIONS */}
                {is1of1 && currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-2" style={{ color: theme.primaryColor }}>
                        <Hash className="w-4 h-4" /> Edition Counts
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Set how many copies of each artwork to mint. Use 1 for true 1/1s, or a higher number for limited editions.
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                      {artworks.map((artwork, idx) => (
                        <div key={artwork.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                          <div className="w-12 h-12 rounded-md overflow-hidden border border-border shrink-0">
                            {artwork.imageUrl ? (
                              <img src={artwork.imageUrl} alt={artwork.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{artwork.name || `Artwork #${idx + 1}`}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(editionCounts[artwork.id] || 1) === 1 ? 'True 1/1' : `${editionCounts[artwork.id]} editions`}
                            </p>
                          </div>
                          <div className="shrink-0 w-20">
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={editionCounts[artwork.id] || 1}
                              onChange={(e) => setEditionCounts(prev => ({
                                ...prev,
                                [artwork.id]: Math.max(1, Math.min(100, Number(e.target.value) || 1))
                              }))}
                              className="h-8 text-xs text-center"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {artworks.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                        <span className="text-xs text-muted-foreground">Total NFTs to mint</span>
                        <span className="text-sm font-bold" style={{ color: theme.primaryColor }}>
                          {artworks.reduce((sum, a) => sum + (editionCounts[a.id] || 1), 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: ASSETS (Basic) or LAYERS (Advanced) — generative flow only */}
                {!is1of1 && currentStep === 2 && (
                  <div className="space-y-6">
                    {mode === "basic" ? (
                      <>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <h3 className="text-blue-400 font-medium mb-1 flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" /> No-Code Upload
                          </h3>
                          <p className="text-xs text-blue-300/80">
                            Upload a folder containing your images (`1.png`) and metadata (`1.json`).
                            We will automatically match them.
                          </p>
                        </div>

                        <FolderUploader onAssetsLoaded={handleAssetsLoaded} />

                        {validationErrors.length > 0 && (
                          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-red-400 font-medium">
                              <AlertTriangle className="w-4 h-4" /> Validation Issues
                            </div>
                            <ul className="text-xs text-red-300 space-y-1 max-h-32 overflow-y-auto">
                              {validationErrors.map((err, i) => (
                                <li key={i}><span className="font-mono bg-red-950 px-1 rounded">{err.file}</span>: {err.error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <LayerManager layers={layers} onLayersChange={setLayers} />
                    )}
                  </div>
                )}

                {/* STEP 3: RARITY (Advanced Only, not 1/1) */}
                {!is1of1 && mode === "advanced" && currentStep === 3 && (
                  <TraitRarityEditor layers={layers} onLayersChange={setLayers} />
                )}

                {/* STEP 4: GENERATE (Advanced Only, not 1/1) */}
                {!is1of1 && mode === "advanced" && currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-bold gradient-text">Generate Your Collection</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Create unique combinations based on your layers and rarity settings.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Target Supply</Label>
                      <Input
                        type="number"
                        value={targetSupply}
                        onChange={(e) => setTargetSupply(Number(e.target.value) || 10)}
                        min={1}
                        className="bg-muted/50 border-border h-8 text-xs"
                        placeholder="Enter any amount..."
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Max unique: {layers.filter(l => l.visible).reduce((acc, l) => acc * l.traits.length, 1).toLocaleString()} • No limit on supply
                      </p>
                    </div>

                    {generatedAssets.length === 0 ? (
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600"
                      >
                        {isGenerating ? (
                          <>
                            <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating... {generationProgress.current}/{generationProgress.total}
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Generate {targetSupply} Assets
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-400">
                            ✓ {generatedAssets.length} assets generated
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGeneratedAssets([])}
                          >
                            Regenerate
                          </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                          {generatedAssets.slice(0, 16).map((asset) => (
                            <div
                              key={asset.id}
                              className="aspect-square rounded-lg overflow-hidden border border-white/10"
                            >
                              <img
                                src={asset.preview}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {generatedAssets.length > 16 && (
                            <div className="aspect-square rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                +{generatedAssets.length - 16}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MINT CONFIG: Step 3 (Basic/1of1) or Step 5 (Advanced) */}
                {((is1of1 && currentStep === 3) || (!is1of1 && mode === "basic" && currentStep === 3) || (!is1of1 && mode === "advanced" && currentStep === 5)) && (
                  <div className="space-y-4">
                    {/* Treasury Wallet */}
                    <div className="space-y-2">
                      <Label className="text-xs">Treasury Wallet (Optional)</Label>
                      <Input
                        value={treasuryWallet}
                        onChange={e => setTreasuryWallet(e.target.value)}
                        placeholder={address || "Defaults to your connected wallet..."}
                        className="bg-muted/50 border-border font-mono text-xs h-8"
                      />
                      <p className="text-[10px] text-muted-foreground">Receives mint proceeds. Leave blank to use your connected wallet.</p>
                    </div>

                    <Separator className="bg-border" />

                    {/* Full Guard Configurator */}
                    <GuardConfigurator
                      phase={phases[0]}
                      onChange={(updates) => {
                        const newPhases = [...phases];
                        newPhases[0] = { ...newPhases[0], ...updates };
                        setPhases(newPhases);
                      }}
                      chainSymbol={chainSymbol}
                    />
                  </div>
                )}

                {/* LAUNCH: Step 4 (Basic/1of1) or Step 6 (Advanced) */}
                {((is1of1 && currentStep === 4) || (!is1of1 && mode === "basic" && currentStep === 4) || (!is1of1 && mode === "advanced" && currentStep === 6)) && (
                  <div className="space-y-6 text-center py-10">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                      style={{ backgroundColor: `${currentChain.color}20` }}
                    >
                      <ChainIcon chain={selectedChain} className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Ready for Liftoff?</h2>
                    <p className="text-muted-foreground">
                      You are about to deploy <strong>{name}</strong> on <strong>{currentChain.name}</strong>.
                    </p>

                    {/* Chain support warning */}
                    {!isChainFullySupported && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-left flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-amber-400 font-medium">
                            {selectedChain === 'monad' ? 'Monad is currently in testnet' : `${currentChain.name} deployment`}
                          </p>
                          <p className="text-xs text-amber-300/70 mt-0.5">
                            Full NFT deployment will be available when mainnet launches.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 border border-white/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Chain</span>
                        <span className="text-white font-medium flex items-center gap-1">
                          <ChainIcon chain={selectedChain} className="w-3 h-3" />
                          {currentChain.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Supply</span>
                        <span className="text-white font-mono">
                          {mode === "basic" ? folderAssets.length : generatedAssets.length} Items
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mint Price</span>
                        <span className="text-white font-mono">{phases[0].price} {chainSymbol}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Network fees (Est.)</span>
                        <span className="text-white font-mono">
                          ~{selectedChain === 'solana' ? '0.02 SOL' : selectedChain === 'xrpl' ? '0.001 XRP' : '0.01 MON'}
                        </span>
                      </div>
                      {mode === "advanced" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Mode</span>
                          <span className="text-purple-400 font-medium">Advanced (Generated)</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleDeploy}
                      disabled={solanaLaunch.isLoading || !isChainFullySupported}
                      className="w-full h-14 text-lg font-bold text-white disabled:opacity-50"
                      style={{
                        background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`,
                        boxShadow: `0 20px 25px -5px ${theme.glowColor}20, 0 10px 10px -5px ${theme.glowColor}10`
                      }}
                    >
                      {solanaLaunch.isLoading
                        ? "Deploying..."
                        : !isChainFullySupported
                          ? `${currentChain.name} Coming Soon`
                          : "Launch Collection"
                      }
                    </Button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation - Compact */}
          <div className="px-4 py-3 border-t border-border flex justify-between bg-card/80">
            <Button variant="ghost" size="sm" onClick={prevStep} disabled={currentStep === 0} className="text-muted-foreground hover:text-foreground h-8 text-xs">
              <ChevronLeft className="w-3 h-3 mr-1" /> Back
            </Button>

            {currentStep < maxStep ? (
              <Button size="sm" onClick={nextStep} className="text-white hover:opacity-90 h-8 text-xs px-4" style={{ background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})` }}>
                Continue <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* RIGHT PANEL: PREVIEW */}
        <div className="hidden md:flex flex-1 flex-col bg-muted/30 relative overflow-hidden">
          {/* Subtle decorative elements */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-8 right-8 w-24 h-24 rounded-full blur-3xl" style={{ backgroundColor: `${theme.primaryColor}30` }} />
            <div className="absolute bottom-12 left-12 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${theme.secondaryColor}30` }} />
          </div>

          {/* Step Context Header */}
          <div className="px-4 py-3 border-b border-border bg-card/50 relative z-10">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {is1of1 && currentStep === 0 && "Define Collection Identity"}
              {is1of1 && currentStep === 1 && "Upload Your Artworks"}
              {is1of1 && currentStep === 2 && "Set Edition Counts"}
              {is1of1 && currentStep === 3 && "Configure Mint Settings"}
              {is1of1 && currentStep === 4 && "Ready to Launch"}
              {!is1of1 && currentStep === 0 && "Select Your Creation Mode"}
              {!is1of1 && currentStep === 1 && "Define Collection Identity"}
              {!is1of1 && mode === "basic" && currentStep === 2 && "Upload Your NFT Assets"}
              {!is1of1 && mode === "basic" && currentStep === 3 && "Configure Mint Settings"}
              {!is1of1 && mode === "basic" && currentStep === 4 && "Ready to Launch"}
              {!is1of1 && mode === "advanced" && currentStep === 2 && "Import Trait Layers"}
              {!is1of1 && mode === "advanced" && currentStep === 3 && "Set Trait Rarity"}
              {!is1of1 && mode === "advanced" && currentStep === 4 && "Generate Unique NFTs"}
              {!is1of1 && mode === "advanced" && currentStep === 5 && "Configure Mint Settings"}
              {!is1of1 && mode === "advanced" && currentStep === 6 && "Ready to Launch"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              {is1of1 && currentStep === 0 && "Your name, symbol, and cover create the first impression."}
              {is1of1 && currentStep === 1 && "Drop individual artwork images — each one becomes an NFT."}
              {is1of1 && currentStep === 2 && "1 = true 1/1. Higher = limited edition. Up to 100 per piece."}
              {is1of1 && currentStep === 3 && "Set pricing, guards, and treasury wallet."}
              {is1of1 && currentStep === 4 && `Review and deploy your collection to ${currentChain.name}.`}
              {!is1of1 && currentStep === 0 && "Choose between uploading ready assets or building generative art."}
              {!is1of1 && currentStep === 1 && "Your name, symbol, and cover create the first impression."}
              {!is1of1 && mode === "basic" && currentStep === 2 && "Upload a folder with images and matching JSON metadata."}
              {!is1of1 && mode === "basic" && currentStep === 3 && "Set pricing, guards, and treasury wallet."}
              {!is1of1 && mode === "basic" && currentStep === 4 && `Review and deploy your collection to ${currentChain.name}.`}
              {!is1of1 && mode === "advanced" && currentStep === 2 && "Each folder becomes a layer. Drag to reorder."}
              {!is1of1 && mode === "advanced" && currentStep === 3 && "Lower percentages = rarer traits."}
              {!is1of1 && mode === "advanced" && currentStep === 4 && "We'll create unique combinations for your supply."}
              {!is1of1 && mode === "advanced" && currentStep === 5 && "Set pricing, guards, and treasury wallet."}
              {!is1of1 && mode === "advanced" && currentStep === 6 && `Review and deploy your collection to ${currentChain.name}.`}
            </p>
          </div>

          {/* Preview Card */}
          <div className="flex-1 flex items-center justify-center relative z-10">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <LaunchpadPreview
                name={name}
                description={description}
                coverImage={coverImage}
                itemsAvailable={is1of1 ? artworks.reduce((sum, a) => sum + (editionCounts[a.id] || 1), 0) : mode === "basic" ? (folderAssets.length || 1000) : (generatedAssets.length || targetSupply)}
                phases={phases}
                activePhaseIndex={0}
                selectedChain={selectedChain}
              />
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}