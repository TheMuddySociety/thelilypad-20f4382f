import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
  Save,
  CheckCircle2,
  Globe,
  Twitter,
  MessageCircle,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { LayerManager, Layer } from "./LayerManager";
import { TraitRulesManager, TraitRule } from "./TraitRulesManager";
import { AllowlistManager } from "./AllowlistManager";
import { GenerationPreview } from "./GenerationPreview";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";
import { formatDistanceToNow } from "date-fns";

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
const DRAFT_BUCKET = "collection-drafts";

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
  imageUrl?: string; // Storage URL for collection cover image
  socialTwitter?: string;
  socialDiscord?: string;
  socialWebsite?: string;
  socialTelegram?: string;
}

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated }: CreateCollectionModalProps) {
  const { address } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Collection details
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [totalSupply, setTotalSupply] = useState("5000");
  const [royaltyPercent, setRoyaltyPercent] = useState("5");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Social links
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialDiscord, setSocialDiscord] = useState("");
  const [socialWebsite, setSocialWebsite] = useState("");
  const [socialTelegram, setSocialTelegram] = useState("");
  
  // Art generation
  const [layers, setLayers] = useState<Layer[]>([]);
  const [traitRules, setTraitRules] = useState<TraitRule[]>([]);
  const [artTab, setArtTab] = useState("layers");
  
  // Mint phases
  const [phases, setPhases] = useState<MintPhase[]>(defaultPhases);
  
  // Allowlist management
  const [allowlistPhases, setAllowlistPhases] = useState<AllowlistPhase[]>([]);

  // Upload draft images to storage
  const uploadDraftImages = async (userId: string): Promise<{
    coverImageUrl?: string;
    layersWithUrls: Layer[];
  }> => {
    let coverImageUrl = imagePreview;
    const layersWithUrls = [...layers];

    // Upload collection cover image if it's a data URL
    if (imagePreview && imagePreview.startsWith('data:')) {
      try {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        const fileExt = blob.type.split('/')[1] || 'png';
        const fileName = `${userId}/cover-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(DRAFT_BUCKET)
          .upload(fileName, blob, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from(DRAFT_BUCKET)
            .getPublicUrl(fileName);
          coverImageUrl = publicUrl;
        }
      } catch (e) {
        console.error("Failed to upload cover image:", e);
      }
    }

    // Upload trait images that are data URLs
    for (let i = 0; i < layersWithUrls.length; i++) {
      const layer = layersWithUrls[i];
      for (let j = 0; j < layer.traits.length; j++) {
        const trait = layer.traits[j];
        if (trait.imageUrl && trait.imageUrl.startsWith('data:')) {
          try {
            const response = await fetch(trait.imageUrl);
            const blob = await response.blob();
            const fileExt = blob.type.split('/')[1] || 'png';
            const fileName = `${userId}/traits/${layer.id}-${trait.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from(DRAFT_BUCKET)
              .upload(fileName, blob, { cacheControl: '3600', upsert: true });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from(DRAFT_BUCKET)
                .getPublicUrl(fileName);
              layersWithUrls[i].traits[j] = { ...trait, imageUrl: publicUrl };
            }
          } catch (e) {
            console.error("Failed to upload trait image:", e);
          }
        }
      }
    }

    return { coverImageUrl, layersWithUrls };
  };

  // Save draft function (non-debounced for interval use)
  const performSave = useCallback(async () => {
    if (!name && layers.length === 0 && !phases.some(p => p.enabled && p.id !== "public")) {
      return false; // Nothing to save
    }
    
    try {
      setIsSaving(true);
      
      // Get current user for storage upload
      const { data: { user } } = await supabase.auth.getUser();
      
      let savedImageUrl = imagePreview;
      let savedLayers = layers;
      
      // Only upload to storage if user is authenticated
      if (user) {
        const { coverImageUrl, layersWithUrls } = await uploadDraftImages(user.id);
        savedImageUrl = coverImageUrl;
        savedLayers = layersWithUrls;
      }
      
      const draftData: DraftData = {
        name,
        symbol,
        description,
        totalSupply,
        royaltyPercent,
        layers: savedLayers,
        traitRules,
        phases,
        currentStep,
        savedAt: Date.now(),
        imageUrl: savedImageUrl,
        socialTwitter,
        socialDiscord,
        socialWebsite,
        socialTelegram,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      
      // Also save to the new key for Launchpad drafts tab
      localStorage.setItem("collection-draft", JSON.stringify({
        name,
        symbol,
        description,
        totalSupply,
        royalty: royaltyPercent,
        layers: savedLayers,
        phases,
        currentStep,
        savedAt: new Date().toISOString(),
        imageUrl: savedImageUrl,
      }));
      
      setLastSavedAt(new Date());
      setIsSaving(false);
      setShowSaveIndicator(true);
      
      // Hide save indicator after 2 seconds
      setTimeout(() => setShowSaveIndicator(false), 2000);
      
      return true;
    } catch (e) {
      console.error("Failed to save draft:", e);
      setIsSaving(false);
      return false;
    }
  }, [name, symbol, description, totalSupply, royaltyPercent, layers, traitRules, phases, currentStep, imagePreview]);

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
            setLastSavedAt(new Date(draft.savedAt));
          }
        }
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, [open]);

  // Auto-save every 30 seconds when modal is open
  useEffect(() => {
    if (open) {
      // Clear any existing interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      
      // Set up new interval for auto-save every 30 seconds
      autoSaveIntervalRef.current = setInterval(() => {
        performSave();
      }, 30000);
      
      // Cleanup on close
      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
          autoSaveIntervalRef.current = null;
        }
      };
    }
  }, [open, performSave]);

  // Also save on significant changes (debounced)
  const saveDraft = useCallback(
    debounce(() => {
      performSave();
    }, 2000),
    [performSave]
  );

  // Trigger debounced save on changes
  useEffect(() => {
    if (open && (name || layers.length > 0 || phases.some(p => p.enabled))) {
      saveDraft();
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
        // Restore layers with their storage URLs
        setLayers(draft.layers);
        setTraitRules(draft.traitRules);
        setPhases(draft.phases);
        setCurrentStep(draft.currentStep);
        // Restore collection cover image from storage URL
        if (draft.imageUrl) {
          setImagePreview(draft.imageUrl);
        }
        // Restore social links
        setSocialTwitter(draft.socialTwitter || "");
        setSocialDiscord(draft.socialDiscord || "");
        setSocialWebsite(draft.socialWebsite || "");
        setSocialTelegram(draft.socialTelegram || "");
        setHasDraft(false);
        toast.success("Draft restored successfully!");
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

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setImageFile(file);
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToStorage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return imagePreview; // Return existing URL if no new file
    
    setIsUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('collection-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('collection-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setIsUploadingImage(false);
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

      // Upload image to storage if there's a new file
      let finalImageUrl = imagePreview;
      if (imageFile) {
        const uploadedUrl = await uploadImageToStorage(user.id);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
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
          image_url: finalImageUrl,
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
          social_twitter: socialTwitter || null,
          social_discord: socialDiscord || null,
          social_website: socialWebsite || null,
          social_telegram: socialTelegram || null,
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
      setImageFile(null);
      setLayers([]);
      setTraitRules([]);
      setPhases(defaultPhases);
      setAllowlistPhases([]);
      setSocialTwitter("");
      setSocialDiscord("");
      setSocialWebsite("");
      setSocialTelegram("");
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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Create NFT Collection</DialogTitle>
              <DialogDescription>
                Launch your NFT collection on Monad Mainnet
              </DialogDescription>
            </div>
            {/* Auto-save indicator */}
            {(lastSavedAt || isSaving || showSaveIndicator) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : showSaveIndicator ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500">Saved</span>
                  </>
                ) : lastSavedAt ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Last saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
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

            {/* Social Links Section */}
            <Separator className="my-4" />
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Globe className="w-4 h-4" />
                Social Links (Optional)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="socialTwitter" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Twitter className="w-3 h-3 text-[#1DA1F2]" />
                    Twitter
                  </Label>
                  <Input 
                    id="socialTwitter" 
                    placeholder="https://twitter.com/yourcollection"
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialDiscord" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageCircle className="w-3 h-3 text-[#5865F2]" />
                    Discord
                  </Label>
                  <Input 
                    id="socialDiscord" 
                    placeholder="https://discord.gg/yourcollection"
                    value={socialDiscord}
                    onChange={(e) => setSocialDiscord(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialWebsite" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3 h-3 text-emerald-500" />
                    Website
                  </Label>
                  <Input 
                    id="socialWebsite" 
                    placeholder="https://yourcollection.com"
                    value={socialWebsite}
                    onChange={(e) => setSocialWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="socialTelegram" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Send className="w-3 h-3 text-[#0088cc]" />
                    Telegram
                  </Label>
                  <Input
                    id="socialTelegram" 
                    placeholder="https://t.me/yourcollection"
                    value={socialTelegram}
                    onChange={(e) => setSocialTelegram(e.target.value)}
                  />
                </div>
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

            {/* Social Links Summary */}
            {(socialTwitter || socialDiscord || socialWebsite || socialTelegram) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Social Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {socialTwitter && (
                      <div className="flex items-center gap-2">
                        <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                        <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {socialTwitter.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                    {socialDiscord && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-[#5865F2]" />
                        <a href={socialDiscord} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {socialDiscord.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                    {socialWebsite && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <a href={socialWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {socialWebsite.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                    {socialTelegram && (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-[#0088cc]" />
                        <a href={socialTelegram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {socialTelegram.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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