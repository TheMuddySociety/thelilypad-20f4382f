import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, AlertTriangle, FileJson, Trash2, Wand2 } from "lucide-react";
import { useSolanaLaunch } from '@/hooks/useSolanaLaunch';
import { toast } from 'sonner';

interface CandyMachineManagerProps {
    candyMachineAddress: string;
    candyGuardAddress?: string;
    isCreator: boolean;
    onRefresh: () => void;
}

export function CandyMachineManager({
    candyMachineAddress,
    candyGuardAddress,
    isCreator,
    onRefresh
}: CandyMachineManagerProps) {
    const {
        insertItemsToCandyMachine,
        deleteCandyMachine,
        batchRevealAssets,
        isLoading
    } = useSolanaLaunch();

    const [itemsJson, setItemsJson] = useState("");
    const [revealMapJson, setRevealMapJson] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Handler for inserting items (Stage 1 & 4 of Best Practices)
    const handleInsertItems = async () => {
        try {
            const items = JSON.parse(itemsJson);
            if (!Array.isArray(items)) {
                toast.error("Invalid JSON format. Expected an array of items.");
                return;
            }
            if (items.length === 0) {
                toast.error("Item list is empty.");
                return;
            }

            // Basic validation
            if (!items.every(i => i.name && i.uri)) {
                toast.error("Invalid item format. Each item must have 'name' and 'uri'.");
                return;
            }

            await insertItemsToCandyMachine(candyMachineAddress, items);
            setItemsJson("");
            onRefresh();
        } catch (e) {
            toast.error("Failed to parse JSON.");
        }
    };

    // Handler for deleting CM (Lifecycle Management)
    const handleDeleteCM = async () => {
        if (!confirm("Are you sure you want to delete this Candy Machine? This cannot be undone.")) return;

        setIsDeleting(true);
        const success = await deleteCandyMachine(candyMachineAddress, candyGuardAddress);
        setIsDeleting(false);

        if (success) {
            onRefresh();
        }
    };

    // Handler for On-Chain Reveal (Stage 6 of Best Practices)
    const handleReveal = async () => {
        try {
            // Ideally this would fetch from a backend or DB. 
            // For now, we paste the "Secure Mapping" result or a list of assets to update.
            // Format: [{ address: "AssetAddress", uri: "NewURI", name: "NewName" }]

            const assetsToReveal = JSON.parse(revealMapJson);
            if (!Array.isArray(assetsToReveal)) {
                toast.error("Invalid JSON format. Expected array of { address, uri }.");
                return;
            }

            await batchRevealAssets(assetsToReveal);
            setRevealMapJson("");
            onRefresh();
        } catch (e) {
            toast.error("Failed to parse JSON.");
        }
    };

    if (!isCreator) return null;

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Candy Machine Manager (Core)</CardTitle>
                <CardDescription>Advanced tools for managing your collection's deployment.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="items">
                    <TabsList className="mb-4">
                        <TabsTrigger value="items">Insert Items</TabsTrigger>
                        <TabsTrigger value="reveal">Reveal Manager</TabsTrigger>
                        <TabsTrigger value="danger">Danger Zone</TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="space-y-4">
                        <Alert>
                            <FileJson className="h-4 w-4" />
                            <AlertTitle>JSON Format</AlertTitle>
                            <AlertDescription>
                                <code>[{"{"} "name": "Item #1", "uri": "https://..." {"}"}, ...]</code>
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label>Item List (JSON)</Label>
                            <Textarea
                                placeholder='[{"name": "Item 1", "uri": "https://..."}]'
                                value={itemsJson}
                                onChange={(e) => setItemsJson(e.target.value)}
                                rows={10}
                                className="font-mono text-xs"
                            />
                        </div>
                        <Button onClick={handleInsertItems} disabled={isLoading || !itemsJson}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Upload className="mr-2 h-4 w-4" />
                            Insert Items
                        </Button>
                    </TabsContent>

                    <TabsContent value="reveal" className="space-y-4">
                        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-500">
                            <Wand2 className="h-4 w-4" />
                            <AlertTitle>On-Chain Reveal</AlertTitle>
                            <AlertDescription>
                                Updates the Metadata URI of minted assets on-chain.
                                Paste the list of assets to update.
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label>Assets to Update (JSON)</Label>
                            <Textarea
                                placeholder='[{"address": "AssetAddress", "uri": "NewURI"}]'
                                value={revealMapJson}
                                onChange={(e) => setRevealMapJson(e.target.value)}
                                rows={10}
                                className="font-mono text-xs"
                            />
                        </div>
                        <Button onClick={handleReveal} disabled={isLoading || !revealMapJson}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Wand2 className="mr-2 h-4 w-4" />
                            Execute Reveal
                        </Button>
                    </TabsContent>

                    <TabsContent value="danger" className="space-y-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                                Deleting the Candy Machine will prevent any further minting.
                                Ensure you have withdrawn any funds (if applicable) and that minting is complete.
                                Valid Guards will be closed.
                            </AlertDescription>
                        </Alert>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCM}
                            disabled={isLoading || isDeleting}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Candy Machine & Guard
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
