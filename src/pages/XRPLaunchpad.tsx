import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Wallet,
    Rocket,
    Upload,
    Settings,
    Coins,
    Image,
    Link2,
    Flame,
    ArrowLeftRight,
    ExternalLink,
    Loader2,
    Gift,
    Check,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { XRPLWalletProvider, useXRPLWallet } from '@/providers/XRPLWalletProvider';
import { useXRPLMint } from '@/hooks/useXRPLMint';
import { useXRPLCollection } from '@/hooks/useXRPLCollection';
import { XRPLNetwork, getXRPLExplorerUrl, XRPL_NETWORKS } from '@/config/xrpl';
import { Wallet as XRPLWalletClass } from 'xrpl';
import { useXRPLAccount } from '@/hooks/useXRPLAccount';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Globe, RefreshCw } from 'lucide-react';

interface CollectionForm {
    name: string;
    description: string;
    symbol: string;
    totalSupply: number;
    metadataBaseUri: string;
    transferFee: number;
    burnable: boolean;
    transferable: boolean;
    onlyXRP: boolean;
    metadataStrategy: 'uri' | 'domain';
}

const defaultFormState: CollectionForm = {
    name: '',
    description: '',
    symbol: '',
    totalSupply: 100,
    metadataBaseUri: '',
    transferFee: 5, // 5% default royalty
    burnable: true,
    transferable: true,
    onlyXRP: true,
    metadataStrategy: 'uri',
};

