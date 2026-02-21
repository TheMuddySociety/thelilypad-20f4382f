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
} from "lucide-react";
import { toast } from "sonner";
import { FolderUploader } from "@/components/launchpad/FolderUploader";
import { GuardConfigurator } from "@/components/launchpad/GuardConfigurator";
import { LaunchpadPreview } from "@/components/launchpad/LaunchpadPreview";
import { ModeSelector } from "@/components/launchpad/ModeSelector";
import { LayerManager, Layer } from "@/components/launchpad/LayerManager";
import { TraitRarityEditor } from "@/components/launchpad/TraitRarityEditor";
import { ArtworkUploader, type ArtworkItem } from "@/components/launchpad/ArtworkUploader";
import { useWallet } from "@/providers/WalletProvider";
import { useSolanaLaunch, LaunchpadPhase } from "@/hooks/useSolanaLaunch";
import { useXRPLLaunch } from "@/hooks/useXRPLLaunch";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { validateAssets, AssetFile } from "@/utils/assetValidator";
import { generateAssets, GeneratedAsset } from "@/lib/assetGenerator";
import { SupportedChain, CHAINS } from "@/config/chains";
import { ChainIcon } from "@/components/launchpad/ChainSelector";
import { getCollectionStorageInfo, getChainRootUri } from "@/lib/payloadMapper";
import { uploadFolderToPinata, uploadFileToPinata, getIpfsUri, getIpfsGatewayUrl, isPinataConfigured, dataUrlToBlob } from "@/lib/pinataUpload";
import { useChain } from "@/providers/ChainProvider";
import { useChainTheme } from "@/hooks/useChainTheme";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "collection-draft";

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

