import React, { useState, useEffect, useCallback } from "react";
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
  Wallet,
  Tags,
  Image as ImageIcon,
  Rocket,
  ArrowRight,
  Upload,
  AlertTriangle,
  FolderOpen,
  Layers,
  Wand2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { FolderUploader } from "./FolderUploader";
import { GuardConfigurator } from "./GuardConfigurator";
import { LaunchpadPreview } from "./LaunchpadPreview";
import { ModeSelector } from "./ModeSelector";
import { LayerManager, Layer } from "./LayerManager";
import { TraitRarityEditor } from "./TraitRarityEditor";
import { useWallet } from "@/providers/WalletProvider";
import { useSolanaLaunch, LaunchpadPhase } from "@/hooks/useSolanaLaunch";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { validateAssets, AssetFile } from "@/utils/assetValidator";
import { generateAssets, GeneratedAsset } from "@/lib/assetGenerator";

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionCreated?: () => void;
  /**
   * Optional standard hint from the Launchpad page (e.g. "core").
   * Currently unused by this wizard, but accepted to keep Launchpad -> Modal typing consistent.
   */
  defaultStandard?: unknown;
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
  { id: 4, title: "Launch", icon: Rocket, description: "Deploy to Solana" },
];

const ADVANCED_STEPS = [
  { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
  { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
  { id: 2, title: "Layers", icon: Layers, description: "Import Trait Layers" },
  { id: 3, title: "Rarity", icon: Sparkles, description: "Configure Rarity" },
  { id: 4, title: "Generate", icon: Wand2, description: "Create Unique NFTs" },
  { id: 5, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
  { id: 6, title: "Launch", icon: Rocket, description: "Deploy to Solana" },
];

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated }: CreateCollectionModalProps) {
  const { address, network } = useWallet();
  const solanaLaunch = useSolanaLaunch();

  // Wizard State
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const [currentStep, setCurrentStep] = useState(0); // Start at mode selection
  const [direction, setDirection] = useState(0);

  // Get steps based on mode
  const STEPS = mode === "basic" ? BASIC_STEPS : ADVANCED_STEPS;
  const maxStep = STEPS.length - 1;

  // Collection Data
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
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
  const [targetSupply, setTargetSupply] = useState(1000);

  // Config Data
  const [phases, setPhases] = useState<LaunchpadPhase[]>(defaultPhases);
  const [treasuryWallet, setTreasuryWallet] = useState("");

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
    if (!name || !symbol || !coverFile) return toast.error("Please fill in basic info and upload a cover image.");
    if (folderAssets.length === 0) return toast.error("Please upload assets.");

    try {
      toast.loading("Uploading collection metadata...", { id: 'deploy-status' });

      // 1. Upload Cover Image to Arweave/Irys
      const imageUri = await solanaLaunch.uploadFile(coverFile);
      console.log("Cover Image uploaded:", imageUri);

      // 2. Upload JSON Metadata
      const metadata = {
        name,
        symbol,
        description,
        image: imageUri,
        properties: {
          files: [{ uri: imageUri, type: coverFile.type }],
          category: "image",
        }
      };
      const metadataUri = await solanaLaunch.uploadMetadata(metadata);
      console.log("Metadata uploaded:", metadataUri);

      toast.loading("Deploying Collection on-chain...", { id: 'deploy-status' });

      // 3. Deploy Collection with real Metadata URI
      const collection = await solanaLaunch.deploySolanaCollection({
        name,
        symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: 500, // 5% default
        creators: [{ address: address!, share: 100 }]
      });

      if (!collection) {
        toast.dismiss('deploy-status');
        return;
      }

      toast.loading("Creating Candy Machine...", { id: 'deploy-status' });

      // 4. Create Candy Machine
      const cm = await solanaLaunch.createLaunchpadCandyMachine(
        collection.address,
        folderAssets.length,
        phases,
        { name, symbol, uri: metadataUri, sellerFeeBasisPoints: 500, creators: [] },
        treasuryWallet || undefined
      );

      if (!cm) {
        toast.dismiss('deploy-status');
        return;
      }

      // 5. Persist to Supabase
      toast.loading("Saving collection to dashboard...", { id: 'deploy-status' });

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Enhancing phases with CM address so Mint Section can find it
        const phasesWithCm = phases.map(p => ({
          ...p,
          candyMachineAddress: cm.address
        }));

        const { error: dbError } = await supabase.from("collections").insert({
          name,
          symbol,
          description,
          image_url: imageUri, // Arweave URI
          total_supply: folderAssets.length,
          creator_id: user.id,
          creator_address: address!,
          contract_address: collection.address, // Collection Address (not CM)
          status: "upcoming",
          chain: network === "mainnet" ? "solana" : "solana-devnet",
          collection_type: "generative",
          phases: phasesWithCm as any, // Store the phase config with CM address
        });

        if (dbError) {
          console.error("Supabase Save Error:", dbError);
          toast.error("Deployed, but failed to save to dashboard. Save your addresses!");
          console.log("Manual Recovery Info:", {
            collection: collection.address,
            candyMachine: cm.address,
            network,
            metadataUri
          });
        }
      } else {
        console.error("No Supabase user session found!");
        toast.error("Critical: You are not logged in to the backend. Collection deployed but NOT saved to dashboard.", {
          duration: 10000,
          description: `Address: ${collection.address}. Please report this.`
        });
      }

      toast.success("Collection & Candy Machine deployed!", { id: 'deploy-status' });

      // 6. Upload Assets & Insert Items
      // We only do this if there are folder assets
      if (folderAssets.length > 0) {
        try {
          toast.loading(`Uploading ${folderAssets.length} assets to Arweave... this may take a moment`, { id: 'deploy-status' });

          // A. Batch Upload Images
          const imageFiles = folderAssets.map(a => a.file);
          const imageUris = await solanaLaunch.uploadFiles(imageFiles);
          console.log(`Uploaded ${imageUris.length} images`);

          // B. Prepare Metadata with new Image URIs
          const metadataObjects = folderAssets.map((asset, index) => {
            // Generate standard safe metadata
            return {
              name: `${name} #${index + 1}`,
              symbol: symbol,
              description: description,
              image: imageUris[index],
              attributes: [],
              properties: {
                files: [{ uri: imageUris[index], type: asset.file.type || 'image/png' }],
                category: 'image',
              }
            };
          });

          // C. Batch Upload Metadata
          toast.loading("Uploading asset metadata...", { id: 'deploy-status' });
          const metadataUris = await solanaLaunch.uploadJsonMetadataBatch(metadataObjects);
          console.log(`Uploaded ${metadataUris.length} metadata files`);

          // D. Insert Items into Candy Machine
          const itemsToInsert = metadataObjects.map((meta, index) => ({
            name: meta.name,
            uri: metadataUris[index]
          }));

          toast.loading("Inserting items into Candy Machine...", { id: 'deploy-status' });
          await solanaLaunch.insertItemsToCandyMachine(cm.address, itemsToInsert);

          toast.success("All assets uploaded and inserted!", { id: 'deploy-status' });

        } catch (uploadErr) {
          console.error("Asset Upload Error:", uploadErr);
          toast.error("Deployment success, but asset upload failed. You can retry via script.", { id: 'deploy-status' });
        }
      }

      toast.message("Collection Launch Complete!", {
        description: "Your collection is live and ready to mint."
      });

      onCollectionCreated?.();
      onOpenChange(false);

    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Deployment failed", { id: 'deploy-status' });
    }
  };

  const nextStep = () => {
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
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0 bg-[#09090b] border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl pb-10">

        {/* LEFT PANEL: CONFIGURATION */}
        <div className="w-full md:w-[60%] lg:w-[450px] flex flex-col border-r border-white/5 bg-[#0c0c0e]">
          {/* Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs font-mono uppercase tracking-widest">Create Collection</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Launchpad Wizard</h1>
          </div>

          {/* Steps Indicator */}
          <div className="px-6 py-4 flex gap-2 overflow-x-auto">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;

              return (
                <div key={step.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${isActive ? "bg-primary/20 border-primary text-primary" :
                  isDone ? "bg-white/5 border-white/10 text-white" : "border-transparent text-muted-foreground opacity-50"
                  }`}>
                  <Icon className="w-3 h-3" />
                  <span>{step.title}</span>
                </div>
              );
            })}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 relative">
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

                {/* STEP 0: MODE SELECTION */}
                {currentStep === 0 && (
                  <ModeSelector mode={mode} onModeChange={setMode} />
                )}

                {/* STEP 1: ESSENTIALS */}
                {currentStep === 1 && (
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

                    <div className="grid grid-cols-2 gap-4">
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

                {/* STEP 2: ASSETS (Basic) or LAYERS (Advanced) */}
                {currentStep === 2 && (
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

                {/* STEP 3: RARITY (Advanced Only) */}
                {mode === "advanced" && currentStep === 3 && (
                  <TraitRarityEditor layers={layers} onLayersChange={setLayers} />
                )}

                {/* STEP 4: GENERATE (Advanced Only) */}
                {mode === "advanced" && currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold text-white">Generate Your Collection</h3>
                      <p className="text-xs text-muted-foreground">
                        Create unique combinations based on your layers and rarity settings.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>Target Supply</Label>
                      <Input
                        type="number"
                        value={targetSupply}
                        onChange={(e) => setTargetSupply(Number(e.target.value) || 100)}
                        min={1}
                        max={10000}
                        className="bg-white/5 border-white/10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Max possible: {layers.filter(l => l.visible).reduce((acc, l) => acc * l.traits.length, 1).toLocaleString()} combinations
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

                {/* MINT CONFIG: Step 3 (Basic) or Step 5 (Advanced) */}
                {((mode === "basic" && currentStep === 3) || (mode === "advanced" && currentStep === 5)) && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label>Treasury Wallet</Label>
                      <Input
                        value={treasuryWallet}
                        onChange={e => setTreasuryWallet(e.target.value)}
                        placeholder={address || "Wait..."}
                        className="bg-white/5 border-white/10 font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Wallet receiving mint proceeds.</p>
                    </div>

                    <Separator className="bg-white/10" />

                    <GuardConfigurator
                      phase={phases[0]}
                      onChange={(updates) => {
                        const newPhases = [...phases];
                        newPhases[0] = { ...newPhases[0], ...updates };
                        setPhases(newPhases);
                      }}
                    />
                  </div>
                )}

                {/* LAUNCH: Step 4 (Basic) or Step 6 (Advanced) */}
                {((mode === "basic" && currentStep === 4) || (mode === "advanced" && currentStep === 6)) && (
                  <div className="space-y-6 text-center py-10">
                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Rocket className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Ready for Liftoff?</h2>
                    <p className="text-muted-foreground">
                      You are about to deploy <strong>{name}</strong> on <strong>{network}</strong>.
                    </p>

                    <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 border border-white/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Supply</span>
                        <span className="text-white font-mono">
                          {mode === "basic" ? folderAssets.length : generatedAssets.length} Items
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mint Price</span>
                        <span className="text-white font-mono">{phases[0].price} SOL</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Network fees (Est.)</span>
                        <span className="text-white font-mono">~0.02 SOL</span>
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
                      disabled={solanaLaunch.isLoading}
                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl shadow-green-500/20"
                    >
                      {solanaLaunch.isLoading ? "Deploying..." : "Launch Collection"}
                    </Button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t border-white/5 flex justify-between bg-[#09090b]">
            <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0} className="text-muted-foreground hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            {currentStep < maxStep ? (
              <Button onClick={nextStep} className="bg-white text-black hover:bg-white/90">
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* RIGHT PANEL: PREVIEW */}
        <div className="hidden md:flex flex-1 bg-[url('/grid-pattern.svg')] bg-cover bg-center items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-lg"
          >
            <LaunchpadPreview
              name={name}
              description={description}
              coverImage={coverImage}
              itemsAvailable={folderAssets.length || 1000}
              phases={phases}
              activePhaseIndex={0}
            />
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}