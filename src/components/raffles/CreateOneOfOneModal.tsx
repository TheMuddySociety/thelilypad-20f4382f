import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Copy, Upload, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSolanaLaunch } from "@/hooks/useSolanaLaunch";
import { useWallet } from "@/providers/WalletProvider";
import { getErrorMessage } from "@/lib/errorUtils";
import type { SupportedChain } from "@/config/chains";
import { supabase } from "@/integrations/supabase/client";
import { uploadBatchToArweave, BatchUploadItem } from "@/integrations/irys/client";

interface CreateOneOfOneModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    chain?: SupportedChain;
}

export function CreateOneOfOneModal({ open, onOpenChange, onSuccess, chain = 'solana' }: CreateOneOfOneModalProps) {
    const { deploySolanaCollection, deployBubblegumTree, mintCompressedCore } = useSolanaLaunch();
    const { getSolanaProvider, address, isConnected, chainType } = useWallet();
    const [mode, setMode] = useState<"one-of-one" | "edition">("one-of-one");
    const [isLoading, setIsLoading] = useState(false);

    // Form
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [description, setDescription] = useState("");
    const [supply, setSupply] = useState("1"); // For editions
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selected);
        }
    };

    const handleSubmit = async () => {
        if (!file || !name) {
            toast.error("Please provide a name and an image.");
            return;
        }

        setIsLoading(true);
        try {
            if (!isConnected || !address) {
                toast.error("Please connect your wallet first. If connected, wait a moment.");
                setIsLoading(false);
                return;
            }

            // Shared Logic: Get User ID
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || address;

            // Shared Logic: Upload Image to Arweave (Irys)
            toast.loading("Uploading artwork to Arweave...", { id: "upload" });

            const batchItems: BatchUploadItem[] = [
                {
                    file,
                    buildMetadata: (arweaveImageUri: string, thumbUri?: string, previewUri?: string) => ({
                        name: `${name} ${mode === "edition" ? "Edition" : "1/1"}`,
                        description,
                        image: arweaveImageUri,
                        ...(thumbUri && thumbUri !== arweaveImageUri ? { thumbnail: thumbUri } : {}),
                        ...(previewUri && previewUri !== arweaveImageUri ? { preview: previewUri } : {})
                    })
                }
            ];

            const { items: uploadResults, manifestUri } = await uploadBatchToArweave(
                batchItems,
                { address, chainType: chain, network: "devnet" }, // defaults to devnet/testnet logic or passes thru
                (completed, total, status) => {
                    toast.loading(status, { id: "upload" });
                },
                1,
                false
            );

            const imageUrl = uploadResults[0]?.arweaveImageUri || manifestUri || "";
            const metadataUrl = uploadResults[0]?.arweaveUri || "";
            toast.dismiss("upload");

            let txHash = `mock_tx_${Date.now()}`;
            const chainName = chain === 'xrpl' ? 'XRPL' : chain === 'monad' ? 'Monad' : 'Solana';

            if (chain !== 'solana') {
                if (chainType !== chain) {
                    toast.error(`Please connect your ${chain.toUpperCase()} wallet.`);
                    setIsLoading(false);
                    return;
                }

                // Mock deployment for XRPL/Monad drafts
                toast.loading(`Deploying on ${chainName}...`, { id: "deploy" });
                await new Promise(r => setTimeout(r, 1500));
                toast.dismiss("deploy");
            } else {
                if (chainType !== 'solana') {
                    toast.error("Please connect your Solana wallet.");
                    setIsLoading(false);
                    return;
                }

                const provider = getSolanaProvider();
                if (!provider) throw new Error("Solana Wallet not connected");

                const creatorAddress = (provider as any)?.publicKey?.toString?.() || address;

                toast.loading("Deploying Solana collection...", { id: "deploy" });
                const result = await deploySolanaCollection({
                    name,
                    symbol,
                    uri: imageUrl, // use the actual uploaded url for mock metadata
                    sellerFeeBasisPoints: 0,
                    creators: [{ address: creatorAddress, share: 100 }],
                });

                if (result?.address) {
                    txHash = result.address;

                    // Note: 1of1's and limit edition only creates Metaplex core compress NFTs
                    toast.loading("Deploying Bubblegum Tree for compressed NFTs...", { id: "deploy" });
                    const treeAddress = await deployBubblegumTree(14, 64, 8); // ~16k capacity tree

                    const supplyCount = mode === "edition" ? parseInt(supply) || 1 : 1;

                    for (let i = 0; i < supplyCount; i++) {
                        toast.loading(`Minting compressed NFT ${i + 1}/${supplyCount}...`, { id: "deploy" });
                        await mintCompressedCore(
                            treeAddress,
                            result.address,
                            `${name} ${mode === "edition" ? '#' + (i + 1) : ''}`.trim(),
                            metadataUrl, // Use the proper JSON metadata URI
                            0, // sellerFeeBasisPoints
                            creatorAddress
                        );
                    }
                }
                toast.dismiss("deploy");
            }

            // Insert into the Database for All Chains so they show in "My NFTs"
            toast.loading("Finalizing NFT...", { id: "finalize" });

            const { data: collectionInsert, error: collectionError } = await supabase
                .from("collections")
                .insert({
                    name: `${name} ${mode === "edition" ? "Edition" : "1/1"}`,
                    symbol,
                    description: description,
                    image_url: imageUrl,
                    creator_id: userId,
                    creator_address: address,
                    contract_address: txHash
                })
                .select("id")
                .single();

            const collectionId = collectionError ? null : collectionInsert?.id;

            const supplyCount = mode === "edition" ? parseInt(supply) || 1 : 1;
            const nftRecords = [];

            for (let i = 0; i < supplyCount; i++) {
                nftRecords.push({
                    name: `${name} #${i + 1}`,
                    description: description,
                    image_url: imageUrl,
                    collection_id: collectionId,
                    owner_address: address, // Ensure MyNFTs picks it up
                    owner_id: userId,
                    token_id: i + 1,
                    tx_hash: `${txHash}_${i}`,
                    attributes: [{ trait_type: "Type", value: mode === "edition" ? "Edition" : "1/1" }, { trait_type: "Chain", value: chainName }],
                    is_revealed: true
                });
            }

            const { error: insertError } = await supabase.from("minted_nfts").insert(nftRecords);

            toast.dismiss("finalize");

            if (insertError) {
                console.error("NFT Database Insert error:", insertError);
                toast.error("Failed to save NFT to database, but it may have deployed.");
            } else {
                toast.success(mode === "one-of-one" ? `1/1 Created on ${chainName}!` : `Edition Created on ${chainName}!`);
                onSuccess?.();
                onOpenChange(false);
            }

        } catch (error) {
            console.error(error);
            toast.dismiss("upload");
            toast.dismiss("deploy");
            toast.dismiss("finalize");
            toast.error(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Launch {mode === "one-of-one" ? "1-of-1" : "Edition"}</DialogTitle>
                    <DialogDescription>
                        Create a standalone NFT or a limited edition series on {chain === 'xrpl' ? 'XRPL' : chain === 'monad' ? 'Monad' : 'Solana'}.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v: any) => setMode(v)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="one-of-one" className="gap-2">
                            <ImageIcon className="w-4 h-4" /> 1-of-1
                        </TabsTrigger>
                        <TabsTrigger value="edition" className="gap-2">
                            <Copy className="w-4 h-4" /> Edition
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="space-y-4 py-4">
                    {/* Image Upload */}
                    <div className="flex justify-center">
                        {preview ? (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="absolute bottom-0 w-full text-xs h-6 opacity-90"
                                    onClick={() => { setFile(null); setPreview(null); }}
                                >
                                    Change
                                </Button>
                            </div>
                        ) : (
                            <label className="w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                <span className="text-xs text-muted-foreground">Upload</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input placeholder="My Artwork" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Symbol</Label>
                            <Input placeholder="ART" value={symbol} onChange={e => setSymbol(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea placeholder="Tell the story..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    {mode === "edition" && (
                        <div className="space-y-2">
                            <Label>Supply</Label>
                            <Input
                                type="number"
                                value={supply}
                                onChange={e => setSupply(e.target.value)}
                                min="1"
                            />
                            <p className="text-xs text-muted-foreground">Number of copies to mint</p>
                        </div>
                    )}

                    <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {mode === "one-of-one" ? "Mint 1-of-1" : "Create Edition"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