function XRPLaunchpadContent() {
    const {
        address,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        balance,
        network,
        setNetwork,
        wallet,
        error: walletError
    } = useXRPLWallet();

    const { mintNFT, batchMintNFTs, isMinting, progress } = useXRPLMint(network);
    const { generateTaxon } = useXRPLCollection(network);
    const { fetchAccountSettings, setDomain, settings: accountSettings, isLoading: isAccountLoading } = useXRPLAccount(network);

    const [step, setStep] = useState<'connect' | 'configure' | 'deploy' | 'success'>('connect');
    const [form, setForm] = useState<CollectionForm>(defaultFormState);
    const [deployedTaxon, setDeployedTaxon] = useState<number | null>(null);
    const [mintedNFTs, setMintedNFTs] = useState<string[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);

    // Fetch account settings on connect
    React.useEffect(() => {
        if (isConnected && address) {
            fetchAccountSettings(address);
        }
    }, [isConnected, address, fetchAccountSettings]);

    // Update form field
    const updateForm = useCallback(<K extends keyof CollectionForm>(
        key: K,
        value: CollectionForm[K]
    ) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);

    // Handle wallet connection
    const handleConnect = async (type: 'crossmark' | 'gem' | 'manual', seed?: string) => {
        const success = await connect(type, seed);
        if (success) {
            setStep('configure');
        }
    };

    // Generate metadata URIs for collection
    const generateMetadataURIs = useCallback((baseUri: string, count: number, strategy: 'uri' | 'domain'): string[] | undefined => {
        if (strategy === 'domain') return undefined;

        // If base URI ends with /, generate numbered files
        if (baseUri.endsWith('/')) {
            return Array.from({ length: count }, (_, i) => `${baseUri}${i + 1}.json`);
        }
        // Otherwise, use same URI for all (single collection NFT)
        return Array.from({ length: count }, () => baseUri);
    }, []);

    // Deploy collection
    const handleDeploy = async () => {
        if (!wallet || !isConnected) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!form.name) {
            toast.error('Please fill in collection name');
            return;
        }

        if (form.metadataStrategy === 'uri' && !form.metadataBaseUri) {
            toast.error('Please fill in metadata URI');
            return;
        }

        if (form.metadataStrategy === 'domain' && !accountSettings?.domain) {
            toast.error('Account Domain must be set for Domain Strategy');
            return;
        }

        setStep('deploy');

        try {
            // Generate unique taxon for this collection
            const taxon = generateTaxon();
            setDeployedTaxon(taxon);

            // Generate URIs for all NFTs (undefined if strategy is domain)
            const uris = generateMetadataURIs(form.metadataBaseUri, form.totalSupply, form.metadataStrategy);

            // Create wallet instance for signing
            // Note: In production, this would use the actual connected wallet
            const signingWallet = wallet as unknown as XRPLWalletClass;

            // Batch mint all NFTs
            const results = await batchMintNFTs(signingWallet, {
                uri: form.metadataStrategy === 'uri' ? form.metadataBaseUri : undefined,
                uris,
                count: form.totalSupply,
                taxon,
                transferFeePercent: form.transferFee,
                burnable: form.burnable,
                transferable: form.transferable,
                onlyXRP: form.onlyXRP,
            });

            // Collect minted NFT IDs
            const minted = results
                .filter(r => r.success && r.nftId)
                .map(r => r.nftId!);

            setMintedNFTs(minted);
            setStep('success');

            toast.success(`Minted ${minted.length} NFTs!`);

        } catch (error: any) {
            console.error('Deploy error:', error);
            toast.error('Deployment failed: ' + error.message);
            setStep('configure');
        }
    };

    // Render based on step
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                                <Rocket className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">XRP NFT Launchpad</h1>
                                <p className="text-xs text-muted-foreground">Launch NFT collections on XRP Ledger</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Network Selector */}
                            <Select value={network} onValueChange={(v) => setNetwork(v as XRPLNetwork)}>
                                <SelectTrigger className="w-32 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(XRPL_NETWORKS).map(([key, net]) => (
                                        <SelectItem key={key} value={key}>{net.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Wallet Status */}
                            {isConnected ? (
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                                        <Wallet className="w-3 h-3 mr-1" />
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </Badge>
                                    <Badge variant="outline">
                                        {parseFloat(balance).toFixed(2)} XRP
                                    </Badge>
                                    <Button variant="ghost" size="sm" onClick={disconnect}>
                                        Disconnect
                                    </Button>

                                    {/* Account Settings Dialog */}
                                    <Dialog open={isDomainDialogOpen} onOpenChange={setIsDomainDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" title="Account Settings">
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Account Settings</DialogTitle>
                                                <DialogDescription>
                                                    Configure your XRPL account settings. Setting a Domain allows you to save ledger space for NFTs.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Current Domain</Label>
                                                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
                                                        <Globe className="w-4 h-4 text-muted-foreground" />
                                                        <span className={!accountSettings?.domain ? "text-muted-foreground italic" : ""}>
                                                            {accountSettings?.domain || "Not set"}
                                                        </span>
                                                        {isAccountLoading && <RefreshCw className="w-3 h-3 animate-spin ml-auto" />}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Update Domain</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={newDomain}
                                                            onChange={(e) => {
                                                                // Strip protocols if pasted
                                                                const val = e.target.value.replace(/^https?:\/\//, '').replace(/\/$/, '');
                                                                setNewDomain(val);
                                                            }}
                                                            placeholder="thelilypad.lovable.app"
                                                        />
                                                        <Button
                                                            onClick={async () => {
                                                                if (!wallet) return;
                                                                const res = await setDomain(wallet as unknown as XRPLWalletClass, newDomain);
                                                                if (res.success) {
                                                                    setNewDomain('');
                                                                    setIsDomainDialogOpen(false);
                                                                }
                                                            }}
                                                            disabled={isAccountLoading || !newDomain}
                                                        >
                                                            {isAccountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
                                                        </Button>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Requires an 'AccountSet' transaction.
                                                    </p>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                    Not Connected
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Step 1: Connect Wallet */}
                <AnimatePresence mode="wait">
                    {step === 'connect' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="bg-card/80 backdrop-blur border-border">
                                <CardHeader className="text-center">
                                    <div className="mx-auto p-4 rounded-full bg-blue-500/10 w-fit mb-4">
                                        <Wallet className="w-10 h-10 text-blue-400" />
                                    </div>
                                    <CardTitle>Connect Your XRP Wallet</CardTitle>
                                    <CardDescription>
                                        Choose a wallet to connect and start creating your NFT collection
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-20 flex-col gap-2"
                                            onClick={() => handleConnect('crossmark')}
                                            disabled={isConnecting}
                                        >
                                            <Wallet className="w-6 h-6" />
                                            <span>Crossmark</span>
                                            <span className="text-[10px] text-muted-foreground">Browser Extension</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-20 flex-col gap-2"
                                            onClick={() => handleConnect('gem')}
                                            disabled={isConnecting}
                                        >
                                            <Gift className="w-6 h-6" />
                                            <span>GemWallet</span>
                                            <span className="text-[10px] text-muted-foreground">Browser Extension</span>
                                        </Button>
                                    </div>

                                    {/* Manual seed for testing */}
                                    <div className="pt-4 border-t border-border">
                                        <p className="text-xs text-muted-foreground text-center mb-3">
                                            For testing on {network}: Use a{' '}
                                            <a
                                                href="https://xrpl.org/xrp-testnet-faucet.html"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                testnet faucet
                                            </a>
                                        </p>
                                        <ManualSeedConnect onConnect={(seed) => handleConnect('manual', seed)} />
                                    </div>

                                    {walletError && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {walletError}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 2: Configure Collection */}
                    {step === 'configure' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="bg-card/80 backdrop-blur border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Rocket className="w-5 h-5" />
                                        Configure Your Collection
                                    </CardTitle>
                                    <CardDescription>
                                        Set up your NFT collection details and minting settings
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Collection Name</Label>
                                            <Input
                                                value={form.name}
                                                onChange={(e) => updateForm('name', e.target.value)}
                                                placeholder="My NFT Collection"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Symbol</Label>
                                            <Input
                                                value={form.symbol}
                                                onChange={(e) => updateForm('symbol', e.target.value.toUpperCase())}
                                                placeholder="MNFT"
                                                maxLength={10}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={form.description}
                                            onChange={(e) => updateForm('description', e.target.value)}
                                            placeholder="Describe your collection..."
                                            rows={3}
                                        />
                                    </div>

                                    {/* Supply & URI */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Total Supply</Label>
                                            <Input
                                                type="number"
                                                value={form.totalSupply}
                                                onChange={(e) => updateForm('totalSupply', parseInt(e.target.value) || 1)}
                                                min={1}
                                                max={10000}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <Settings className="w-3 h-3" />
                                                    Metadata Strategy
                                                </div>
                                            </Label>
                                            <Select
                                                value={form.metadataStrategy}
                                                onValueChange={(v: 'uri' | 'domain') => updateForm('metadataStrategy', v)}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="uri">Direct URI (Standard)</SelectItem>
                                                    <SelectItem value="domain">Account Domain (Optimized)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            {form.metadataStrategy === 'uri' ? <Link2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                            {form.metadataStrategy === 'uri' ? 'Metadata Base URI' : 'Domain Preview'}
                                        </Label>

                                        {form.metadataStrategy === 'uri' ? (
                                            <Input
                                                value={form.metadataBaseUri}
                                                onChange={(e) => updateForm('metadataBaseUri', e.target.value)}
                                                placeholder="ipfs://Qm.../metadata/"
                                            />
                                        ) : (
                                            <div className="p-3 bg-muted rounded-md text-xs font-mono text-muted-foreground">
                                                {!accountSettings?.domain ? (
                                                    <span className="text-red-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Domain not set on account. Open settings to configure.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        https://{accountSettings.domain}/tokens/[ID]
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {form.metadataStrategy === 'domain' && (
                                            <p className="text-[10px] text-muted-foreground">
                                                Metadata will be resolved from your account domain instead of stored on-chain.
                                            </p>
                                        )}
                                    </div>

                                    {/* Royalties */}
                                    <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-1">
                                                <Coins className="w-3 h-3" />
                                                Creator Royalty (Transfer Fee)
                                            </Label>
                                            <Badge variant="outline">{form.transferFee}%</Badge>
                                        </div>
                                        <Slider
                                            value={[form.transferFee]}
                                            onValueChange={([v]) => updateForm('transferFee', v)}
                                            min={0}
                                            max={50}
                                            step={0.5}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            You'll receive {form.transferFee}% of every secondary sale
                                        </p>
                                    </div>

                                    {/* Flags */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                            <div className="flex items-center gap-2">
                                                <Flame className="w-4 h-4 text-orange-400" />
                                                <Label className="text-sm">Burnable</Label>
                                            </div>
                                            <Switch
                                                checked={form.burnable}
                                                onCheckedChange={(v) => updateForm('burnable', v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                            <div className="flex items-center gap-2">
                                                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                                                <Label className="text-sm">Transferable</Label>
                                            </div>
                                            <Switch
                                                checked={form.transferable}
                                                onCheckedChange={(v) => updateForm('transferable', v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                            <div className="flex items-center gap-2">
                                                <Coins className="w-4 h-4 text-green-400" />
                                                <Label className="text-sm">XRP Only</Label>
                                            </div>
                                            <Switch
                                                checked={form.onlyXRP}
                                                onCheckedChange={(v) => updateForm('onlyXRP', v)}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleDeploy}
                                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90"
                                        disabled={
                                            !form.name ||
                                            (form.metadataStrategy === 'uri' && !form.metadataBaseUri) ||
                                            (form.metadataStrategy === 'domain' && !accountSettings?.domain)
                                        }
                                    >
                                        <Rocket className="w-5 h-5 mr-2" />
                                        Launch Collection ({form.totalSupply} NFTs)
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 3: Deploying */}
                    {step === 'deploy' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="bg-card/80 backdrop-blur border-border">
                                <CardContent className="py-12 text-center">
                                    <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-blue-400" />
                                    <h3 className="text-xl font-bold mb-2">Minting Your Collection</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Please wait while we mint {form.totalSupply} NFTs to the XRP Ledger...
                                    </p>
                                    <Progress value={progress} className="max-w-md mx-auto mb-4" />
                                    <p className="text-sm text-muted-foreground">
                                        {Math.floor(progress)}% complete
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="bg-card/80 backdrop-blur border-border">
                                <CardContent className="py-12 text-center">
                                    <div className="mx-auto p-4 rounded-full bg-green-500/10 w-fit mb-6">
                                        <Check className="w-12 h-12 text-green-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">Collection Launched!</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Successfully minted {mintedNFTs.length} NFTs with taxon #{deployedTaxon}
                                    </p>

                                    <div className="flex justify-center gap-3 mb-8">
                                        <Button variant="outline" asChild>
                                            <a
                                                href={getXRPLExplorerUrl(address!, 'account', network)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View on Explorer
                                            </a>
                                        </Button>
                                        <Button onClick={() => {
                                            setStep('configure');
                                            setForm(defaultFormState);
                                            setMintedNFTs([]);
                                            setDeployedTaxon(null);
                                        }}>
                                            <Rocket className="w-4 h-4 mr-2" />
                                            Launch Another
                                        </Button>
                                    </div>

                                    {/* Minted NFT IDs */}
                                    {mintedNFTs.length > 0 && (
                                        <div className="text-left max-w-md mx-auto">
                                            <h4 className="text-sm font-medium mb-2">Minted NFT IDs:</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono bg-muted/30 rounded-lg p-3">
                                                {mintedNFTs.map((id, i) => (
                                                    <div key={i} className="truncate text-muted-foreground">
                                                        {i + 1}. {id}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Manual seed input component
function ManualSeedConnect({ onConnect }: { onConnect: (seed: string) => void }) {
    const [seed, setSeed] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setIsOpen(true)}
            >
                Use seed phrase (testing only)
            </Button>
        );
    }

    return (
        <div className="space-y-2">
            <Input
                type="password"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Enter seed (sEd...)"
            />
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsOpen(false)}
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onConnect(seed)}
                    disabled={!seed}
                >
                    Connect
                </Button>
            </div>
        </div>
    );
}

// Wrap with provider
export default function XRPLaunchpad() {
    return (
        <XRPLWalletProvider>
            <XRPLaunchpadContent />
        </XRPLWalletProvider>
    );
}
