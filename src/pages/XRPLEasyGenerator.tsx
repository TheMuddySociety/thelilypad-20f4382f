import React, { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Rocket,
    Sparkles,
    Upload,
    Check,
    X,
    Loader2,
    ChevronRight,
    ArrowLeft,
    Info,
    ShieldCheck,
    Zap,
    Cloud,
    Image as ImageIcon,
    Database,
    Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useXRPLLaunch } from "@/hooks/useXRPLLaunch";
// Note: dataUrlToBlob kept for potential future use; no direct IPFS uploads in the creator flow
import JSZip from "jszip";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
// storageClient removed — Arweave-only flow
import { useSEO } from "@/hooks/useSEO";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { setStoredChain, getDbChainValue } from "@/config/chains";
import { bundleAssetsAsZip, GeneratedNFT } from "@/lib/assetBundler";
// getCollectionStorageInfo removed — Arweave-only flow
import { triggerCollectionDownload } from "@/lib/nftStorageService";
import { uploadToArweave, uploadMetadataToArweave, uploadBatchToArweave, BatchUploadItem } from "@/integrations/irys/client";
import { resolveIPFS } from "@/integrations/nftstorage/client";
import { XRPLDeployResult } from "@/chains";

export default function XRPLEasyGenerator() {
    const navigate = useNavigate();
    const { address, isConnected, network } = useWallet();
    const { isAdmin } = useAuth();
    const { deployXRPLCollection, mintXRPLItems, isDeploying, isMinting } = useXRPLLaunch();

    useSEO({
        title: "Easy XRP NFT Generator | The Lily Pad",
        description: "The simplest way to create and launch XLS-20 NFT collections on XRP Ledger."
    });

    // State
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [collectionId, setCollectionId] = useState("");
    const [deployedResult, setDeployedResult] = useState<XRPLDeployResult | null>(null);
    const [itemLinks, setItemLinks] = useState<{ tokenID: string; arweaveUri: string; arweaveImageUri: string; arweaveThumbUri: string; arweavePreviewUri: string }[]>([]);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [transferFee, setTransferFee] = useState(5);
    const [metadataMap, setMetadataMap] = useState<Record<string, any>>({});

    // Handlers
    const MAX_FILE_SIZE_MB = 100;
    const MIN_RECOMMENDED_RES = 2000;
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selected = Array.from(e.target.files);

        // Handle ZIP uploads
        if (selected.length === 1 && selected[0].name.endsWith('.zip')) {
            toast.loading("Extracting ZIP collection...", { id: "extract-zip" });
            try {
                const zip = await JSZip.loadAsync(selected[0]);
                const extractedFiles: File[] = [];

                // Look for images folder or flat images
                const imagePromises: Promise<void>[] = [];
                const localMetadataMap: Record<string, any> = {};

                zip.forEach((relativePath, file) => {
                    if (file.dir) return;

                    const fileName = relativePath.split('/').pop() || relativePath;
                    const baseName = fileName.split('.').slice(0, -1).join('.');

                    // Image handling
                    if (relativePath.endsWith('.png') || relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg')) {
                        const promise = file.async("blob").then((blob) => {
                            const newFile = new File([blob], fileName, { type: "image/png" });
                            if (newFile.size <= MAX_FILE_SIZE_MB * 1024 * 1024) {
                                extractedFiles.push(newFile);
                            }
                        });
                        imagePromises.push(promise);
                    }

                    // Metadata handling (JSON)
                    if (relativePath.endsWith('.json')) {
                        const promise = file.async("string").then((text) => {
                            try {
                                const json = JSON.parse(text);
                                localMetadataMap[baseName] = json;
                            } catch (e) {
                                console.warn(`Failed to parse metadata: ${fileName}`);
                            }
                        });
                        imagePromises.push(promise);
                    }
                });

                await Promise.all(imagePromises);

                // Sort by filename number if possible
                extractedFiles.sort((a, b) => {
                    const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
                    const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
                    return numA - numB;
                });

                if (extractedFiles.length > 0) {
                    setFiles(extractedFiles);
                    setMetadataMap(localMetadataMap);
                    toast.success(`Extracted ${extractedFiles.length} images ${Object.keys(localMetadataMap).length > 0 ? "and metadata " : ""}from ZIP`, { id: "extract-zip" });
                } else {
                    toast.error("No valid images found in ZIP", { id: "extract-zip" });
                }
            } catch (err) {
                toast.error("Failed to extract ZIP", { id: "extract-zip" });
            }
            return;
        }

        const oversized = selected.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
        if (oversized.length > 0) {
            toast.error(`${oversized.length} file(s) exceed ${MAX_FILE_SIZE_MB}MB limit and were removed.`);
            setFiles(selected.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024));
        } else {
            setFiles(selected);

            // Check first file for resolution as a sample/recommendation
            if (selected.length > 0) {
                const img = new Image();
                img.onload = () => {
                    if (img.width < MIN_RECOMMENDED_RES && img.height < MIN_RECOMMENDED_RES) {
                        toast.info(`Note: For high-quality art, 2000px+ is recommended. Your sample image is ${img.width}x${img.height}px.`, {
                            duration: 5000,
                        });
                    }
                };
                img.src = URL.createObjectURL(selected[0]);
            }
        }
    };

    const createCollection = async () => {
        if (!name || !symbol) {
            toast.error("Name and Symbol are required");
            return;
        }

        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        setIsUploading(true);
        setUploadProgress(5);

        try {
            // 1. Get current user & reserve ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication required to save collection");

            toast.loading("Reserving collection ID...", { id: 'easy-mint' });
            const { data: placeholderCollection, error: placeholderError } = await supabase
                .from("collections")
                .insert({
                    name,
                    symbol,
                    description,
                    chain: getDbChainValue('xrpl', network as 'mainnet' | 'testnet'),
                    total_supply: files.length,
                    status: "upcoming",
                    creator_id: user.id,
                    creator_address: address
                })
                .select('id')
                .single();

            if (placeholderError) throw placeholderError;
            const collectionId = placeholderCollection.id;

            setUploadProgress(15);
            await new Promise((r) => setTimeout(r, 0)); // yield to UI

            // 2. Upload images + metadata JSON to Arweave — batch-optimised
            toast.loading(`Securing ${files.length} items to Arweave…`, { id: 'easy-mint' });

            const batchItems: BatchUploadItem[] = files.map((file, i) => {
                const baseName = file.name.split('.').slice(0, -1).join('.');
                const importedMetadata = metadataMap[baseName] || metadataMap[i.toString()] || metadataMap[(i + 1).toString()];

                return {
                    file,
                    buildMetadata: (arweaveImageUri: string, thumbUri?: string, previewUri?: string) => ({
                        schema: "ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm",
                        nftType: "art.v0",
                        name: importedMetadata?.name || `${name} #${i + 1}`,
                        description: importedMetadata?.description || description,
                        image: arweaveImageUri,
                        ...(thumbUri && thumbUri !== arweaveImageUri ? { thumbnail: thumbUri } : {}),
                        ...(previewUri && previewUri !== arweaveImageUri ? { preview: previewUri } : {}),
                        attributes: importedMetadata?.attributes || importedMetadata?.traits || [],
                        collection: { name: name, family: symbol },
                    }),
                };
            });

            const { items: uploadResults, manifestUri } = await uploadBatchToArweave(
                batchItems,
                { address, chainType: 'xrpl', network },
                (completed, total, status) => {
                    setUploadProgress(15 + Math.round((completed / total) * 45));
                    toast.loading(status, { id: 'easy-mint' });
                },
                25, // concurrency
                true, // enable thumbnails
                [{ name: "Collection-Name", value: name }, { name: "Collection-Symbol", value: symbol }] // custom tags
            );

            const localItemLinks = uploadResults.map((r) => ({
                tokenID: r.tokenId.toString(),
                arweaveUri: r.arweaveUri,
                arweaveImageUri: r.arweaveImageUri,
                arweaveThumbUri: r.arweaveThumbUri,
                arweavePreviewUri: r.arweavePreviewUri,
            }));

            // 3. Collection Assets Uploaded
            setUploadProgress(60);
            await new Promise((r) => setTimeout(r, 0)); // yield to UI
            toast.loading("Assets successfully hosted...", { id: 'easy-mint' });

            setCollectionId(collectionId);
            setItemLinks(localItemLinks);

            // 4. Deploy Collection — use first Arweave URI as baseUri
            setUploadProgress(80);
            await new Promise((r) => setTimeout(r, 0)); // yield to UI
            toast.loading("Setting up XRPL Collection...", { id: 'easy-mint' });

            const baseUri = localItemLinks[0]?.arweaveUri || "";

            const result = await deployXRPLCollection({
                name,
                symbol,
                description,
                totalSupply: files.length,
                baseUri
            });

            setDeployedResult(result);

            // Update collection record with final results
            const primaryArweaveUri = localItemLinks[0]?.arweaveUri || "";
            const firstArweaveImage = localItemLinks[0]?.arweavePreviewUri || localItemLinks[0]?.arweaveImageUri || "";
            const { error: finalUpdateErr } = await supabase.from("collections").update({
                contract_address: result.address,
                status: "live",
                image_url: firstArweaveImage,
            }).eq('id', collectionId);

            setUploadProgress(100);
            setStep(3);
            toast.success("Collection Created!", { id: 'easy-mint' });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create collection", { id: 'easy-mint' });
            // Clean up orphaned draft collection to avoid storage/DB bloat
            if (collectionId) {
                await supabase.from("collections").delete().eq('id', collectionId).eq('status', 'upcoming').then(() => {
                    console.log('[EasyGen] Cleaned up orphaned draft collection:', collectionId);
                });
            }
        } finally {
            setIsUploading(false);
        }
    };

    const launchNfts = async () => {
        if (!deployedResult || !collectionId) return; // collectionId is now the primary identifier

        // Resolve the collection ID from  DB (in case state was cleared)
        const { data: collData } = await supabase
            .from("collections")
            .select('id')
            .eq('contract_address', deployedResult.address)
            .single();
        const cid = collData?.id || collectionId;
        // storageInfo no longer needed — Arweave URIs stored in itemLinks

        try {
            toast.loading(`Minting ${files.length} NFTs...`, { id: 'easy-mint' });

            // Build items — each URI points to its Arweave-hosted metadata JSON
            const mintItems = itemLinks.map((item, i) => ({
                name: `${name} #${i + 1}`,
                uri: item.arweaveUri
            }));

            // mintXRPLItems now returns XRPLMintResult[] with real NFTokenIDs + tx hashes
            const mintResults = await mintXRPLItems(
                deployedResult.address,
                deployedResult.taxon,
                mintItems,
                Math.round(transferFee * 1000)
            );

            if (!mintResults || mintResults.length === 0) {
                throw new Error('Mint returned no results — check wallet connection and XRP balance.');
            }

            // Update the minted count and status in the database
            const finalCollectionId = collectionId || cid;
            await supabase.from("collections").update({
                minted: mintResults.length,
                status: "live"
            }).eq('id', finalCollectionId);

            // Index individual NFTs with real on-chain IDs so they show up in the gallery
            const { data: { session } } = await supabase.auth.getSession();
            const nftRecords = mintResults.map((res, i) => {
                const file = files[i];
                const ext = file?.name.split('.').pop() || 'png';
                return {
                    collection_id: finalCollectionId,
                    token_id: i,                              // sequential index for gallery ordering
                    attributes: { xrpl_nft_id: res.nfTokenId, description: description },
                    name: `${name} #${i + 1}`,
                    image_url: itemLinks[i]?.arweaveThumbUri || itemLinks[i]?.arweaveImageUri || '',
                    owner_address: deployedResult.address,
                    owner_id: session?.user?.id || '',
                    tx_hash: res.txHash,                     // real per-token tx hash
                    is_revealed: true,
                    minted_at: new Date().toISOString()
                };
            });
            await supabase.from("minted_nfts").insert(nftRecords);

            toast.success("Successfully Minted!", { id: 'easy-mint' });
            setStoredChain('xrpl');
            navigate("/launchpad");
        } catch (err: any) {
            toast.error(err.message || "Minting failed", { id: 'easy-mint' });
        }
    };

    const handleDownloadZip = async () => {
        if (files.length === 0 || !collectionId) {
            toast.error("Deploy the collection first before downloading.");
            return;
        }
        setIsDownloadingZip(true);
        try {
            await triggerCollectionDownload(
                collectionId,
                name || 'collection',
                files.length,
                'png',
                (current, total, status) => {
                    setUploadProgress(Math.round((current / total) * 100));
                    toast.loading(status, { id: 'zip-download' });
                },
                itemLinks.map(item => ({
                    imageUri: item.arweaveImageUri,
                    metadataUri: item.arweaveUri
                }))
            );
            toast.success("Collection ZIP downloaded!", { id: 'zip-download' });
        } catch (err: any) {
            toast.error("Failed to generate ZIP: " + err.message, { id: 'zip-download' });
        } finally {
            setIsDownloadingZip(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container max-w-4xl mx-auto pt-24 pb-20 px-4">
                <div className="flex items-center gap-2 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/launchpad")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Easy XRP Generator</h1>
                        <p className="text-muted-foreground">The most simple way to drop on XRP Ledger</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "w-3 h-3 rounded-full transition-colors",
                                    step >= s ? "bg-primary" : "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        Step 1: Collection Identity
                                    </CardTitle>
                                    <CardDescription>
                                        Define your collection basics. This sets your Account Domain on XRPL.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Collection Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Bored Frogs"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="text-lg"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="symbol">Symbol</Label>
                                            <Input
                                                id="symbol"
                                                placeholder="FROG"
                                                value={symbol}
                                                onChange={(e) => setSymbol(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="fee">Transfer Fee (%)</Label>
                                            <Input
                                                id="fee"
                                                type="number"
                                                min={0}
                                                max={50}
                                                step={0.1}
                                                value={transferFee}
                                                onChange={(e) => setTransferFee(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="desc">Description</Label>
                                        <Textarea
                                            id="desc"
                                            placeholder="Tell the world about your art..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="min-h-[100px]"
                                        />
                                    </div>

                                    <Separator />

                                    <div className="bg-primary/5 rounded-lg p-4 flex gap-3 border border-primary/10">
                                        <Zap className="w-5 h-5 text-primary shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-primary">Arweave Permanence Enabled</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Your assets are stored forever on Arweave thanks to Irys, providing true permanence.
                                                Metadata and images are secured for 200+ years.
                                            </p>
                                            <div className="flex gap-4 pt-1 font-mono text-[10px] opacity-70">
                                                <span>Hub: arweave.net</span>
                                                <span>Irys: gateway.irys.xyz</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-12 text-lg"
                                        disabled={!name || !symbol}
                                        onClick={() => setStep(2)}
                                    >
                                        Next: Upload Art
                                        <ChevronRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary" />
                                        Step 2: Asset Drop
                                    </CardTitle>
                                    <CardDescription>
                                        Upload the images you want to turn into XRPL NFTs.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                                            files.length > 0 ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/30"
                                        )}
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                    >
                                        <input
                                            id="file-upload"
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                        />
                                        {files.length === 0 ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <ImageIcon className="w-8 h-8 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium">Drop your images here</p>
                                                    <p className="text-sm text-neutral-400 mt-2">Supports ANY aspect ratio (Portrait, Landscape, Square)</p>
                                                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                                                        <Badge variant="outline" className="text-[10px] bg-muted">300-500px Small</Badge>
                                                        <Badge variant="outline" className="text-[10px] bg-muted/60">1000px Standard</Badge>
                                                        <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/20">2000px High</Badge>
                                                        <Badge variant="outline" className="text-[10px] bg-primary/20 border-primary/30 text-primary">4000px+ Pro</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                                    <Check className="w-8 h-8 text-green-500" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium">{files.length} Files Selected</p>
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFiles([]); }}>
                                                        Clear All
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isUploading && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Uploading & Indexing...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <Progress value={uploadProgress} className="h-2" />
                                        </div>
                                    )}

                                    <div className="bg-blue-500/5 rounded-lg p-4 flex gap-3 border border-blue-500/10">
                                        <Info className="w-5 h-5 text-blue-500 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-blue-500">Resolution Guidelines</p>
                                            <div className="grid grid-cols-3 gap-2 text-[10px] mt-2">
                                                <div className="p-1 rounded bg-muted/50 border border-border/50">
                                                    <p className="font-bold opacity-70 mb-0.5">Small Scale</p>
                                                    <p>300 - 500px</p>
                                                </div>
                                                <div className="p-1 rounded bg-primary/10 border border-primary/20">
                                                    <p className="font-bold text-primary mb-0.5">Standard/HD</p>
                                                    <p>1080 - 2000px</p>
                                                </div>
                                                <div className="p-1 rounded bg-primary/20 border border-primary/30">
                                                    <p className="font-bold text-primary mb-0.5">Gallery/Pro</p>
                                                    <p>4000px+</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                                                * Note: 4000px results in approx 10-50MB files. Supported fully via Irys bundling.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)} disabled={isUploading}>
                                            Back
                                        </Button>
                                        <Button
                                            className="flex-[2] h-12 text-lg"
                                            disabled={files.length === 0 || isUploading}
                                            onClick={createCollection}
                                        >
                                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />}
                                            Prepare Collection
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="border-green-500/20 bg-card/50 backdrop-blur-sm shadow-xl shadow-green-500/5">
                                <CardHeader className="text-center pb-2">
                                    <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                        <Rocket className="w-10 h-10 text-green-500" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold">Collection Ready!</CardTitle>
                                    <CardDescription>
                                        Identity established on XRPL. Now let's mint the tokens.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Collection</span>
                                            <span className="font-semibold">{name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Symbol</span>
                                            <Badge variant="outline">{symbol}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Supply</span>
                                            <span className="font-semibold">{files.length} NFTs</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Storage Status</span>
                                            <span className="text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> Supabase Hosted</span>
                                        </div>
                                         <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Ledger Status</span>
                                            <span className="text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> Account Set</span>
                                         </div>

                                         <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-[10px] text-primary uppercase font-bold tracking-wider">Lily Pad Advantage</p>
                                                <Badge className="h-4 text-[9px] bg-primary text-primary-foreground">LOWEST FEES</Badge>
                                            </div>
                                            <p className="text-xs font-semibold">2.0% Flat Fee • Zero Launch Fees</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Competitive pricing that undercuts LaunchMyNFT by 0.5%
                                            </p>
                                         </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {!isConnected ? (
                                            <Button className="w-full h-14 text-xl gap-2" variant="destructive" disabled>
                                                Connect XRPL Wallet to Mint
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full h-14 text-xl gap-2 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                                                onClick={launchNfts}
                                                disabled={isMinting}
                                            >
                                                {isMinting ? (
                                                    <>
                                                        <Loader2 className="w-6 h-6 animate-spin" />
                                                        Minting on Ledger...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-6 h-6 fill-current" />
                                                        MINT {files.length} NFTs NOW
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            className="w-full h-12 gap-2"
                                            onClick={handleDownloadZip}
                                            disabled={isDownloadingZip}
                                        >
                                            {isDownloadingZip ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            Download ZIP of Image + Data
                                        </Button>
                                    </div>

                                    <p className="text-center text-xs text-muted-foreground px-8">
                                        By clicking mint, you will sign a batch of XLS-20 transactions.
                                        Ensure your wallet has at least {10 + (files.length * 2)} XRP for reserves.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

            </main>
        </div>
    );
}
