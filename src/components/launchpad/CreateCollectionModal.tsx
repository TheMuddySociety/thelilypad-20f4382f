import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Users, 
  Shield, 
  Sparkles,
  Wallet,
  Check,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MintPhase {
  id: string;
  name: string;
  enabled: boolean;
  price: string;
  maxPerWallet: string;
  supply: string;
  startTime: string;
  endTime: string;
  merkleRoot?: string;
}

const defaultPhases: MintPhase[] = [
  { id: "team", name: "Team Mint", enabled: false, price: "0", maxPerWallet: "10", supply: "100", startTime: "", endTime: "" },
  { id: "partners", name: "Partners Mint", enabled: false, price: "0", maxPerWallet: "5", supply: "200", startTime: "", endTime: "", merkleRoot: "" },
  { id: "allowlist", name: "Allowlist", enabled: false, price: "0.25", maxPerWallet: "3", supply: "500", startTime: "", endTime: "", merkleRoot: "" },
  { id: "public", name: "Public Mint", enabled: true, price: "0.5", maxPerWallet: "5", supply: "4200", startTime: "", endTime: "" },
];

const steps = [
  { id: 1, title: "Collection Details", icon: ImageIcon },
  { id: 2, title: "Mint Phases", icon: Users },
  { id: 3, title: "Review & Deploy", icon: Sparkles },
];

export function CreateCollectionModal({ open, onOpenChange }: CreateCollectionModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Collection details
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [totalSupply, setTotalSupply] = useState("5000");
  const [royaltyPercent, setRoyaltyPercent] = useState("5");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Mint phases
  const [phases, setPhases] = useState<MintPhase[]>(defaultPhases);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePhase = (phaseId: string, updates: Partial<MintPhase>) => {
    setPhases(phases.map(p => p.id === phaseId ? { ...p, ...updates } : p));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!name || !symbol || !totalSupply) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    // Simulate deployment - in production this would call a smart contract
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success("Collection deployed successfully!", {
      description: "Your NFT collection is now live on Monad Mainnet",
    });
    
    setIsDeploying(false);
    onOpenChange(false);
    
    // Reset form
    setCurrentStep(1);
    setName("");
    setSymbol("");
    setDescription("");
    setTotalSupply("5000");
    setRoyaltyPercent("5");
    setImagePreview(null);
    setPhases(defaultPhases);
  };

  const enabledPhases = phases.filter(p => p.enabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create NFT Collection</DialogTitle>
          <DialogDescription>
            Launch your NFT collection on Monad Mainnet
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    currentStep >= step.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Collection Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Collection Image *</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto" />
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload collection image
                    </p>
                  </>
                )}
                <input 
                  id="image-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name *</Label>
                <Input 
                  id="name" 
                  placeholder="My Awesome NFTs" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input 
                  id="symbol" 
                  placeholder="MNFT" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe your collection..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supply">Total Supply *</Label>
                <Input 
                  id="supply" 
                  type="number" 
                  placeholder="5000"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="royalty">Royalty %</Label>
                <Input 
                  id="royalty" 
                  type="number" 
                  placeholder="5"
                  value={royaltyPercent}
                  onChange={(e) => setRoyaltyPercent(e.target.value)}
                  max={10}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Mint Phases */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure your mint phases. Enable the phases you need and set their parameters.
            </p>

            {phases.map((phase) => (
              <Card key={phase.id} className={`transition-colors ${phase.enabled ? "border-primary/50" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={phase.enabled}
                        onCheckedChange={(checked) => updatePhase(phase.id, { enabled: checked })}
                      />
                      <CardTitle className="text-base">{phase.name}</CardTitle>
                      {phase.id === "team" && <Shield className="w-4 h-4 text-muted-foreground" />}
                      {phase.id === "partners" && <Users className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {phase.enabled && (
                      <Badge variant="secondary">{phase.price === "0" ? "Free" : `${phase.price} MON`}</Badge>
                    )}
                  </div>
                </CardHeader>
                
                {phase.enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Price (MON)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={phase.price}
                          onChange={(e) => updatePhase(phase.id, { price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max/Wallet</Label>
                        <Input 
                          type="number"
                          value={phase.maxPerWallet}
                          onChange={(e) => updatePhase(phase.id, { maxPerWallet: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phase Supply</Label>
                        <Input 
                          type="number"
                          value={phase.supply}
                          onChange={(e) => updatePhase(phase.id, { supply: e.target.value })}
                        />
                      </div>
                    </div>

                    {(phase.id === "allowlist" || phase.id === "partners") && (
                      <div className="space-y-1">
                        <Label className="text-xs">Merkle Root (for allowlist verification)</Label>
                        <Input 
                          placeholder="0x..."
                          value={phase.merkleRoot || ""}
                          onChange={(e) => updatePhase(phase.id, { merkleRoot: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Time</Label>
                        <Input 
                          type="datetime-local"
                          value={phase.startTime}
                          onChange={(e) => updatePhase(phase.id, { startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Time</Label>
                        <Input 
                          type="datetime-local"
                          value={phase.endTime}
                          onChange={(e) => updatePhase(phase.id, { endTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Step 3: Review & Deploy */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Collection Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  {imagePreview && (
                    <img src={imagePreview} alt={name} className="w-20 h-20 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{name || "Unnamed Collection"}</h3>
                    <p className="text-sm text-muted-foreground">{symbol || "N/A"}</p>
                    {description && (
                      <p className="text-sm mt-2">{description}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Supply</span>
                    <p className="font-medium">{totalSupply} NFTs</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Royalty</span>
                    <p className="font-medium">{royaltyPercent}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Network</span>
                    <p className="font-medium">Monad Mainnet</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mint Phases</span>
                    <p className="font-medium">{enabledPhases.length} phases</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mint Phases</CardTitle>
              </CardHeader>
              <CardContent>
                {enabledPhases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No mint phases configured</p>
                ) : (
                  <div className="space-y-3">
                    {enabledPhases.map((phase, index) => (
                      <div key={phase.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium">{phase.name}</span>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">{phase.price === "0" ? "Free" : `${phase.price} MON`}</p>
                          <p className="text-muted-foreground">{phase.supply} supply</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Note:</strong> Deploying a collection will require a wallet transaction. 
                Make sure you have enough MON for gas fees.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleDeploy} disabled={isDeploying} className="gap-2">
              {isDeploying ? (
                <>Deploying...</>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Deploy Collection
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}