export default function LaunchpadCreate() {
    const { chain: chainParam, type: typeParam } = useParams<{ chain: string; type: string }>();
    const navigate = useNavigate();
    const { address, network } = useWallet();
    const { chain } = useChain();
    const { theme } = chain;

    // Use the chain from URL, or default to the provider's chain
    const selectedChain = (chainParam as SupportedChain) || 'solana';

    // Apply theme
    useChainTheme(true);

    // Chain hooks
    const solanaLaunch = useSolanaLaunch();
    const xrplLaunch = useXRPLLaunch();

    // Get current chain config
    const currentChain = CHAINS[selectedChain];
    const chainSymbol = currentChain.symbol;

    // Check if full deployment is supported for this chain
    const isChainFullySupported = selectedChain === 'solana' || selectedChain === 'xrpl' || selectedChain === 'monad';

    // Resolve collection flow type from tile selection
    const flowType = resolveFlowType(typeParam);
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
    const [targetSupply, setTargetSupply] = useState(100);

    // 1/1 Mode: Artwork Data
    const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
    const [editionCounts, setEditionCounts] = useState<Record<string, number>>({});

    // Config Data
    const [phases, setPhases] = useState<LaunchpadPhase[]>(defaultPhases);
    const [treasuryWallet, setTreasuryWallet] = useState("");

    // Pre-select mode from type param
    useEffect(() => {
        if (is1of1) {
            setMode('basic');
        } else if (typeParam === 'advanced' || typeParam === 'generative') {
            setMode('advanced');
        } else {
            setMode('basic');
        }
    }, [typeParam, is1of1]);

    // Draft auto-save
    useEffect(() => {
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
    }, [name, symbol, description, currentStep, layers, phases, folderAssets.length, targetSupply, royaltyPercent, coverImage]);

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setCoverImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAssetsLoaded = (assets: { name: string; uri: string; file: File; jsonFile?: File }[]) => {
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

    const handleDeploy = async () => {
        if (!name || !symbol) return toast.error("Please fill in basic info.");
        if (selectedChain === 'solana' && !coverFile) return toast.error("Please upload a cover image.");
        if (folderAssets.length === 0 && !is1of1 && mode === "basic") return toast.error("Please upload assets.");
        if (generatedAssets.length === 0 && !is1of1 && mode === "advanced") return toast.error("Please generate assets.");
        if (artworks.length === 0 && is1of1) return toast.error("Please upload artworks.");

        try {
            toast.loading(`Initializing ${currentChain.name} deployment...`, { id: 'deploy-status' });

            let { data: { user } } = await supabase.auth.getUser();

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

                if (authError) throw new Error("Could not establish a secure session.");
                user = authData.user;
            }

            if (!user) throw new Error("User session not found.");

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
                    collection_type: is1of1 ? "one_of_one" : "generative",
                    total_supply: is1of1 ? artworks.reduce((sum, a) => sum + (editionCounts[a.id] || 1), 0) : (mode === 'advanced' ? generatedAssets.length || targetSupply : folderAssets.length || targetSupply),
                    phases: phases as any,
                    royalty_percent: royaltyPercent,
                })
                .select('id')
                .single();

            if (placeholderError) throw new Error("Failed to initialize collection record.");

            const collectionId = placeholderCollection.id;
            const storageInfo = getCollectionStorageInfo(collectionId);
            const baseUri = getChainRootUri(selectedChain, collectionId);

            // 1. Upload Assets if in Basic Mode
            if (mode === "basic" && folderAssets.length > 0) {
                toast.loading(`Uploading ${folderAssets.length} assets...`, { id: 'deploy-status' });
                const batchSize = 5;
                for (let i = 0; i < folderAssets.length; i += batchSize) {
                    const batch = folderAssets.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (asset, index) => {
                        const tokenId = i + index;
                        const fileExt = asset.file.name.split('.').pop() || 'png';
                        await supabase.storage.from('nfts').upload(`${collectionId}/${tokenId}.${fileExt}`, asset.file, { upsert: true });
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
                }
            }

            // 2. Chain-Specific On-Chain Deployment
            if (selectedChain === 'solana') {
                toast.loading("Uploading cover...", { id: 'deploy-status' });
                const imageUri = await solanaLaunch.uploadFile(coverFile!);
                const collMetadata = { name, symbol, description, image: imageUri, properties: { files: [{ uri: imageUri, type: coverFile!.type }], category: "image" } };
                const collMetadataUri = await solanaLaunch.uploadMetadata(collMetadata);

                toast.loading("Deploying Solana Collection...", { id: 'deploy-status' });
                const collection = await solanaLaunch.deploySolanaCollection({ name, symbol, uri: collMetadataUri, sellerFeeBasisPoints: royaltyPercent * 100, creators: [{ address: address!, share: 100 }] });
                if (!collection) throw new Error("Collection deployment failed.");

                toast.loading("Creating Candy Machine...", { id: 'deploy-status' });
                const cm = await solanaLaunch.createLaunchpadCandyMachine(collection.address, (folderAssets.length || targetSupply), phases, { name, symbol, uri: collMetadataUri, sellerFeeBasisPoints: royaltyPercent * 100, creators: [] }, treasuryWallet || undefined, baseUri);
                if (!cm) throw new Error("Candy Machine creation failed.");

                const itemsToInsert = (mode === "basic" ? folderAssets : generatedAssets).map((_, idx) => ({ name: `${name} #${idx + 1}`, uri: `${idx}.json` }));
                await solanaLaunch.insertItemsToCandyMachine(cm.address, itemsToInsert);

                await supabase.from("collections").update({ contract_address: collection.address, image_url: imageUri, status: "active" }).eq('id', collectionId);
            } else if (selectedChain === 'xrpl') {
                const totalSupplyCount = mode === 'advanced' ? (generatedAssets.length || targetSupply) : folderAssets.length;

                if (isPinataConfigured()) {
                    // ── IPFS Upload Flow ──────────────────────────────────────
                    toast.loading(`Uploading ${totalSupplyCount} images to IPFS...`, { id: 'deploy-status' });

                    // Build image files array for folder upload
                    const imageFiles: { path: string; content: Blob }[] = [];
                    if (mode === 'advanced' && generatedAssets.length > 0) {
                        for (let i = 0; i < generatedAssets.length; i++) {
                            const asset = generatedAssets[i];
                            if (asset.preview) {
                                imageFiles.push({ path: `${i}.png`, content: dataUrlToBlob(asset.preview) });
                            }
                        }
                    } else {
                        for (let i = 0; i < folderAssets.length; i++) {
                            imageFiles.push({ path: `${i}.png`, content: folderAssets[i].file });
                        }
                    }

                    // Pin images folder
                    const imagesFolderPin = await uploadFolderToPinata(imageFiles, `${name}-images`);
                    const imageFolderCid = imagesFolderPin.IpfsHash;
                    console.log('[XRPL] Images pinned:', imageFolderCid);

                    // Build XLS-20 metadata with IPFS image URIs
                    toast.loading('Building metadata with IPFS URIs...', { id: 'deploy-status' });
                    const metadataFiles: { path: string; content: Blob }[] = [];
                    for (let i = 0; i < totalSupplyCount; i++) {
                        const traits = mode === 'advanced' && generatedAssets[i]
                            ? generatedAssets[i].metadata.attributes
                            : [];
                        const xrplMetadata = {
                            schema: 'ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm',
                            nftType: 'art.v0',
                            name: `${name} #${i + 1}`,
                            description: description || `${name} NFT #${i + 1}`,
                            image: getIpfsUri(imageFolderCid, `${i}.png`),
                            image_mimetype: 'image/png',
                            attributes: traits,
                        };
                        metadataFiles.push({
                            path: `${i}.json`,
                            content: new Blob([JSON.stringify(xrplMetadata, null, 2)], { type: 'application/json' }),
                        });
                    }

                    // Pin metadata folder
                    toast.loading('Pinning metadata to IPFS...', { id: 'deploy-status' });
                    const metadataFolderPin = await uploadFolderToPinata(metadataFiles, `${name}-metadata`);
                    const metadataCid = metadataFolderPin.IpfsHash;
                    console.log('[XRPL] Metadata pinned:', metadataCid);

                    // Deploy XRPL collection with IPFS base URI
                    const ipfsBaseUri = getIpfsUri(metadataCid);
                    toast.loading('Deploying XRPL Collection...', { id: 'deploy-status' });
                    const xrplRes = await xrplLaunch.deployXRPLCollection({ name, symbol, description, totalSupply: totalSupplyCount, baseUri: ipfsBaseUri });

                    // Use IPFS gateway URL for collection card thumbnail
                    const displayImageUrl = coverImage || getIpfsGatewayUrl(imageFolderCid, '0.png');
                    await supabase.from('collections').update({
                        contract_address: xrplRes.address,
                        image_url: displayImageUrl,
                        status: 'active',
                        metadata: { imageCid: imageFolderCid, metadataCid, storage: 'ipfs' },
                    }).eq('id', collectionId);
                } else {
                    // ── Supabase Fallback (no Pinata JWT) ─────────────────────
                    toast.loading('Setting XRPL Domain...', { id: 'deploy-status' });
                    const xrplRes = await xrplLaunch.deployXRPLCollection({ name, symbol, description, totalSupply: totalSupplyCount, baseUri });
                    await supabase.from('collections').update({ contract_address: xrplRes.address, image_url: coverImage || storageInfo.itemImageUri(0, 'png'), status: 'active' }).eq('id', collectionId);
                }
            }

            toast.success(`${currentChain.name} Launch Successful!`, { id: 'deploy-status' });
            navigate('/launchpad');

        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Deployment failed", { id: 'deploy-status' });
        }
    };

    const nextStep = () => {
        if (is1of1) {
            if (currentStep === 0 && (!name || !symbol)) return toast.error("Name and Symbol are required");
            if (currentStep === 1 && artworks.length === 0) return toast.error("Please upload at least one artwork");
            setDirection(1);
            setCurrentStep(s => Math.min(s + 1, maxStep));
            return;
        }
        if (currentStep === 0) {
            setDirection(1);
            setCurrentStep(1);
            return;
        }
        if (currentStep === 1 && (!name || !symbol)) return toast.error("Name and Symbol are required");
        if (mode === "basic" && currentStep === 2 && folderAssets.length === 0) return toast.error("Please upload assets first");
        if (mode === "advanced" && currentStep === 2 && layers.length === 0) return toast.error("Please add at least one layer");
        if (mode === "advanced" && currentStep === 4 && generatedAssets.length === 0) return toast.error("Please generate assets first");
        setDirection(1);
        setCurrentStep(s => Math.min(s + 1, maxStep));
    };

    const prevStep = () => {
        setDirection(-1);
        setCurrentStep(s => Math.max(s - 1, 0));
    };

    const handleGenerate = async () => {
        if (layers.length === 0) return toast.error("Please add at least one layer");
        setIsGenerating(true);
        setGenerationProgress({ current: 0, total: targetSupply });
        try {
            const assets = await generateAssets(layers, {
                collectionName: name, collectionSymbol: symbol, description, totalSupply: targetSupply, allowDuplicates: false,
            }, (current, total) => setGenerationProgress({ current, total }));
            setGeneratedAssets(assets);
            toast.success(`Generated ${assets.length} unique assets!`);
        } catch (err: any) {
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
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 pt-16 flex flex-col md:flex-row overflow-hidden">
                {/* LEFT PANEL: CONFIGURATION */}
                <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col border-r border-border bg-card/50 h-[calc(100vh-64px)]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/launchpad')} className="-ml-2 mb-2 text-muted-foreground">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Launchpad
                        </Button>
                        <div className="flex items-center gap-2 mb-1" style={{ color: theme.primaryColor }}>
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-mono uppercase tracking-widest">
                                {is1of1 ? '1/1 & Limited Editions' : `Create ${currentChain.name} Collection`}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold gradient-text">
                            {is1of1 ? 'Artwork Launchpad' : 'Collection Setup'}
                        </h1>
                    </div>

                    <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-muted/10 border-b border-border/50">
                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isDone = currentStep > step.id;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => isDone && setCurrentStep(step.id)}
                                    disabled={!isDone}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap"
                                    style={isActive ? { backgroundColor: `${theme.primaryColor}20`, borderColor: theme.primaryColor, color: theme.primaryColor } : isDone ? { backgroundColor: `${theme.secondaryColor}10`, borderColor: `${theme.secondaryColor}30`, color: theme.secondaryColor } : { borderColor: 'transparent', opacity: 0.4 }}
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
                                            <Label>Select Cover Image</Label>
                                            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 hover:bg-white/5 transition-colors text-center cursor-pointer relative group">
                                                <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCoverUpload} accept="image/*" />
                                                {coverImage ? <img src={coverImage} className="max-h-64 mx-auto rounded-md shadow-lg" alt="Cover" /> : <div className="space-y-3 text-muted-foreground"><ImageIcon className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">Drag & drop or click to upload cover</p></div>}
                                            </div>
                                        </div>
                                        <div className="space-y-3"><Label>Collection Name</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-12" placeholder="e.g. Galactic Apes" /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3"><Label>Symbol</Label><Input value={symbol} onChange={e => setSymbol(e.target.value)} className="font-mono uppercase" placeholder="APE" maxLength={10} /></div>
                                            <div className="space-y-3"><Label>Royalty %</Label><Input type="number" value={royaltyPercent} onChange={e => setRoyaltyPercent(Number(e.target.value))} /></div>
                                        </div>
                                        <div className="space-y-3"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px]" placeholder="Tell your story..." /></div>
                                    </div>
                                )}
                                {is1of1 && currentStep === 1 && <ArtworkUploader artworks={artworks} onArtworksChange={setArtworks} collectionType="one_of_one" creatorId={address || 'anonymous'} maxItems={100} chainSymbol={chainSymbol} />}
                                {!is1of1 && currentStep === 2 && (mode === "basic" ? <FolderUploader onAssetsLoaded={handleAssetsLoaded} /> : <LayerManager layers={layers} onLayersChange={setLayers} />)}
                                {!is1of1 && mode === "advanced" && currentStep === 3 && <TraitRarityEditor layers={layers} onLayersChange={setLayers} />}
                                {!is1of1 && mode === "advanced" && currentStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label>Target Supply</Label>
                                            <Input type="number" value={targetSupply} onChange={e => setTargetSupply(Number(e.target.value))} min={1} max={10000} />
                                            <p className="text-xs text-muted-foreground">How many unique NFTs to generate from your layers.</p>
                                        </div>
                                        {generatedAssets.length > 0 ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="secondary">{generatedAssets.length} Generated</Badge>
                                                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                                                        {isGenerating ? 'Regenerating...' : 'Regenerate'}
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                                                    {generatedAssets.slice(0, 20).map((asset, i) => (
                                                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                                                            <img src={asset.preview} alt={asset.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                    {generatedAssets.length > 20 && (
                                                        <div className="aspect-square rounded-lg flex items-center justify-center border border-border bg-muted/50 text-muted-foreground text-sm font-medium">
                                                            +{generatedAssets.length - 20} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <Button onClick={handleGenerate} disabled={isGenerating || layers.length === 0} className="w-full h-14 text-lg" style={{ background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})` }}>
                                                {isGenerating ? (
                                                    <span className="flex items-center gap-2"><Wand2 className="w-5 h-5 animate-spin" /> Generating {generationProgress.current}/{generationProgress.total}...</span>
                                                ) : (
                                                    <span className="flex items-center gap-2"><Wand2 className="w-5 h-5" /> Generate {targetSupply} NFTs</span>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )}
                                {((!is1of1 && mode === "basic" && currentStep === 3) || (!is1of1 && mode === "advanced" && currentStep === 5) || (is1of1 && currentStep === 3)) && (
                                    <GuardConfigurator phase={phases[0]} onChange={(updates) => setPhases(prev => [{ ...prev[0], ...updates }, ...prev.slice(1)])} chainSymbol={chainSymbol} />
                                )}
                                {currentStep === maxStep && (
                                    <div className="space-y-6 text-center py-6">
                                        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary/10 shadow-glow"><ChainIcon chain={selectedChain} className="w-12 h-12" /></div>
                                        <h2 className="text-3xl font-bold">Ready for Liftoff?</h2>
                                        <div className="bg-muted/40 rounded-2xl p-6 text-left space-y-3 border border-border">
                                            <div className="flex justify-between"><span className="text-muted-foreground">Chain</span><span className="font-medium">{currentChain.name}</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Supply</span><span className="font-mono">{is1of1 ? artworks.length : (folderAssets.length || targetSupply)} Items</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-mono">{phases[0].price} {chainSymbol}</span></div>
                                        </div>
                                        <Button onClick={handleDeploy} className="w-full h-16 text-xl font-bold shadow-2xl" style={{ background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})` }}>Launch Collection</Button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="px-6 py-4 border-t border-border flex justify-between bg-card text-xs">
                        <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
                        {currentStep < maxStep && <Button size="sm" onClick={nextStep} style={{ background: theme.primaryColor, color: 'white' }}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                    </div>
                </div>

                {/* RIGHT PANEL: PREVIEW */}
                <div className="hidden md:flex flex-1 bg-muted/20 items-center justify-center p-12 overflow-y-auto">
                    <div className="w-full max-w-lg">
                        <div className="mb-8 text-center"><Badge variant="outline" className="mb-2">Live Preview</Badge></div>
                        <LaunchpadPreview
                            name={name || "Your Collection Name"}
                            description={description || "Your collection description will appear here..."}
                            coverImage={coverImage}
                            itemsAvailable={is1of1 ? artworks.length : (folderAssets.length || targetSupply)}
                            phases={phases}
                            activePhaseIndex={0}
                            selectedChain={selectedChain}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
