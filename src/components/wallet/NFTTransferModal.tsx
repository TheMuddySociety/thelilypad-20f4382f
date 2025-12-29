import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import type { NFT } from "@/hooks/useWalletNFTs";

interface NFTTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT | null;
  network: string;
  onTransferSuccess?: () => void;
}

const EXPLORER_URLS: Record<string, string> = {
  "eth-mainnet": "https://etherscan.io/tx",
  "polygon-mainnet": "https://polygonscan.com/tx",
  "arb-mainnet": "https://arbiscan.io/tx",
  "opt-mainnet": "https://optimistic.etherscan.io/tx",
  "base-mainnet": "https://basescan.org/tx",
};

export const NFTTransferModal: React.FC<NFTTransferModalProps> = ({
  isOpen,
  onClose,
  nft,
  network,
  onTransferSuccess,
}) => {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const validateAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleClose = () => {
    setRecipientAddress("");
    setError(null);
    setTxHash(null);
    setIsTransferring(false);
    onClose();
  };

  const handleTransfer = async () => {
    if (!nft) return;

    setError(null);

    if (!recipientAddress) {
      setError("Please enter a recipient address");
      return;
    }

    if (!validateAddress(recipientAddress)) {
      setError("Invalid Ethereum address format");
      return;
    }

    if (typeof window.ethereum === "undefined") {
      setError("No wallet detected. Please install MetaMask or another wallet.");
      return;
    }

    setIsTransferring(true);

    try {
      // Get current account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const fromAddress = accounts[0];

      if (!fromAddress) {
        throw new Error("Wallet not connected");
      }

      if (recipientAddress.toLowerCase() === fromAddress.toLowerCase()) {
        throw new Error("Cannot transfer to yourself");
      }

      // ERC721 safeTransferFrom function selector + encoded params
      const tokenIdBigInt = BigInt(nft.tokenId);
      const tokenIdHex = tokenIdBigInt.toString(16).padStart(64, "0");
      const fromAddressClean = fromAddress.slice(2).toLowerCase().padStart(64, "0");
      const toAddressClean = recipientAddress.slice(2).toLowerCase().padStart(64, "0");
      
      // safeTransferFrom(address,address,uint256) function signature
      const functionSelector = "0x42842e0e";
      const data = `${functionSelector}${fromAddressClean}${toAddressClean}${tokenIdHex}`;

      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: fromAddress,
          to: nft.contractAddress,
          data,
        }],
      });

      setTxHash(hash);
      toast.success("NFT transfer initiated!");
      
      // Wait for confirmation
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 30;

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [hash],
          });
        } catch {
          // Continue waiting
        }
        attempts++;
      }

      if (receipt) {
        if (receipt.status === "0x1") {
          toast.success("NFT transferred successfully!");
          onTransferSuccess?.();
        } else {
          throw new Error("Transaction failed on-chain");
        }
      }

    } catch (err: any) {
      console.error("Transfer error:", err);
      
      let errorMessage = "Transfer failed";
      if (err.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (err.message?.includes("not owner") || err.message?.includes("ERC721")) {
        errorMessage = "You don't own this NFT or it's not transferable";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!nft) return null;

  const explorerUrl = EXPLORER_URLS[network] || EXPLORER_URLS["eth-mainnet"];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Transfer NFT
          </DialogTitle>
          <DialogDescription>
            Send this NFT to another wallet address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* NFT Preview */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border">
            {nft.image ? (
              <img
                src={nft.image}
                alt={nft.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{nft.name || `#${nft.tokenId}`}</p>
              <p className="text-sm text-muted-foreground truncate">{nft.collection}</p>
            </div>
          </div>

          {/* Recipient Address Input */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={isTransferring || !!txHash}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter the wallet address you want to send this NFT to
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {txHash && (
            <Alert className="border-primary/50 bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="flex flex-col gap-2">
                <span>Transaction submitted!</span>
                <a
                  href={`${explorerUrl}/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Please double-check the recipient address. NFT transfers cannot be reversed.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isTransferring}>
            {txHash ? "Close" : "Cancel"}
          </Button>
          {!txHash && (
            <Button onClick={handleTransfer} disabled={isTransferring || !recipientAddress}>
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NFTTransferModal;
