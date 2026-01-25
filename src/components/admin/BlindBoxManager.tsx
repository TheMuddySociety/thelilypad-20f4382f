import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Package, Trash2, Eye, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";

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

const RARITY_COLORS = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

const RARITY_WEIGHTS = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1,
};

const BlindBoxManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<BlindBox | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("10");
  const [totalSupply, setTotalSupply] = useState("100");
  const [maxPerUser, setMaxPerUser] = useState("5");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([
    { type: "token", name: "Small SOL", value: "5", rarity: "common", weight: 50 },
    { type: "token", name: "Medium SOL", value: "25", rarity: "rare", weight: 15 },
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
      if (!user && !profile?.id) {
        throw new Error("User profile not found. Please connect your wallet.");
      }

      const creatorId = user?.id || profile?.id;
      if (!creatorId) throw new Error("Could not determine creator ID");

      const supply = parseInt(totalSupply) || 100;

      const boxData = {
        name,
        description: description || null,
        image_url: imageUrl || null,
        price: parseFloat(price) || 0,
        total_supply: supply,
        remaining_supply: supply,
        rewards: rewards.filter(r => r.name && r.value),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        max_per_user: parseInt(maxPerUser) || 5,
        created_by: user.id,
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
      toast.error("Failed to update blind box: " + error.message);
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
      toast.error("Failed to delete blind box: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setPrice("10");
    setTotalSupply("100");
    setMaxPerUser("5");
    setStartDate("");
    setEndDate("");
    setRewards([
      { type: "token", name: "Small SOL", value: "5", rarity: "common", weight: 50 },
    ]);
  };

  const addReward = () => {
    setRewards([...rewards, { type: "token", name: "", value: "", rarity: "common", weight: RARITY_WEIGHTS.common }]);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const updateReward = (index: number, field: keyof Reward, value: any) => {
    const updated = [...rewards];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-update weight based on rarity
    if (field === "rarity") {
      updated[index].weight = RARITY_WEIGHTS[value as keyof typeof RARITY_WEIGHTS];
    }
    setRewards(updated);
  };

  const getBoxStatus = (box: BlindBox) => {
    const now = new Date();
    const start = new Date(box.start_date);
    const end = new Date(box.end_date);

    if (box.remaining_supply === 0) return { label: "Sold Out", variant: "secondary" as const };
    if (!box.is_active) return { label: "Inactive", variant: "outline" as const };
    if (now < start) return { label: "Upcoming", variant: "default" as const };
    if (now > end) return { label: "Ended", variant: "destructive" as const };
    return { label: "Live", variant: "default" as const };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Lily Blind Boxes
          </CardTitle>
          <CardDescription>Create mystery boxes with mixed rewards</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Blind Box
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Blind Box</DialogTitle>
              <DialogDescription>Set up a mystery box with random rewards</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Box Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mystery Treasure Box"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's inside this mystery box..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price (SOL)</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Supply</Label>
                  <Input
                    type="number"
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Per User</Label>
                  <Input
                    type="number"
                    value={maxPerUser}
                    onChange={(e) => setMaxPerUser(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Possible Rewards</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addReward}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Reward
                  </Button>
                </div>
                {rewards.map((reward, index) => (
                  <div key={index} className="flex gap-2 items-end p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={reward.type}
                        onValueChange={(v) => updateReward(index, "type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nft">NFT</SelectItem>
                          <SelectItem value="token">SOL Tokens</SelectItem>
                          <SelectItem value="shop_item">Shop Item</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={reward.name}
                        onChange={(e) => updateReward(index, "name", e.target.value)}
                        placeholder="Reward name"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Value/ID</Label>
                      <Input
                        value={reward.value}
                        onChange={(e) => updateReward(index, "value", e.target.value)}
                        placeholder="Amount or ID"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Rarity</Label>
                      <Select
                        value={reward.rarity}
                        onValueChange={(v) => updateReward(index, "rarity", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common (50%)</SelectItem>
                          <SelectItem value="uncommon">Uncommon (30%)</SelectItem>
                          <SelectItem value="rare">Rare (15%)</SelectItem>
                          <SelectItem value="epic">Epic (4%)</SelectItem>
                          <SelectItem value="legendary">Legendary (1%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReward(index)}
                      disabled={rewards.length <= 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !name || !startDate || !endDate}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Blind Box
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {!blindBoxes?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No blind boxes created yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blindBoxes.map((box) => {
                const status = getBoxStatus(box);
                const soldPercent = ((box.total_supply - box.remaining_supply) / box.total_supply) * 100;
                return (
                  <TableRow key={box.id}>
                    <TableCell className="font-medium">{box.name}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{box.price} SOL</TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="text-xs mb-1">
                          {box.remaining_supply}/{box.total_supply}
                        </div>
                        <Progress value={soldPercent} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(box.end_date), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Switch
                        checked={box.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: box.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBox(box);
                          setIsViewOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(box.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* View Box Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {selectedBox?.name}
            </DialogTitle>
            <DialogDescription>{selectedBox?.description}</DialogDescription>
          </DialogHeader>

          {selectedBox && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">{selectedBox.price} SOL</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-medium">{selectedBox.remaining_supply}/{selectedBox.total_supply}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Per User</p>
                  <p className="font-medium">{selectedBox.max_per_user}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={getBoxStatus(selectedBox).variant}>
                    {getBoxStatus(selectedBox).label}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Possible Rewards</h4>
                <div className="space-y-2">
                  {selectedBox.rewards.map((reward: Reward, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${RARITY_COLORS[reward.rarity]}`} />
                        <span className="text-sm">{reward.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{reward.rarity}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {reward.type === "token" ? `${reward.value} SOL` : reward.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recent Purchases ({boxPurchases?.length || 0})</h4>
                {boxPurchases?.slice(0, 5).map((purchase: any) => (
                  <div key={purchase.id} className="text-sm flex justify-between py-1 border-b border-border/50">
                    <span className="font-mono text-xs">{purchase.user_id.slice(0, 8)}...</span>
                    <span>{purchase.quantity} box(es)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BlindBoxManager;