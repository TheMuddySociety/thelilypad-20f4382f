import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";

interface NFTTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nft: {
    id: string;
    token_id: number;
    name: string | null;
    image_url: string | null;
    collection: {
      name: string;
      contract_address: string | null;
      image_url: string | null;
    } | null;
  } | null;
  onTransferSuccess: () => void;
}

export function NFTTransferModal({
  open,
  onOpenChange,
  nft,
  onTransferSuccess
}: NFTTransferModalProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);

  // Stubbed state for Sol migration
  const isTransferring = false;
  const txHash = null;
  const error = null;

  useEffect(() => {
    if (!open) {
      setRecipientAddress("");
      setIsValidAddress(null);
    }
  }, [open]);

  useEffect(() => {
    if (recipientAddress.length === 0) {
      setIsValidAddress(null);
    } else {
      // Simple Solana address check length
      setIsValidAddress(recipientAddress.length >= 32);
    }
  }, [recipientAddress]);

  const handleTransfer = async () => {
    toast.info("Transfers coming soon for Solana NFTs");
    onOpenChange(false);
  };

  const explorerUrl = (hash: string) => {
    return `https://testnet.monadexplorer.com/tx/${hash}`;
  };

  if (!nft) return null;

  const canTransfer = nft.collection?.contract_address && isValidAddress && !isTransferring;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Transfer NFT
          </DialogTitle>
          <DialogDescription>
            Send this NFT to another wallet address
          </DialogDescription>
        </DialogHeader>

        {/* NFT Preview */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={nft.name || `#${nft.token_id}`}
                className="w-full h-full object-cover"
              />
            ) : nft.collection?.image_url ? (
              <img
                src={nft.collection.image_url}
                alt={nft.name || `#${nft.token_id}`}
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {nft.name || `${nft.collection?.name} #${nft.token_id}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {nft.collection?.name}
            </p>
            <Badge variant="outline" className="mt-1">
              Token #{nft.token_id}
            </Badge>
          </div>
        </div>

        {/* Transfer Success State */}
        {txHash ? (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                NFT transferred successfully!
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Transaction Hash:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                {txHash}
              </code>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(explorerUrl(txHash), "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </Button>
            <Button
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Contract not deployed warning */}
            {!nft.collection?.contract_address && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This collection's contract has not been deployed yet. Transfers are not available.
                </AlertDescription>
              </Alert>
            )}

            {/* Recipient Address Input */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={
                  isValidAddress === false
                    ? "border-destructive"
                    : isValidAddress === true
                      ? "border-green-500"
                      : ""
                }
                disabled={isTransferring || !nft.collection?.contract_address}
              />
              {isValidAddress === false && recipientAddress.length > 0 && (
                <p className="text-xs text-destructive">
                  Please enter a valid Ethereum address
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                This action is irreversible. Make sure the recipient address is correct before transferring.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isTransferring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!canTransfer}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Transfer
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
