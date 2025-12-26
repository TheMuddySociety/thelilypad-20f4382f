import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Users, 
  Shield, 
  Sparkles,
  Wallet,
  Check,
  Image as ImageIcon,
  Layers,
  Palette,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { LayerManager, Layer } from "./LayerManager";
import { TraitRulesManager, TraitRule } from "./TraitRulesManager";
import { AllowlistManager } from "./AllowlistManager";
import { GenerationPreview } from "./GenerationPreview";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionCreated?: () => void;
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
  requiresAllowlist?: boolean;
}

interface AllowlistPhase {
  id: string;
  name: string;
  entries: {
    id: string;
    walletAddress: string;
    maxMint: number;
    notes?: string;
    addedAt: Date;
  }[];
}

const defaultPhases: MintPhase[] = [
  { id: "team", name: "Team Mint", enabled: false, price: "0", maxPerWallet: "10", supply: "100", startTime: "", endTime: "", requiresAllowlist: true },
  { id: "partners", name: "Partners Mint", enabled: false, price: "0", maxPerWallet: "5", supply: "200", startTime: "", endTime: "", merkleRoot: "", requiresAllowlist: true },
  { id: "allowlist", name: "Allowlist", enabled: false, price: "0.25", maxPerWallet: "3", supply: "500", startTime: "", endTime: "", merkleRoot: "", requiresAllowlist: true },
  { id: "public", name: "Public Mint", enabled: true, price: "0.5", maxPerWallet: "5", supply: "4200", startTime: "", endTime: "", requiresAllowlist: false },
];

const steps = [
  { id: 1, title: "Details", icon: ImageIcon },
  { id: 2, title: "Art Generation", icon: Palette },
  { id: 3, title: "Mint Phases", icon: Users },
  { id: 4, title: "Allowlist", icon: Shield },
  { id: 5, title: "Review", icon: Sparkles },
];

const STORAGE_KEY = "launchpad_draft";

