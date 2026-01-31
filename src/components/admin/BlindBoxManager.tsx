import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Package, Trash2, Eye, Loader2, Sparkles, Upload, Copy, Calendar, Coins, ImageIcon, Gift, Star, Crown, Gem, Circle } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface BlindBox {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  total_supply: number;
  remaining_supply: number;
  rewards: Reward[];
  start_date: string;
  end_date: string;
  max_per_user: number | null;
  is_active: boolean;
  created_at: string;
}

interface Reward {
  type: "nft" | "token" | "shop_item";
  name: string;
  value: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  weight: number;
}

const RARITY_CONFIG = {
  common: { color: "text-zinc-400", bg: "bg-zinc-500/20", border: "border-zinc-500/30", icon: Circle, weight: 50 },
  uncommon: { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", icon: Star, weight: 30 },
  rare: { color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", icon: Gem, weight: 15 },
  epic: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: Sparkles, weight: 4 },
  legendary: { color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30", icon: Crown, weight: 1 },
};

const BlindBoxManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<BlindBox | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [price, setPrice] = useState("0.5");
  const [totalSupply, setTotalSupply] = useState("100");
  const [maxPerUser, setMaxPerUser] = useState("5");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([
    { type: "token", name: "Small SOL", value: "0.1", rarity: "common", weight: 50 },
    { type: "token", name: "Big SOL", value: "1", rarity: "rare", weight: 15 },
  ]);

  const { data: blindBoxes, isLoading } = useQuery({
    queryKey: ["admin-blind-boxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lily_blind_boxes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as BlindBox[];
    },
  });

  const { data: boxPurchases } = useQuery({
    queryKey: ["blind-box-purchases", selectedBox?.id],
    queryFn: async () => {
      if (!selectedBox?.id) return [];
      const { data, error } = await supabase
        .from("lily_blind_box_purchases")
        .select("*")
        .eq("blind_box_id", selectedBox.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedBox?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const creatorId = user?.id;
      if (!creatorId) throw new Error("Could not determine creator ID");

      const supply = parseInt(totalSupply) || 100;

      const boxData = {
        name,
        description: description || null,
        image_url: imageUrl || imagePreview || null,
        price: parseFloat(price) || 0,
        total_supply: supply,
        remaining_supply: supply,
        rewards: rewards.filter(r => r.name && r.value),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        max_per_user: parseInt(maxPerUser) || 5,
        created_by: creatorId,
      };

      const { error } = await supabase
        .from("lily_blind_boxes")
        .insert(boxData as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blind-boxes"] });
      toast.success("Blind Box created successfully!");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create blind box: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("lily_blind_boxes")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blind-boxes"] });
      toast.success("Blind Box updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lily_blind_boxes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blind-boxes"] });
      toast.success("Blind Box deleted!");
    },
    onError: (error: any) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setImagePreview(null);
    setPrice("0.5");
    setTotalSupply("100");
    setMaxPerUser("5");
    setStartDate("");
    setEndDate("");
    setRewards([
      { type: "token", name: "Small SOL", value: "0.1", rarity: "common", weight: 50 },
    ]);
  };

  const addReward = () => {
    setRewards([...rewards, { type: "token", name: "", value: "", rarity: "common", weight: RARITY_CONFIG.common.weight }]);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const updateReward = (index: number, field: keyof Reward, value: any) => {
    const updated = [...rewards];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "rarity") {
      updated[index].weight = RARITY_CONFIG[value as keyof typeof RARITY_CONFIG].weight;
    }
    setRewards(updated);
  };

  // Image drag-drop handler
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getBoxStatus = (box: BlindBox) => {
    const now = new Date();
    const start = new Date(box.start_date);
    const end = new Date(box.end_date);

    if (box.remaining_supply === 0) return { label: "Sold Out", color: "bg-zinc-500" };
    if (!box.is_active) return { label: "Inactive", color: "bg-zinc-600" };
    if (now < start) return { label: "Upcoming", color: "bg-blue-500" };
    if (now > end) return { label: "Ended", color: "bg-red-500" };
    return { label: "Live", color: "bg-green-500" };
  };

  const getTotalWeight = () => rewards.reduce((sum, r) => sum + r.weight, 0);

  const copyBoxId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Box ID copied!");
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Lily Blind Boxes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create mystery boxes with random on-chain rewards
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-emerald-400 hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Create Blind Box
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border">
            <DialogHeader>
              <DialogTitle className="text-xl gradient-text">Create New Blind Box</DialogTitle>
              <DialogDescription>Set up a mystery box with random rewards</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* Image Upload */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
                  ${dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); }}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop an image or click to select
                    </p>
                  </div>
                )}
              </div>

              {/* Name & Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Box Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mystery Treasure Box"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Image URL (optional)</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-muted/50 border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What mysteries await inside..."
                  className="bg-muted/50 border-border resize-none"
                  rows={2}
                />
              </div>

              {/* Price, Supply, Max */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Price (SOL)
                  </Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Package className="w-3 h-3" /> Total Supply
                  </Label>
                  <Input
                    type="number"
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(e.target.value)}
                    min="1"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Per User</Label>
                  <Input
                    type="number"
                    value={maxPerUser}
                    onChange={(e) => setMaxPerUser(e.target.value)}
                    min="1"
                    className="bg-muted/50 border-border"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Start Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> End Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-muted/50 border-border"
                  />
                </div>
              </div>

              {/* Rewards Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Possible Rewards</Label>
                    <p className="text-[10px] text-muted-foreground">Total weight: {getTotalWeight()}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addReward} className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Reward
                  </Button>
                </div>

                <AnimatePresence>
                  {rewards.map((reward, index) => {
                    const config = RARITY_CONFIG[reward.rarity];
                    const RarityIcon = config.icon;
                    const probability = getTotalWeight() > 0 ? ((reward.weight / getTotalWeight()) * 100).toFixed(1) : 0;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex gap-2 items-end p-3 rounded-lg border ${config.bg} ${config.border}`}
                      >
                        <div className="w-20 space-y-1">
                          <Label className="text-[10px]">Type</Label>
                          <Select value={reward.type} onValueChange={(v) => updateReward(index, "type", v)}>
                            <SelectTrigger className="h-8 text-xs bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nft">NFT</SelectItem>
                              <SelectItem value="token">SOL</SelectItem>
                              <SelectItem value="shop_item">Item</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">Name</Label>
                          <Input
                            value={reward.name}
                            onChange={(e) => updateReward(index, "name", e.target.value)}
                            placeholder="Reward name"
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-[10px]">Value</Label>
                          <Input
                            value={reward.value}
                            onChange={(e) => updateReward(index, "value", e.target.value)}
                            placeholder="Amount"
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-[10px]">Rarity</Label>
                          <Select value={reward.rarity} onValueChange={(v) => updateReward(index, "rarity", v)}>
                            <SelectTrigger className="h-8 text-xs bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="common">Common</SelectItem>
                              <SelectItem value="uncommon">Uncommon</SelectItem>
                              <SelectItem value="rare">Rare</SelectItem>
                              <SelectItem value="epic">Epic</SelectItem>
                              <SelectItem value="legendary">Legendary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                            <RarityIcon className="w-3 h-3 mr-1" />
                            {probability}%
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeReward(index)}
                            disabled={rewards.length <= 1}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !name || !startDate || !endDate}
                className="bg-gradient-to-r from-primary to-emerald-400"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Blind Box
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Box Grid */}
      {!blindBoxes?.length ? (
        <div className="glass-card p-12 text-center">
          <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No blind boxes created yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first mystery box to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {blindBoxes.map((box, i) => {
              const status = getBoxStatus(box);
              const soldPercent = ((box.total_supply - box.remaining_supply) / box.total_supply) * 100;

              return (
                <motion.div
                  key={box.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card overflow-hidden group hover:border-primary/30 transition-all"
                >
                  {/* Image Header */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/20 to-emerald-500/10">
                    {box.image_url ? (
                      <img src={box.image_url} alt={box.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className={`${status.color} text-white text-[10px] px-2`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Switch
                        checked={box.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: box.id, isActive: checked })}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{box.name}</h3>
                        <p className="text-lg font-bold text-primary">{box.price} SOL</p>
                      </div>
                      <button
                        onClick={() => copyBoxId(box.id)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Copy Box ID"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Supply Progress */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{box.total_supply - box.remaining_supply} sold</span>
                        <span>{box.remaining_supply} left</span>
                      </div>
                      <Progress value={soldPercent} className="h-1.5" />
                    </div>

                    {/* Rewards Preview */}
                    <div className="flex flex-wrap gap-1">
                      {(box.rewards || []).slice(0, 3).map((reward: Reward, idx: number) => {
                        const config = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;
                        return (
                          <Badge key={idx} variant="outline" className={`text-[9px] ${config.color} ${config.border}`}>
                            {reward.name}
                          </Badge>
                        );
                      })}
                      {(box.rewards?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-[9px]">+{box.rewards.length - 3}</Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => { setSelectedBox(box); setIsViewOpen(true); }}
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(box.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* View Box Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {selectedBox?.name}
            </DialogTitle>
            <DialogDescription>{selectedBox?.description}</DialogDescription>
          </DialogHeader>

          {selectedBox && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Price</p>
                  <p className="font-bold text-primary">{selectedBox.price} SOL</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
                  <p className="font-bold">{selectedBox.remaining_supply}/{selectedBox.total_supply}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Max Per User</p>
                  <p className="font-bold">{selectedBox.max_per_user}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                  <Badge className={`${getBoxStatus(selectedBox).color} text-white text-xs mt-1`}>
                    {getBoxStatus(selectedBox).label}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-sm">Possible Rewards</h4>
                <div className="space-y-2">
                  {(selectedBox.rewards || []).map((reward: Reward, i: number) => {
                    const config = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;
                    const RarityIcon = config.icon;
                    return (
                      <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${config.bg} ${config.border} border`}>
                        <div className="flex items-center gap-2">
                          <RarityIcon className={`w-4 h-4 ${config.color}`} />
                          <span className="text-sm">{reward.name}</span>
                          <Badge variant="outline" className={`text-[10px] capitalize ${config.color}`}>
                            {reward.rarity}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {reward.type === "token" ? `${reward.value} SOL` : reward.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-sm">Recent Purchases ({boxPurchases?.length || 0})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {boxPurchases?.slice(0, 5).map((purchase: any) => (
                    <div key={purchase.id} className="text-xs flex justify-between py-1.5 px-2 rounded bg-muted/50">
                      <span className="font-mono">{purchase.user_id.slice(0, 8)}...</span>
                      <span>{purchase.quantity} box{purchase.quantity > 1 ? "es" : ""}</span>
                    </div>
                  ))}
                  {!boxPurchases?.length && (
                    <p className="text-xs text-muted-foreground text-center py-2">No purchases yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlindBoxManager;