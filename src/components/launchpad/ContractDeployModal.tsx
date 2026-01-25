import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Rocket,
  AlertTriangle,
  Link2,
  Info,
  Leaf,
  Loader2,
} from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { toast } from "sonner";
import { isValidIPFSCID } from "@/config/nftFactory";
import { supabase } from "@/integrations/supabase/client";

interface ContractDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    name: string;
    symbol: string;
    total_supply: number;
    royalty_percent: number;
    creator_address: string;
  };
  onDeploySuccess: (contractAddress: string) => void;
}

export const ContractDeployModal: React.FC<ContractDeployModalProps> = ({
  open,
  onOpenChange,
  collection,
  onDeploySuccess,
}) => {
  const { isConnected, address, connect, network } = useWallet();
  const [manualAddress, setManualAddress] = React.useState("");
  const [showManualInput, setShowManualInput] = React.useState(false);
  const [ipfsCID, setIpfsCID] = React.useState("");
  const [isSavingCID, setIsSavingCID] = React.useState(false);

  const handleManualSubmit = async () => {
    // For Solana, contract addresses are base58 encoded public keys
    if (!manualAddress || manualAddress.length < 32) {
      toast.error("Please enter a valid Solana address");
      return;
    }

    setIsSavingCID(true);

    try {
      // Save IPFS CID if provided
      if (ipfsCID.trim()) {
        if (!isValidIPFSCID(ipfsCID.trim())) {
          toast.error("Invalid IPFS CID format. Should start with 'Qm' or 'bafy'.");
          setIsSavingCID(false);
          return;
        }

        const { error: updateError } = await supabase
          .from("collections")
          .update({ ipfs_base_cid: ipfsCID.trim() })
          .eq("id", collection.id);

        if (updateError) {
          console.error("Failed to save IPFS CID:", updateError);
          toast.error("Failed to save IPFS CID");
          setIsSavingCID(false);
          return;
        }
      }

      onDeploySuccess(manualAddress);
      toast.success("Collection linked successfully!" + (ipfsCID.trim() ? " IPFS CID saved." : ""));
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("An error occurred");
    } finally {
      setIsSavingCID(false);
    }
  };

  const handleClose = () => {
    setShowManualInput(false);
    setManualAddress("");
    setIpfsCID("");
    onOpenChange(false);
  };

  const networkName = network === 'mainnet' ? 'Solana Mainnet' : 'Solana Devnet';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Deploy Collection
          </DialogTitle>
          <DialogDescription>
            Deploy your NFT collection to {networkName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* LilyPad Platform Badge */}
          <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">The Lily Pad Collection</span>
            <Badge variant="secondary" className="text-xs">
              Solana
            </Badge>
          </div>

          {/* Collection Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Collection</span>
              <span className="font-medium">{collection.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Symbol</span>
              <span className="font-medium">{collection.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Supply</span>
              <span className="font-medium">{collection.total_supply.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Royalty</span>
              <span className="font-medium">{collection.royalty_percent}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network</span>
              <Badge variant="outline" className="text-xs">
                {networkName}
              </Badge>
            </div>
          </div>

          {/* Wallet Not Connected */}
          {!isConnected && (
            <div className="p-4 bg-muted border border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Connect your wallet to continue
              </p>
              <Button onClick={() => connect()} size="sm">
                Connect Wallet
              </Button>
            </div>
          )}

          {/* Info about Solana deployment */}
          {isConnected && !showManualInput && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Solana Deployment</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Collections on Solana are deployed using the Metaplex Core standard for high performance and low fees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contract Linking Option */}
          {isConnected && !showManualInput && (
            <div className="p-4 bg-muted border border-border rounded-lg">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <Link2 className="w-4 h-4" />
                <span className="text-sm font-medium">Link Existing Collection</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Already deployed your collection? Paste the collection address here.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowManualInput(true)}
              >
                <Link2 className="w-3 h-3" />
                Link Existing Collection
              </Button>
            </div>
          )}

          {/* Manual Address Input */}
          {showManualInput && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Link2 className="w-4 h-4" />
                <span className="text-sm font-medium">Link Existing Collection</span>
              </div>

              {/* Collection Address */}
              <div className="space-y-2">
                <Label htmlFor="contract-address" className="text-xs text-muted-foreground">
                  Collection Address *
                </Label>
                <Input
                  id="contract-address"
                  placeholder="Enter Solana collection address..."
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {/* IPFS CID Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ipfs-cid" className="text-xs text-muted-foreground">
                    IPFS Metadata CID
                  </Label>
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </div>
                <Input
                  id="ipfs-cid"
                  placeholder="bafybeierqu2yc..."
                  value={ipfsCID}
                  onChange={(e) => setIpfsCID(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Base CID containing your metadata files
                </p>
                {ipfsCID && !isValidIPFSCID(ipfsCID) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Invalid CID format
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowManualInput(false);
                    setManualAddress("");
                    setIpfsCID("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleManualSubmit}
                  disabled={!manualAddress || manualAddress.length < 32 || isSavingCID}
                >
                  {isSavingCID ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Link Collection"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDeployModal;