interface DraftData {
  name: string;
  symbol: string;
  description: string;
  totalSupply: string;
  royaltyPercent: string;
  layers: Layer[];
  traitRules: TraitRule[];
  phases: MintPhase[];
  currentStep: number;
  savedAt: number;
}

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated }: CreateCollectionModalProps) {
  const { address } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Collection details
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [totalSupply, setTotalSupply] = useState("5000");
  const [royaltyPercent, setRoyaltyPercent] = useState("5");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Art generation
  const [layers, setLayers] = useState<Layer[]>([]);
  const [traitRules, setTraitRules] = useState<TraitRule[]>([]);
  const [artTab, setArtTab] = useState("layers");
  
  // Mint phases
  const [phases, setPhases] = useState<MintPhase[]>(defaultPhases);
  
  // Allowlist management
  const [allowlistPhases, setAllowlistPhases] = useState<AllowlistPhase[]>([]);

  // Load draft on mount
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const draft: DraftData = JSON.parse(saved);
          // Only load if less than 24 hours old
          if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
            setHasDraft(true);
          }
        }
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, [open]);

  // Debounced save to localStorage
  const saveDraft = useCallback(
    debounce((data: Omit<DraftData, "savedAt">) => {
      try {
        // Skip saving images to avoid quota issues - only save metadata
        const layersWithoutImages = data.layers.map(layer => ({
          ...layer,
          traits: layer.traits.map(trait => ({
            ...trait,
            imageUrl: trait.imageUrl ? "[saved]" : undefined, // Mark that image exists
          })),
        }));
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...data,
          layers: layersWithoutImages,
          savedAt: Date.now(),
        }));
      } catch (e) {
        console.error("Failed to save draft:", e);
      }
    }, 1000),
    []
  );

  // Auto-save on changes
  useEffect(() => {
    if (open && (name || layers.length > 0 || phases.some(p => p.enabled))) {
      saveDraft({
        name,
        symbol,
        description,
        totalSupply,
        royaltyPercent,
        layers,
        traitRules,
        phases,
        currentStep,
      });
    }
  }, [open, name, symbol, description, totalSupply, royaltyPercent, layers, traitRules, phases, currentStep, saveDraft]);

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        setName(draft.name);
        setSymbol(draft.symbol);
        setDescription(draft.description);
        setTotalSupply(draft.totalSupply);
        setRoyaltyPercent(draft.royaltyPercent);
        // Restore layers without images (user will need to re-upload)
        setLayers(draft.layers.map(layer => ({
          ...layer,
          traits: layer.traits.map(trait => ({
            ...trait,
            imageUrl: trait.imageUrl === "[saved]" ? undefined : trait.imageUrl,
          })),
        })));
        setTraitRules(draft.traitRules);
        setPhases(draft.phases);
        setCurrentStep(draft.currentStep);
        setHasDraft(false);
        toast.success("Draft restored! Note: Images need to be re-uploaded.");
      }
    } catch (e) {
      console.error("Failed to load draft:", e);
      toast.error("Failed to restore draft");
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasDraft(false);
  };

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
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Get phases that require allowlist
  const allowlistRequiredPhases = phases.filter(p => p.enabled && p.requiresAllowlist);
  
  // Get total allowlist entries
  const totalAllowlistEntries = allowlistPhases.reduce(
    (sum, phase) => sum + phase.entries.length, 0
  );

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to create a collection");
        setIsDeploying(false);
        return;
      }

      // Format phases for storage
      const enabledPhasesData = phases.filter(p => p.enabled).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        maxPerWallet: parseInt(p.maxPerWallet) || 1,
        supply: parseInt(p.supply) || 0,
        startTime: p.startTime || null,
        endTime: p.endTime || null,
        requiresAllowlist: p.requiresAllowlist,
      }));

      // Calculate public price from first enabled phase
      const firstPhase = enabledPhasesData[0];
      const publicPrice = firstPhase?.price || "0";

      // Insert collection into database
      const { data, error } = await supabase
        .from("collections")
        .insert([{
          creator_id: user.id,
          creator_address: address || `0x${user.id.replace(/-/g, '').slice(0, 40)}`,
          name,
          symbol,
          description,
          image_url: imagePreview,
          total_supply: parseInt(totalSupply) || 0,
          minted: 0,
          royalty_percent: parseFloat(royaltyPercent) || 5,
          status: "upcoming",
          phases: JSON.parse(JSON.stringify(enabledPhasesData)),
          layers_metadata: layers.length > 0 ? JSON.parse(JSON.stringify(layers.map(l => ({
            id: l.id,
            name: l.name,
            isOptional: l.isOptional,
            traitCount: l.traits.length,
          })))) : null,
          trait_rules: traitRules.length > 0 ? JSON.parse(JSON.stringify(traitRules)) : null,
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating collection:", error);
        toast.error("Failed to create collection", {
          description: error.message,
        });
        setIsDeploying(false);
        return;
      }
    
      toast.success("Collection created successfully!", {
        description: "Your NFT collection is now visible on the launchpad",
      });
      
      setIsDeploying(false);
      onOpenChange(false);
      
      // Notify parent to refresh
      onCollectionCreated?.();
      
      // Clear draft and reset form
      clearDraft();
      setCurrentStep(1);
      setName("");
      setSymbol("");
      setDescription("");
      setTotalSupply("5000");
      setRoyaltyPercent("5");
      setImagePreview(null);
      setLayers([]);
      setTraitRules([]);
      setPhases(defaultPhases);
      setAllowlistPhases([]);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong");
      setIsDeploying(false);
    }
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

        {/* Draft Restoration Banner */}
        {hasDraft && (
          <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm">You have an unsaved draft from a previous session</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearDraft}>
                Dismiss
              </Button>
              <Button variant="default" size="sm" onClick={loadDraft}>
                Restore Draft
              </Button>
            </div>
          </div>
        )}

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

        {/* Step 2: Art Generation */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Tabs value={artTab} onValueChange={setArtTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="layers" className="gap-2">
                  <Layers className="w-4 h-4" />
                  Layers
                </TabsTrigger>
                <TabsTrigger value="rules" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Rules
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="layers" className="mt-4">
                <LayerManager layers={layers} onLayersChange={setLayers} />
              </TabsContent>
              
              <TabsContent value="rules" className="mt-4">
                <TraitRulesManager
                  layers={layers}
                  rules={traitRules}
                  onRulesChange={setTraitRules}
                />
              </TabsContent>
              
              <TabsContent value="preview" className="mt-4">
                <GenerationPreview
                  layers={layers}
                  rules={traitRules}
                  totalSupply={totalSupply}
                  collectionName={name || "My Collection"}
                  collectionDescription={description}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 3: Mint Phases */}
        {currentStep === 3 && (
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

        {/* Step 4: Allowlist Management */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {allowlistRequiredPhases.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Manage wallet addresses for your whitelist-enabled mint phases.
                </p>
                <AllowlistManager
                  phases={allowlistRequiredPhases.map(p => ({ id: p.id, name: p.name }))}
                  onAllowlistChange={setAllowlistPhases}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-1">No Allowlist Phases Enabled</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enable Team Mint, Partners Mint, or Allowlist phases in the previous step to manage wallets.
                  </p>
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Configure Mint Phases
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 5: Review & Deploy */}
        {currentStep === 5 && (
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

            {/* Art Generation Summary */}
            {layers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Art Generation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Layers</span>
                      <p className="font-medium">{layers.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Traits</span>
                      <p className="font-medium">{layers.reduce((sum, l) => sum + l.traits.length, 0)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trait Rules</span>
                      <p className="font-medium">{traitRules.length}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {layers.map((layer) => (
                      <Badge key={layer.id} variant="outline" className="text-xs">
                        {layer.name} ({layer.traits.length})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mint Phases</CardTitle>
              </CardHeader>
              <CardContent>
                {enabledPhases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No mint phases configured</p>
                ) : (
                  <div className="space-y-3">
                    {enabledPhases.map((phase, index) => {
                      const phaseAllowlist = allowlistPhases.find(a => a.id === phase.id);
                      const allowlistCount = phaseAllowlist?.entries.length || 0;
                      
                      return (
                        <div key={phase.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <span className="font-medium">{phase.name}</span>
                              {phase.requiresAllowlist && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Shield className="w-3 h-3" />
                                  {allowlistCount} wallet{allowlistCount !== 1 ? 's' : ''} allowlisted
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{phase.price === "0" ? "Free" : `${phase.price} MON`}</p>
                            <p className="text-muted-foreground">{phase.supply} supply</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Allowlist Summary */}
            {totalAllowlistEntries > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Allowlist Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Wallets</span>
                      <p className="font-medium">{totalAllowlistEntries}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phases with Allowlist</span>
                      <p className="font-medium">{allowlistPhases.filter(p => p.entries.length > 0).length}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {allowlistPhases.filter(p => p.entries.length > 0).map((phase) => (
                      <Badge key={phase.id} variant="outline" className="text-xs">
                        {phase.name} ({phase.entries.length})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

          {currentStep < 5 ? (
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