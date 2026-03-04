import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
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
    ArrowLeft,
    Download,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { FolderUploader } from "@/components/launchpad/FolderUploader";
import { GuardConfigurator } from "@/components/launchpad/GuardConfigurator";
import { LaunchpadPreview } from "@/components/launchpad/LaunchpadPreview";
import { ModeSelector } from "@/components/launchpad/ModeSelector";
import { LayerManager, Layer } from "@/components/launchpad/LayerManager";
import { TraitRarityEditor } from "@/components/launchpad/TraitRarityEditor";
import { ArtworkUploader, type ArtworkItem } from "@/components/launchpad/ArtworkUploader";
import { MusicArtworkUploader } from "@/components/launchpad/MusicArtworkUploader";
import { type MusicTrack } from "@/components/launchpad/MusicMetadataEditor";
import { useWallet } from "@/providers/WalletProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useSolanaLaunch, LaunchpadPhase } from "@/hooks/useSolanaLaunch";
import { useXRPLLaunch } from "@/hooks/useXRPLLaunch";
import { useMonadLaunch } from "@/hooks/useMonadLaunch";
import { pinCollectionToIPFS } from "@/lib/nftStorageService";
import { useIpfs } from "@/providers/IpfsProvider";
import { supabase } from "@/integrations/supabase/client";
// storageClient removed — Arweave-only flow
import { motion, AnimatePresence } from "framer-motion";
import { validateAssets, AssetFile } from "@/utils/assetValidator";
import { generateAssets, GeneratedAsset } from "@/lib/assetGenerator";
import { SupportedChain, CHAINS } from "@/config/chains";
import { ChainIcon } from "@/components/launchpad/ChainSelector";
// payloadMapper no longer needed — Arweave-only flow
import { useChain } from "@/providers/ChainProvider";
import { useChainTheme } from "@/hooks/useChainTheme";
import { useDraftCollection } from "@/hooks/useDraftCollection";
import { cn, dataUrlToBlob } from "@/lib/utils";
import { bundleAssetsAsZip, GeneratedNFT } from "@/lib/assetBundler";
import { getDbChainValue } from "@/config/chains";
import { getLaunchpadConfig, CollectionMode } from "@/config/launchpad";
import { uploadToArweave, uploadMetadataToArweave } from "@/integrations/irys/client";
import { LaunchpadTools } from "@/components/launchpad/LaunchpadTools";
import { XRPLConfigurator } from "@/components/launchpad/chains/XRPLConfigurator";
import { Check, Info } from "lucide-react";

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

type CollectionFlowType = "generative" | "1of1" | "xrpl-589" | "music";

function resolveFlowType(standard?: string): CollectionFlowType {
    if (standard === "1of1") return "1of1";
    if (standard === "xrpl-589") return "xrpl-589";
    if (standard === "music") return "music";
    return "generative";
}

