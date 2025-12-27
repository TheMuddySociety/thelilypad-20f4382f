import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Loader2,
  AlertTriangle,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface Phase {
  id: string;
  name: string;
  price: string;
  maxPerWallet: number;
  supply: number;
  minted?: number;
  isActive?: boolean;
  startTime: string | null;
  endTime: string | null;
  requiresAllowlist: boolean;
}

interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  creator_address: string;
  creator_id: string;
  total_supply: number;
  minted: number;
  royalty_percent: number;
  status: string;
  phases: unknown;
  contract_address: string | null;
  created_at: string;
}

interface CollectionEditFormProps {
  collection: Collection;
  onSave: () => void;
  onCancel: () => void;
}

const collectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  symbol: z.string().trim().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less").toUpperCase(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  total_supply: z.number().min(1, "Supply must be at least 1").max(100000, "Supply cannot exceed 100,000"),
  royalty_percent: z.number().min(0, "Royalty cannot be negative").max(15, "Royalty cannot exceed 15%"),
  status: z.enum(["draft", "upcoming", "live", "ended"]),
});

export function CollectionEditForm({ collection, onSave, onCancel }: CollectionEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [name, setName] = useState(collection.name);
  const [symbol, setSymbol] = useState(collection.symbol);
  const [description, setDescription] = useState(collection.description || "");
  const [imageUrl, setImageUrl] = useState(collection.image_url || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(collection.image_url);
  const [totalSupply, setTotalSupply] = useState(collection.total_supply);
  const [royaltyPercent, setRoyaltyPercent] = useState(collection.royalty_percent);
  const [status, setStatus] = useState(collection.status);
  
  // Parse phases from collection
  const initialPhases = (() => {
    try {
      const phases = collection.phases as unknown as Phase[];
      return Array.isArray(phases) ? phases : [];
    } catch {
      return [];
    }
  })();
  
  const [phases, setPhases] = useState<Phase[]>(initialPhases);

  const canEditSupply = collection.minted === 0;
  const isLive = collection.status === "live";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToStorage = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl || null;
    
    setIsUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${collection.creator_id}/${Date.now()}.${fileExt}`;
      
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

  const validateForm = () => {
    try {
      collectionSchema.parse({
        name,
        symbol,
        description: description || undefined,
        image_url: imageUrl || undefined,
        total_supply: totalSupply,
        royalty_percent: royaltyPercent,
        status,
      });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleAddPhase = () => {
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: `Phase ${phases.length + 1}`,
      price: "0",
      maxPerWallet: 5,
      supply: Math.floor(totalSupply / 2),
      minted: 0,
      isActive: false,
      startTime: null,
      endTime: null,
      requiresAllowlist: false,
    };
    setPhases([...phases, newPhase]);
  };

  const handleRemovePhase = (phaseId: string) => {
    if (phases.length <= 1) {
      toast.error("Must have at least one phase");
      return;
    }
    setPhases(phases.filter((p) => p.id !== phaseId));
  };

  const handlePhaseChange = (phaseId: string, field: keyof Phase, value: unknown) => {
    setPhases(
      phases.map((p) =>
        p.id === phaseId ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    // Validate phases
    const totalPhaseSupply = phases.reduce((sum, p) => sum + p.supply, 0);
    if (totalPhaseSupply > totalSupply) {
      toast.error("Total phase supply cannot exceed collection supply");
      return;
    }

    setIsSaving(true);
    try {
      // Upload image if there's a new file
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const uploadedUrl = await uploadImageToStorage();
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      // Convert phases to JSON-compatible format
      const phasesJson = phases.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        maxPerWallet: p.maxPerWallet,
        supply: p.supply,
        minted: p.minted || 0,
        isActive: p.isActive || false,
        startTime: p.startTime,
        endTime: p.endTime,
        requiresAllowlist: p.requiresAllowlist,
      }));

      const { error } = await supabase
        .from("collections")
        .update({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim() || null,
          image_url: finalImageUrl.trim() || null,
          total_supply: totalSupply,
          royalty_percent: royaltyPercent,
          status,
          phases: phasesJson as unknown as undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", collection.id);

      if (error) {
        console.error("Error updating collection:", error);
        toast.error("Failed to save changes");
      } else {
        toast.success("Collection updated successfully");
        onSave();
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edit Collection</h2>
          <p className="text-muted-foreground">Update your collection details and mint phases</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {isLive && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-500">Collection is Live</p>
            <p className="text-sm text-amber-500/80">
              Some fields cannot be modified while the collection is live. You can still update description and phase details.
            </p>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core details about your collection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Collection"
                disabled={isLive}
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="MAC"
                disabled={isLive}
                maxLength={10}
              />
              {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your collection..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{description.length}/1000 characters</p>
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label>Collection Image</Label>
            <div className="flex gap-4 items-start">
              {/* Image Preview */}
              <div 
                className="w-24 h-24 rounded-lg border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center bg-muted"
                onClick={() => document.getElementById("edit-image-upload")?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById("edit-image-upload")?.click()}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Image
                  </Button>
                  {imageFile && (
                    <Badge variant="secondary" className="text-xs">
                      New image selected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Or enter an image URL below
                </p>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value || null);
                    setImageFile(null);
                  }}
                  placeholder="https://example.com/image.png"
                  type="url"
                  className="text-sm"
                />
                <input 
                  id="edit-image-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            {errors.image_url && <p className="text-xs text-destructive">{errors.image_url}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Supply & Royalties */}
      <Card>
        <CardHeader>
          <CardTitle>Supply & Royalties</CardTitle>
          <CardDescription>Configure your collection economics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalSupply">Total Supply *</Label>
              <Input
                id="totalSupply"
                type="number"
                value={totalSupply}
                onChange={(e) => setTotalSupply(parseInt(e.target.value) || 0)}
                min={1}
                max={100000}
                disabled={!canEditSupply}
              />
              {!canEditSupply && (
                <p className="text-xs text-muted-foreground">Cannot change after minting starts</p>
              )}
              {errors.total_supply && <p className="text-xs text-destructive">{errors.total_supply}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="royalty">Royalty %</Label>
              <Input
                id="royalty"
                type="number"
                value={royaltyPercent}
                onChange={(e) => setRoyaltyPercent(parseFloat(e.target.value) || 0)}
                min={0}
                max={15}
                step={0.5}
                disabled={isLive}
              />
              {errors.royalty_percent && <p className="text-xs text-destructive">{errors.royalty_percent}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isLive}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minted</span>
              <span className="font-medium">{collection.minted} / {totalSupply}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mint Phases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mint Phases</CardTitle>
              <CardDescription>Configure your mint schedule and pricing</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddPhase}>
              <Plus className="w-4 h-4 mr-2" />
              Add Phase
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {phases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No phases configured</p>
              <Button variant="link" onClick={handleAddPhase}>
                Add your first phase
              </Button>
            </div>
          ) : (
            phases.map((phase, index) => (
              <div
                key={phase.id}
                className="p-4 border rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Phase {index + 1}</Badge>
                    <Input
                      value={phase.name}
                      onChange={(e) => handlePhaseChange(phase.id, "name", e.target.value)}
                      className="w-40 h-8"
                      placeholder="Phase name"
                      maxLength={50}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemovePhase(phase.id)}
                    disabled={phases.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Price (MON)</Label>
                    <Input
                      type="number"
                      value={phase.price}
                      onChange={(e) => handlePhaseChange(phase.id, "price", e.target.value)}
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Supply</Label>
                    <Input
                      type="number"
                      value={phase.supply}
                      onChange={(e) => handlePhaseChange(phase.id, "supply", parseInt(e.target.value) || 0)}
                      min={1}
                      max={totalSupply}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max/Wallet</Label>
                    <Input
                      type="number"
                      value={phase.maxPerWallet}
                      onChange={(e) => handlePhaseChange(phase.id, "maxPerWallet", parseInt(e.target.value) || 1)}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Requires Allowlist</Label>
                    <div className="flex items-center h-10">
                      <Switch
                        checked={phase.requiresAllowlist}
                        onCheckedChange={(checked) => handlePhaseChange(phase.id, "requiresAllowlist", checked)}
                      />
                    </div>
                  </div>
                </div>

                {phase.minted !== undefined && phase.minted > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {phase.minted} already minted in this phase
                  </p>
                )}
              </div>
            ))
          )}

          {phases.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Phase Supply</span>
                <span className={`font-medium ${phases.reduce((sum, p) => sum + p.supply, 0) > totalSupply ? "text-destructive" : ""}`}>
                  {phases.reduce((sum, p) => sum + p.supply, 0).toLocaleString()} / {totalSupply.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}