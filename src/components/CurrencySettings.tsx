import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Wallet, CheckCircle, AlertTriangle } from "lucide-react";
import { useCreatorCurrency, CurrencyType } from "@/hooks/useCreatorCurrency";
import { useWallet } from "@/providers/WalletProvider";
import { toast } from "sonner";

interface CurrencySettingsProps {
  userId: string;
}

export const CurrencySettings: React.FC<CurrencySettingsProps> = ({ userId }) => {
  const { 
    preferredCurrency, 
    solWalletAddress, 
    payoutWalletAddress,
    isLoading, 
    updateCurrency, 
    updateSolWallet 
  } = useCreatorCurrency(userId);
  
  const { address, chainType, isConnected } = useWallet();
  
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(preferredCurrency);
  const [solWalletInput, setSolWalletInput] = useState(solWalletAddress || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedCurrency(preferredCurrency);
    setSolWalletInput(solWalletAddress || "");
  }, [preferredCurrency, solWalletAddress]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Update currency preference
      const currencyUpdated = await updateCurrency(selectedCurrency);
      if (!currencyUpdated) {
        setIsSaving(false);
        return;
      }

      // If SOL is selected, ensure wallet is set
      if (selectedCurrency === "SOL" && solWalletInput) {
        const walletUpdated = await updateSolWallet(solWalletInput);
        if (!walletUpdated) {
          setIsSaving(false);
          return;
        }
      }

      toast.success("Currency settings saved!");
    } catch (error) {
      console.error("Error saving currency settings:", error);
      toast.error("Failed to save settings");
    }
    
    setIsSaving(false);
  };

  const autoFillSolWallet = () => {
    if (isConnected && chainType === "solana" && address) {
      setSolWalletInput(address);
      toast.success("SOL wallet address filled from connected wallet");
    } else {
      toast.error("Please connect a Solana wallet first");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Payment Currency Settings
        </CardTitle>
        <CardDescription>
          Choose which currency you want to receive for your shop items, sticker packs, emotes, and bundles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency Selection */}
        <div className="space-y-4">
          <Label>Preferred Currency</Label>
          <RadioGroup 
            value={selectedCurrency} 
            onValueChange={(value) => setSelectedCurrency(value as CurrencyType)}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="currency-mon"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCurrency === "MON" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="MON" id="currency-mon" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">⟠</span>
                <div>
                  <p className="font-medium">Monad (MON)</p>
                  <p className="text-xs text-muted-foreground">EVM native token</p>
                </div>
              </div>
            </Label>
            
            <Label
              htmlFor="currency-sol"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCurrency === "SOL" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="SOL" id="currency-sol" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">◎</span>
                <div>
                  <p className="font-medium">Solana (SOL)</p>
                  <p className="text-xs text-muted-foreground">Solana native token</p>
                </div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* SOL Wallet Configuration */}
        {selectedCurrency === "SOL" && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <Label htmlFor="sol-wallet">SOL Wallet Address</Label>
              {isConnected && chainType === "solana" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={autoFillSolWallet}
                  className="text-xs"
                >
                  <Wallet className="w-3 h-3 mr-1" />
                  Use Connected Wallet
                </Button>
              )}
            </div>
            <Input
              id="sol-wallet"
              placeholder="Enter your Solana wallet address..."
              value={solWalletInput}
              onChange={(e) => setSolWalletInput(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This wallet will receive SOL payments from your sales. Make sure you have access to this wallet.
            </p>
            
            {/* Validation warning */}
            {selectedCurrency === "SOL" && !solWalletInput && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-500">
                  You must set a SOL wallet address to receive SOL payments
                </p>
              </div>
            )}
          </div>
        )}

        {/* Current MON Wallet Display */}
        {payoutWalletAddress && (
          <div className="p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current MON Payout Wallet</p>
                <p className="font-mono text-sm">{payoutWalletAddress.slice(0, 10)}...{payoutWalletAddress.slice(-8)}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving || (selectedCurrency === "SOL" && !solWalletInput)}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Currency Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