export default function LaunchpadCreate() {
    const { chain: chainParam, type: typeParam } = useParams<{ chain: string; type: string }>();
    const navigate = useNavigate();
    const { address, network } = useWallet();
    const { isAdmin } = useAuth();
    const { chain } = useChain();
    const { theme } = chain;

    const selectedChain = (chainParam as SupportedChain) || 'solana';
    useChainTheme(true);

    const solanaLaunch = useSolanaLaunch();
    const xrplLaunch = useXRPLLaunch();
    const monadLaunch = useMonadLaunch();

    const { hasDraft, loadDraft, saveDraft, saveDraftCover, saveDraftAssets, clearDraft } = useDraftCollection(chainParam || 'solana', typeParam || 'generative');

    const currentChain = CHAINS[selectedChain];
    const chainSymbol = currentChain.symbol;
    const launchpadConfig = getLaunchpadConfig(selectedChain);

    // Wizard State
    const [mode, setMode] = useState<CollectionMode>(resolveFlowType(typeParam) === "1of1" ? "1of1" : "basic");
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isDeploying, setIsDeploying] = useState(false);

    const flowType = resolveFlowType(typeParam);
    const is1of1 = mode === "1of1" || flowType === "1of1";

    const STEPS = is1of1
        ? (launchpadConfig.modes["1of1"] || [])
        : (mode === "basic" ? launchpadConfig.modes.basic : launchpadConfig.modes.advanced) || [];
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
    const [targetSupply, setTargetSupply] = useState(100);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // 1/1 Mode: Artwork Data
    const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
    const [editionCounts, setEditionCounts] = useState<Record<string, number>>({});

    // Music Mode: Track Data
    const [tracks, setTracks] = useState<MusicTrack[]>([]);

    // Config Data
    const [phases, setPhases] = useState<LaunchpadPhase[]>(defaultPhases);
    const [treasuryWallet, setTreasuryWallet] = useState("");
    const [xrplTaxon, setXrplTaxon] = useState(0);
    const [xrplTransferFee, setXrplTransferFee] = useState(Math.round(royaltyPercent * 1000));

    useEffect(() => {
        setXrplTransferFee(Math.round(royaltyPercent * 1000));
    }, [royaltyPercent]);

    useEffect(() => {
        if (flowType === '1of1') {
            setMode('1of1');
        } else if (typeParam === 'advanced' || typeParam === 'generative') {
            setMode('advanced');
        } else {
            setMode('basic');
        }
    }, [typeParam, flowType]);

    useEffect(() => {
        const draft = loadDraft();
        if (draft) {
            setName(draft.name || '');
            setSymbol(draft.symbol || '');
            setDescription(draft.description || '');
            setRoyaltyPercent(draft.royaltyPercent ?? 5);
            setTargetSupply(draft.targetSupply ?? 100);
            setTreasuryWallet(draft.treasuryWallet || '');
            if (draft.phases?.length) setPhases(draft.phases);
            if (draft.currentStep > 0) setCurrentStep(draft.currentStep);
            if (draft.mode) setMode(draft.mode);
            if (draft.coverImageUrl) setCoverImage(draft.coverImageUrl);
            if (draft.xrplTaxon != null) setXrplTaxon(draft.xrplTaxon);
            if (draft.xrplTransferFee != null) setXrplTransferFee(draft.xrplTransferFee);
            if (draft.editionCounts) setEditionCounts(draft.editionCounts);
            toast.info('Draft restored — re-upload your asset files to continue');
        }
    }, [loadDraft]);

    // Auto-save draft on field changes
    useEffect(() => {
        if (!name && !symbol) return;
        saveDraft({
            name, symbol, description, royaltyPercent, targetSupply, mode, currentStep, treasuryWallet,
            phases: phases as any[],
            coverImageUrl: coverImage || undefined,
            xrplTaxon,
            xrplTransferFee,
            editionCounts: Object.keys(editionCounts).length > 0 ? editionCounts : undefined,
            folderAssetNames: folderAssets.length > 0 ? folderAssets.map(a => a.name) : undefined,
            artworkMeta: artworks.length > 0 ? artworks.map(a => ({ name: a.name, description: a.description, attributes: a.attributes })) : undefined,
        });
    }, [name, symbol, description, royaltyPercent, targetSupply, mode, currentStep, treasuryWallet, phases, coverImage, xrplTaxon, xrplTransferFee, editionCounts, folderAssets, artworks, saveDraft]);

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setCoverImage(reader.result as string);
            reader.readAsDataURL(file);
            // Persist cover to storage bucket for draft restoration
            saveDraftCover(file).then(url => {
                if (url) setCoverImage(url);
            });
        }
    };

    const handleAssetsLoaded = (assets: { name: string; uri: string; file: File; jsonFile?: File }[]) => {
        const errors = validateAssets(assets.flatMap(a => [{ name: a.file.name, file: a.file }, a.jsonFile ? { name: a.jsonFile.name, file: a.jsonFile } : null]).filter((x): x is AssetFile => x !== null));
        setValidationErrors(errors);
        if (errors.length === 0) {
            setFolderAssets(assets);
            toast.success(`${assets.length} assets packed!`);
        } else {
            toast.error(`Found ${errors.length} issues.`);
        }
    };

    const { resolveToGateway } = useIpfs();

    const handleDeploy = async () => {
        if (isDeploying) return;
        if (!name || !symbol) return toast.error("Please enter a name and symbol.");
        if (!address) return toast.error("Connect your wallet to launch.");

        setIsDeploying(true);
        let collectionId = "";

        try {
            // ── Step 0: Identify assets to process ──────────────────────────
            let assetsToUpload: { name: string; file: File; metadata: any }[] = [];

            if (is1of1) {
                assetsToUpload = artworks.map((art, i) => ({
                    name: art.name,
                    file: art.file!,
                    metadata: {
                        name: art.name,
                        description: art.description || description,
                        attributes: art.attributes || []
                    }
                }));
            } else if (flowType === 'music') {
                assetsToUpload = tracks.map((track, i) => ({
                    name: track.metadata.name || `${name} Track #${i + 1}`,
                    file: track.coverFile!,
                    metadata: track.metadata
                }));
            } else if (mode === 'advanced') {
                assetsToUpload = generatedAssets.map((asset, i) => ({
                    name: asset.name,
                    file: dataUrlToBlob(asset.preview) as File,
                    metadata: asset.metadata
                }));
            } else {
                assetsToUpload = folderAssets.map((asset, i) => ({
                    name: asset.name,
                    file: asset.file,
                    metadata: {
                        name: asset.name,
                        description: description,
                        attributes: []
                    }
                }));
            }

            if (assetsToUpload.length === 0) return toast.error("No assets ready for launch.");

            // ── Step 1: Initialize Database Entry ──────────────────────────
            toast.loading("Establishing provenance...", { id: 'deploy' });
            const { data: { user } } = await supabase.auth.getUser();

            const { data: collection, error: collErr } = await supabase
                .from("collections")
                .insert({
                    name,
                    symbol,
                    description,
                    chain: getDbChainValue(selectedChain, network as 'mainnet' | 'testnet'),
                    status: "draft",
                    total_supply: assetsToUpload.length,
                    creator_id: user?.id,
                    creator_address: address
                })
                .select('id')
                .single();

            if (collErr) throw collErr;
            collectionId = collection.id;

            // ── Step 2: Upload to Arweave (Permanent Storage) ─────────────
            toast.loading(`Securing ${assetsToUpload.length} items to Arweave...`, { id: 'deploy' });
            const itemLinks: { tokenID: string; arweaveUri: string; arweaveImageUri: string }[] = [];
            const batchSize = 5;

            for (let i = 0; i < assetsToUpload.length; i += batchSize) {
                const batch = assetsToUpload.slice(i, i + batchSize);
                await Promise.all(batch.map(async (asset, idx) => {
                    const tokenId = i + idx;

                    // Upload image to Arweave
                    const arweaveImageUri = await uploadToArweave(asset.file, { address, chainType: selectedChain, network });

                    const metadata = {
                        ...asset.metadata,
                        image: arweaveImageUri,
                    };

                    // Upload metadata to Arweave
                    const arweaveMetaUri = await uploadMetadataToArweave(metadata, { address, chainType: selectedChain, network });

                    itemLinks.push({
                        tokenID: tokenId.toString(),
                        arweaveUri: arweaveMetaUri,
                        arweaveImageUri
                    });
                }));
            }

            // ── Step 3: Persistence Finalized ───────────────────────────────
            toast.loading("Persistence secured on Arweave...", { id: 'deploy' });
            // Since Arweave uploads are individual, we don't need a folder CID here,
            // but we'll use the first metadata URI as a reference if needed.
            const primaryArweaveUri = itemLinks[0]?.arweaveUri || "";

            // ── Step 4: Chain-Specific Deployment ───────────────────────────
            toast.loading(`Deploying on ${currentChain.name}...`, { id: 'deploy' });
            let deployedAddress = "";

            if (selectedChain === 'solana') {
                const result = await solanaLaunch.deploySolanaCollection({
                    name,
                    symbol,
                    uri: primaryArweaveUri,
                    sellerFeeBasisPoints: Math.round(royaltyPercent * 100),
                    creators: [{ address, share: 100 }]
                });
                deployedAddress = result.address;

                // Create Candy Machine for Solana
                if (mode !== '1of1') {
                    const candyMachineItems = itemLinks.map((item, i) => ({
                        name: `${name} #${i + 1}`,
                        uri: item.arweaveUri
                    }));

                    await solanaLaunch.createLaunchpadCandyMachine(
                        deployedAddress,
                        assetsToUpload.length,
                        phases,
                        { name, symbol, uri: primaryArweaveUri, sellerFeeBasisPoints: Math.round(royaltyPercent * 100), creators: [{ address, share: 100 }] },
                        treasuryWallet,
                        primaryArweaveUri
                    );

                    // Insert individual items with Arweave URIs
                    await solanaLaunch.uploadJsonMetadataBatch(candyMachineItems);
                }
            } else if (selectedChain === 'xrpl') {
                const result = await xrplLaunch.deployXRPLCollection({
                    name,
                    symbol,
                    description,
                    baseUri: primaryArweaveUri,
                    taxon: xrplTaxon,
                    totalSupply: assetsToUpload.length
                });
                deployedAddress = result.address;

                const mintItems = itemLinks.map((item, i) => ({
                    name: `${name} #${i + 1}`,
                    uri: item.arweaveUri
                }));
                await xrplLaunch.mintXRPLItems(result.address, result.taxon, mintItems, xrplTransferFee);
            } else if (selectedChain === 'monad') {
                const result = await monadLaunch.createCollection({
                    name,
                    symbol,
                    metadataBaseUri: primaryArweaveUri, // Base Arweave Manifest or single metadata
                    totalSupply: assetsToUpload.length
                });
                deployedAddress = result.address;
            }

            // ── Step 5: Finalize DB ─────────────────────────────────────────
            await supabase.from("collections").update({
                contract_address: deployedAddress,
                status: "active",
                image_url: itemLinks[0]?.arweaveImageUri || ''
            }).eq('id', collectionId);

            toast.success("Successfully Launched!", { id: 'deploy' });
            clearDraft();
            navigate('/launchpad');

        } catch (e: any) {
            console.error("Launch Error:", e);
            toast.error(e.message || "Launch failed", { id: 'deploy' });
            if (collectionId) {
                await supabase.from("collections").delete().eq('id', collectionId).eq('status', 'draft');
            }
        } finally {
            setIsDeploying(false);
        }
    };

    const nextStep = () => {
        if (currentStep < maxStep) {
            setDirection(1);
            setCurrentStep(s => s + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(s => s - 1);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const assets = await generateAssets(layers, { collectionName: name, collectionSymbol: symbol, description, totalSupply: targetSupply, allowDuplicates: false }, (current, total) => setGenerationProgress({ current, total }));
            setGeneratedAssets(assets);
            toast.success("Generated!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadZip = async () => {
        setIsDownloadingZip(true);
        try {
            const zipBlob = await bundleAssetsAsZip(
                generatedAssets.map((a, i) => ({
                    id: i + 1,
                    traits: a.traits.map(t => ({
                        layerId: t.layer,
                        layerName: t.layer,
                        traitId: t.trait,
                        traitName: t.trait,
                        imageUrl: a.preview
                    }))
                })),
                name,
                description,
                selectedChain,
                1024, // Resolution
                (status, progress) => { console.log(status); setDownloadProgress(progress); }
            );
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "collection.zip";
            a.click();
            toast.success("Downloaded!");
        } catch (err: any) {
            toast.error("Export failed");
        } finally {
            setIsDownloadingZip(false);
        }
    };

    const variants = {
        enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d < 0 ? 50 : -50, opacity: 0 }),
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 pt-16 flex flex-col md:flex-row overflow-hidden">
                {/* CONFIG PANEL */}
                <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col border-r border-border bg-card/50 h-[calc(100vh-64px)]">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/launchpad')} className="-ml-2 mb-2 text-muted-foreground">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <h1 className="text-2xl font-bold gradient-text">Collection Setup</h1>
                    </div>

                    <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-muted/10 border-b border-border/50">
                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            return (
                                <button
                                    key={step.id}
                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap", currentStep === step.id ? "bg-primary/20 border-primary text-primary" : "opacity-40")}
                                >
                                    <Icon className="w-3 h-3" />
                                    <span>{step.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentStep}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="space-y-8"
                            >
                                {currentStep === 0 && !is1of1 && <ModeSelector mode={mode} onModeChange={setMode} />}
                                {((is1of1 && currentStep === 0) || (!is1of1 && currentStep === 1)) && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <Label>Cover Image</Label>
                                            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 hover:bg-white/5 text-center cursor-pointer relative">
                                                <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCoverUpload} />
                                                {coverImage ? <img src={coverImage} className="max-h-48 mx-auto rounded" alt="Cover" /> : <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />}
                                            </div>
                                        </div>
                                        <div className="space-y-3"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3"><Label>Symbol</Label><Input value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
                                            <div className="space-y-3"><Label>Royalty %</Label><Input type="number" value={royaltyPercent} onChange={e => setRoyaltyPercent(Number(e.target.value))} /></div>
                                        </div>
                                        <div className="space-y-3"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
                                    </div>
                                )}
                                {is1of1 && currentStep === 1 && <ArtworkUploader artworks={artworks} onArtworksChange={setArtworks} collectionType="one_of_one" creatorId={address || 'anonymous'} chainSymbol={chainSymbol} />}
                                {is1of1 && currentStep === 2 && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold">Editions</h3>
                                        {artworks.map(art => (
                                            <div key={art.id} className="flex items-center gap-4 p-3 border rounded bg-card">
                                                <span className="flex-1">{art.name}</span>
                                                <Input type="number" value={editionCounts[art.id] || 1} onChange={e => setEditionCounts(prev => ({ ...prev, [art.id!]: Number(e.target.value) }))} className="w-20" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!is1of1 && currentStep === 2 && (mode === "basic" ? <FolderUploader onAssetsLoaded={handleAssetsLoaded} /> : <LayerManager layers={layers} onLayersChange={setLayers} />)}
                                {!is1of1 && mode === "advanced" && currentStep === 3 && <TraitRarityEditor layers={layers} onLayersChange={setLayers} />}
                                {!is1of1 && mode === "advanced" && currentStep === 4 && (
                                    <div className="space-y-6 text-center py-10">
                                        <h3 className="text-xl font-bold">Generation</h3>
                                        <Input type="number" value={targetSupply} onChange={e => setTargetSupply(Number(e.target.value))} />
                                        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                                            {isGenerating ? `Generating ${generationProgress.current}/${generationProgress.total}` : "Generate NFTs"}
                                        </Button>
                                    </div>
                                )}
                                {mode === "music" && currentStep === 1 && <MusicArtworkUploader tracks={tracks} onTracksChange={setTracks} />}
                                {mode === "music" && currentStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                            <h3 className="font-bold mb-1">Track Customization</h3>
                                            <p className="text-xs text-muted-foreground">Adjust metadata for your tracks.</p>
                                        </div>
                                        <div className="space-y-3">
                                            {tracks.map((track, i) => (
                                                <div key={track.id} className="flex items-center gap-4 p-3 border rounded bg-card">
                                                    <img src={track.coverPreview} className="w-10 h-10 rounded object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{track.metadata.name || `Track ${i + 1}`}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{track.metadata.artist || 'No artist'}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {track.metadata.genre || 'No genre'}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {((is1of1 && currentStep === 3) || (mode === "music" && currentStep === 3) || (!is1of1 && mode !== "music" && (mode === "basic" ? currentStep === 3 : currentStep === 5))) && (
                                    <div className="space-y-6">
                                        {selectedChain === 'xrpl' ? <XRPLConfigurator taxon={xrplTaxon} onTaxonChange={setXrplTaxon} transferFee={xrplTransferFee} onTransferFeeChange={setXrplTransferFee} /> : <GuardConfigurator phase={phases[0]} onChange={u => setPhases(p => [{ ...p[0], ...u }])} chainSymbol={chainSymbol} />}
                                        <Separator />
                                        <div className="space-y-3">
                                            <Label>Treasury Wallet</Label>
                                            <Input value={treasuryWallet} onChange={e => setTreasuryWallet(e.target.value)} placeholder="0x... / Address" />
                                        </div>
                                    </div>
                                )}
                                {((is1of1 && currentStep === 4) || (mode === "music" && currentStep === 4) || (!is1of1 && mode !== "music" && (mode === "basic" ? currentStep === 4 : currentStep === 6))) && (
                                    <div className="space-y-6 text-center py-10">
                                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto"><Rocket className="w-10 h-10" /></div>
                                        <h2 className="text-2xl font-bold">Ready to Launch!</h2>
                                        <LaunchpadTools config={launchpadConfig} theme={theme} />
                                        <Button onClick={handleDeploy} disabled={isDeploying} className="w-full h-16 text-xl font-bold mt-8">
                                            {isDeploying ? "Deploying..." : "Launch Collection"}
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0 || isDeploying} className="flex-1">Back</Button>
                        <Button onClick={nextStep} disabled={currentStep === maxStep || isDeploying} className="flex-1">Next</Button>
                    </div>
                </div>

                {/* PREVIEW PANEL */}
                <div className="hidden md:flex flex-1 bg-muted/20 flex-col overflow-y-auto p-12">
                    <div className="max-w-xl mx-auto w-full space-y-12">
                        <LaunchpadPreview
                            name={name || "Collection"}
                            description={description}
                            coverImage={coverImage}
                            itemsAvailable={is1of1 ? artworks.length : (mode === 'basic' ? folderAssets.length : targetSupply)}
                            phases={phases}
                            activePhaseIndex={0}
                            selectedChain={selectedChain}
                        />
                        {(folderAssets.length > 0 || generatedAssets.length > 0 || artworks.length > 0 || tracks.length > 0) && (
                            <div className="grid grid-cols-4 gap-2">
                                {(mode === 'music' ? tracks.map(t => ({ preview: t.coverPreview })) : (is1of1 ? artworks : (mode === 'basic' ? folderAssets : generatedAssets))).slice(0, 12).map((a, i) => (
                                    <div key={i} className="aspect-square rounded overflow-hidden bg-muted border border-border">
                                        <img src={'preview' in a ? a.preview : (a.file ? URL.createObjectURL(a.file) : '')} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
