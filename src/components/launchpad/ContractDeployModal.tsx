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
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Rocket, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  FileCode2,
  Wallet,
  Link2,
  Info,
  Shield,
  Leaf,
  Database
} from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useContractDeploy, DeployParams } from "@/hooks/useContractDeploy";
import { toast } from "sonner";
import { LILYPAD_PLATFORM_NAME, LILYPAD_PLATFORM_VERSION, isValidIPFSCID } from "@/config/nftFactory";
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
  const { isConnected, address, currentChain, connect, chainId, switchToMonad } = useWallet();
  const { 
    isDeploying, 
    deploymentStep, 
    txHash, 
    contractAddress, 
    error, 
    deployContract,
    resetState,
    isFactoryAvailable,
    isVerified,
    platformName,
    platformVersion
  } = useContractDeploy();
  const [copied, setCopied] = React.useState(false);
  const [manualAddress, setManualAddress] = React.useState("");
  const [showManualInput, setShowManualInput] = React.useState(false);
  const [ipfsCID, setIpfsCID] = React.useState("");
  const [isSavingCID, setIsSavingCID] = React.useState(false);

  const isWrongNetwork = isConnected && chainId !== currentChain.id;

  const handleDeploy = async () => {
    if (!address) return;

    const params: DeployParams = {
      name: collection.name,
      symbol: collection.symbol,
      maxSupply: collection.total_supply,
      royaltyBps: collection.royalty_percent,
      royaltyReceiver: collection.creator_address,
    };

    const deployedAddress = await deployContract(params);
    
    if (deployedAddress && deployedAddress !== "pending-verification") {
      onDeploySuccess(deployedAddress);
      toast.success("Contract deployed successfully!");
    } else if (deployedAddress === "pending-verification") {
      toast.info("Transaction succeeded! Check explorer for contract address.");
    }
  };

  const handleManualSubmit = async () => {
    if (!manualAddress || !manualAddress.startsWith("0x") || manualAddress.length !== 42) {
      toast.error("Please enter a valid contract address (0x...)");
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
      toast.success("Contract linked successfully!" + (ipfsCID.trim() ? " IPFS CID saved." : ""));
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("An error occurred");
    } finally {
      setIsSavingCID(false);
    }
  };

  const handleCopyAddress = () => {
    if (!contractAddress) return;
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Contract address copied!");
  };

  const handleClose = () => {
    if (!isDeploying) {
      resetState();
      setShowManualInput(false);
      setManualAddress("");
      setIpfsCID("");
      onOpenChange(false);
    }
  };

  const getStepProgress = () => {
    switch (deploymentStep) {
      case "idle": return 0;
      case "preparing": return 25;
      case "confirming": return 50;
      case "deploying": return 75;
      case "success": return 100;
      case "error": return 0;
      default: return 0;
    }
  };

  const explorerUrl = currentChain.blockExplorers?.default?.url;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Deploy Smart Contract
          </DialogTitle>
          <DialogDescription>
            Deploy your NFT collection to {currentChain.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* LilyPad Platform Badge */}
          <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">{LILYPAD_PLATFORM_NAME} Verified Collection</span>
            <Badge variant="secondary" className="text-xs">
              v{LILYPAD_PLATFORM_VERSION}
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
                {currentChain.name}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform</span>
              <Badge className="text-xs bg-primary/20 text-primary hover:bg-primary/30">
                <Leaf className="w-3 h-3 mr-1" />
                {platformName}
              </Badge>
            </div>
          </div>

          {/* Wallet Not Connected */}
          {!isConnected && (
            <div className="p-4 bg-muted border border-border rounded-lg text-center">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Connect your wallet to deploy
              </p>
              <Button onClick={() => connect()} size="sm">
                Connect Wallet
              </Button>
            </div>
          )}

          {/* Wrong Network Warning */}
          {isWrongNetwork && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Wrong Network</span>
              </div>
              <p className="text-xs text-destructive/80 mb-3">
                Switch to {currentChain.name} to deploy
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/20"
                onClick={switchToMonad}
              >
                Switch Network
              </Button>
            </div>
          )}

          {/* Contract Linking Option (recommended) */}
          {isConnected && !isWrongNetwork && deploymentStep === "idle" && !showManualInput && (
            <div className="p-4 bg-muted border border-border rounded-lg">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <Link2 className="w-4 h-4" />
                <span className="text-sm font-medium">Link Existing Contract</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Deploy your collection contract externally (e.g. Remix/Hardhat), then paste the deployed contract address here.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowManualInput(true)}
              >
                <Link2 className="w-3 h-3" />
                Link Existing Contract
              </Button>
            </div>
          )}

          {/* Factory Not Available (legacy message) */}
          {isConnected && !isWrongNetwork && !isFactoryAvailable && deploymentStep === "idle" && !showManualInput && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">Automatic Deploy Unavailable</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use “Link Existing Contract” after deploying externally.
              </p>
            </div>
          )}

          {/* Manual Contract Address Input */}
          {showManualInput && deploymentStep === "idle" && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Link2 className="w-4 h-4" />
                <span className="text-sm font-medium">Link Existing Contract</span>
              </div>
              
              {/* Contract Address */}
              <div className="space-y-2">
                <Label htmlFor="contract-address" className="text-xs text-muted-foreground">
                  Contract Address *
                </Label>
                <Input
                  id="contract-address"
                  placeholder="0x..."
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
                  placeholder="bafybeierqu2ycthbpbok7dofkxubhuwvddjyzuaheuxzttu4vcbsaqed7m"
                  value={ipfsCID}
                  onChange={(e) => setIpfsCID(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Base CID from Pinata/IPFS containing your metadata files (0.json, 1.json, etc.)
                </p>
                {ipfsCID && !isValidIPFSCID(ipfsCID) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Invalid CID format. Should start with "Qm" or "bafy"
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
                  disabled={!manualAddress || manualAddress.length !== 42 || isSavingCID}
                >
                  {isSavingCID ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Link Contract"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Deployment Progress */}
          {isConnected && !isWrongNetwork && deploymentStep !== "idle" && (
            <div className="space-y-4">
              <Progress value={getStepProgress()} className="h-2" />
              
              <div className="space-y-3">
                {/* Step 1: Preparing */}
                <div className={`flex items-center gap-3 ${
                  deploymentStep === "preparing" ? "text-primary" : 
                  getStepProgress() > 25 ? "text-green-500" : "text-muted-foreground"
                }`}>
                  {deploymentStep === "preparing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : getStepProgress() > 25 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <FileCode2 className="w-4 h-4" />
                  )}
                  <span className="text-sm">Calling factory contract</span>
                </div>

                {/* Step 2: Confirming */}
                <div className={`flex items-center gap-3 ${
                  deploymentStep === "confirming" ? "text-primary" : 
                  getStepProgress() > 50 ? "text-green-500" : "text-muted-foreground"
                }`}>
                  {deploymentStep === "confirming" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : getStepProgress() > 50 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )}
                  <span className="text-sm">Confirm in wallet</span>
                </div>

                {/* Step 3: Deploying */}
                <div className={`flex items-center gap-3 ${
                  deploymentStep === "deploying" ? "text-primary" : 
                  getStepProgress() === 100 ? "text-green-500" : "text-muted-foreground"
                }`}>
                  {deploymentStep === "deploying" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : getStepProgress() === 100 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  <span className="text-sm">Creating collection</span>
                </div>
              </div>

              {/* Transaction Hash */}
              {txHash && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Transaction</span>
                    <a
                      href={`${explorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <code className="text-xs text-muted-foreground break-all">
                    {txHash}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {deploymentStep === "success" && contractAddress && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-500 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Contract Deployed!</span>
                {isVerified && (
                  <Badge className="text-xs bg-primary/20 text-primary">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              
              {/* LilyPad Verification Info */}
              {isVerified && (
                <div className="mb-3 p-2 bg-primary/5 rounded-md border border-primary/20">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Leaf className="w-3 h-3" />
                    <span>This collection includes LilyPad platform identification</span>
                  </div>
                  <ul className="mt-1 text-xs text-muted-foreground space-y-0.5 ml-5">
                    <li>• Platform constant embedded</li>
                    <li>• Factory reference stored</li>
                    <li>• Contract-level metadata included</li>
                  </ul>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Contract Address</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={handleCopyAddress}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <a
                      href={`${explorerUrl}/address/${contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {contractAddress}
                </code>
              </div>
            </div>
          )}

          {/* Error State */}
          {deploymentStep === "error" && error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Deployment Failed</span>
              </div>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {deploymentStep === "idle" && isConnected && !isWrongNetwork && !showManualInput && (
            <>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              {isFactoryAvailable ? (
                <Button className="flex-1 gap-2" onClick={handleDeploy}>
                  <Rocket className="w-4 h-4" />
                  Deploy Contract
                </Button>
              ) : (
                <Button 
                  className="flex-1 gap-2" 
                  onClick={() => setShowManualInput(true)}
                >
                  <Link2 className="w-4 h-4" />
                  Link Contract
                </Button>
              )}
            </>
          )}
          
          {deploymentStep === "success" && (
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          )}
          
          {deploymentStep === "error" && (
            <>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleDeploy}>
                Try Again
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
