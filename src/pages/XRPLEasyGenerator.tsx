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
    Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useXRPLLaunch } from "@/hooks/useXRPLLaunch";
import { uploadZipToPinata, getIpfsUri, isPinataConfigured, dataUrlToBlob, createPinataGroup } from "@/lib/pinataUpload";
import JSZip from "jszip";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { setStoredChain } from "@/config/chains";
import { bundleAssetsAsZip, GeneratedNFT } from "@/lib/assetBundler";
import { getCollectionStorageInfo } from "@/lib/payloadMapper";
import { Download, FileArchive } from "lucide-react";

export default function XRPLEasyGenerator() {
    const navigate = useNavigate();
    const { address, isConnected } = useWallet();
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
    const [collectionCid, setCollectionCid] = useState("");
    const [deployedResult, setDeployedResult] = useState<{ address: string; taxon: number } | null>(null);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
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
                    chain: "xrpl",
                    total_supply: files.length,
                    status: "draft",
                    creator_id: user.id,
                    creator_address: address
                })
                .select('id')
                .single();

            if (placeholderError) throw placeholderError;
            const collectionId = placeholderCollection.id;
            const storageInfo = getCollectionStorageInfo(collectionId);

            setUploadProgress(15);

            // 2. Upload individual assets to Supabase Storage
            toast.loading(`Uploading ${files.length} images to Supabase...`, { id: 'easy-mint' });
            const batchSize = 5;
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                await Promise.all(batch.map(async (file, index) => {
                    const tokenId = i + index;
                    const fileExt = file.name.split('.').pop() || 'png';
                    await supabase.storage.from('nfts').upload(`${collectionId}/${tokenId}.${fileExt}`, file, { upsert: true });

                    const metadata = {
                        schema: "ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm",
                        nftType: "art.v0",
                        name: `${name} #${tokenId + 1}`,
                        description,
                        image: storageInfo.itemImageUri(tokenId, fileExt),
                        attributes: []
                    };

                    await supabase.storage.from('nfts').upload(`${collectionId}/${tokenId}.json`, JSON.stringify(metadata), {
                        upsert: true,
                        contentType: 'application/json'
                    });
                }));
                setUploadProgress(15 + Math.round(((i + batchSize) / files.length) * 40));
            }

            // 3. Optional Admin-Only Pinata Upload (IPFS)
            let metadataCid = "";
            let imagesCid = "";

            if (isAdmin && isPinataConfigured()) {
                toast.loading("Admin: Pining assets to IPFS (fallback)...", { id: 'easy-mint' });

                // Create pinata group
                let groupId: string | undefined;
                try {
                    const group = await createPinataGroup(name);
                    groupId = group.id;
                } catch (e) { console.warn("Pinata grouping failed"); }

                // Zip images
                const imagesZip = new JSZip();
                files.forEach((file, i) => imagesZip.file(`${i}.png`, file));
                const imagesZipBlob = await imagesZip.generateAsync({ type: "blob" });
                const imagesPin = await uploadZipToPinata(imagesZipBlob, `${name}-assets`, groupId);
                imagesCid = imagesPin.IpfsHash;

                // Zip metadata
                const metaZip = new JSZip();
                for (let i = 0; i < files.length; i++) {
                    const metadata = {
                        schema: "ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm",
                        nftType: "art.v0",
                        name: `${name} #${i + 1}`,
                        description,
                        image: getIpfsUri(imagesCid, `${i}.png`),
                        attributes: []
                    };
                    metaZip.file(`${i}.json`, JSON.stringify(metadata, null, 2));
                }
                const metaZipBlob = await metaZip.generateAsync({ type: "blob" });
                const metaPin = await uploadZipToPinata(metaZipBlob, `${name}-metadata`, groupId);
                metadataCid = metaPin.IpfsHash;
                setCollectionCid(metadataCid);
            } else {
                // For non-admins or no pinata config, collectionCid identifies Supabase root
                setCollectionCid("supabase");
            }

            // 4. Deploy Collection (Setup Domain)
            setUploadProgress(80);
            toast.loading("Setting up XRPL Collection...", { id: 'easy-mint' });

            // XRPL Base URI strategy: Use Supabase root if not admin, or IPFS if admin
            const baseUri = (isAdmin && metadataCid) ? getIpfsUri(metadataCid) : storageInfo.rootUri;

            const result = await deployXRPLCollection({
                name,
                symbol,
                description,
                totalSupply: files.length,
                baseUri
            });

            setDeployedResult(result);

            // Update collection record with final results
            await supabase.from("collections").update({
                contract_address: result.address,
                status: "active",
                ipfs_base_cid: metadataCid || null,
                image_url: storageInfo.itemImageUri(0)
            }).eq('id', collectionId);

            setUploadProgress(100);
            setStep(3);
            toast.success("Collection Created!", { id: 'easy-mint' });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create collection", { id: 'easy-mint' });
        } finally {
            setIsUploading(false);
        }
    };

    const launchNfts = async () => {
        if (!deployedResult || !collectionCid) return;
        const collectionId = (await supabase.from("collections").select('id').eq('contract_address', deployedResult.address).single()).data?.id;
        if (!collectionId) return;
        const storageInfo = getCollectionStorageInfo(collectionId);

        try {
            toast.loading(`Minting ${files.length} NFTs...`, { id: 'easy-mint' });

            const items = files.map((_, i) => ({
                name: `${name} #${i + 1}`,
                uri: (isAdmin && collectionCid !== "supabase")
                    ? getIpfsUri(collectionCid, `${i}.json`)
                    : storageInfo.itemMetadataUri(i)
            }));

            await mintXRPLItems(deployedResult.address, deployedResult.taxon, items);

            toast.success("Successfully Minted!", { id: 'easy-mint' });
            setStoredChain('xrpl');
            navigate("/launchpad");
        } catch (err: any) {
            toast.error(err.message || "Minting failed", { id: 'easy-mint' });
        }
    };

    const handleDownloadZip = async () => {
        if (files.length === 0) return;
        setIsDownloadingZip(true);
        setDownloadProgress(0);

        try {
            const zip = new JSZip();
            const imagesFolder = zip.folder("images");
            const metadataFolder = zip.folder("metadata");

            if (!imagesFolder || !metadataFolder) throw new Error("Failed to create ZIP");

            for (let i = 0; i < files.length; i++) {
                setDownloadProgress(Math.round(((i + 1) / files.length) * 90));

                // Add Image
                imagesFolder.file(`${i}.png`, files[i]);

                // Add XLS-20 Metadata
                const metadata = {
                    schema: "ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm",
                    nftType: "art.v0",
                    name: `${name} #${i + 1}`,
                    description,
                    image: `ipfs://YOUR_IMAGE_CID/${i}.png`,
                    attributes: []
                };
                metadataFolder.file(`${i}.json`, JSON.stringify(metadata, null, 2));
            }

            // Collection Manifest
            zip.file("collection.json", JSON.stringify({
                name,
                symbol,
                description,
                total_supply: files.length,
                chain: "XRPL",
                generated_at: new Date().toISOString()
            }, null, 2));

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-assets.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Collection ZIP downloaded!");
        } catch (err: any) {
            toast.error("Failed to generate ZIP: " + err.message);
        } finally {
            setIsDownloadingZip(false);
            setDownloadProgress(0);
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
                                            <Input id="fee" type="number" defaultValue={5} placeholder="5" />
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
                                        <Info className="w-5 h-5 text-primary shrink-0" />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            On XRP Ledger, "Creating a Collection" sets your Account Domain to your IPFS metadata URI.
                                            This allows marketplaces to find your NFTs automatically.
                                        </p>
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
                                                    <p className="text-sm text-muted-foreground">PNG, JPG, or GIF up to 10MB each</p>
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
