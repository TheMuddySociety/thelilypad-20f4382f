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

interface CreateOneOfOneModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateOneOfOneModal({ open, onOpenChange, onSuccess }: CreateOneOfOneModalProps) {
    const { deploySolanaCollection } = useSolanaLaunch();
    const { getSolanaProvider } = useWallet();
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
            const provider = getSolanaProvider();
            if (!provider) throw new Error("Wallet not connected");

            const creatorAddress = (provider as any)?.publicKey?.toString?.() || "";
            const placeholderUri = "https://arweave.net/placeholder";

            // 1. Upload Metadata (Simulated for this draft - usually goes to IPFS/Arweave)
            // In a real app, we'd upload file & json here.

            // 2. Deploy Collection
            const result = await deploySolanaCollection({
                name,
                symbol,
                uri: placeholderUri,
                sellerFeeBasisPoints: 0,
                creators: [{ address: creatorAddress, share: 100 }],
            });

            if (result) {
                toast.success(mode === "one-of-one" ? "1/1 Created Successfully!" : "Edition Created!");
                onSuccess?.();
                onOpenChange(false);
            }

        } catch (error) {
            console.error(error);
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
                        Create a standalone NFT or a limited edition series on Solana.
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
