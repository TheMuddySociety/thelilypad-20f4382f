import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Package, Percent, Edit, Clock, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { BundleCountdown } from "@/components/shop/BundleCountdown";
import { getErrorMessage } from "@/lib/errorUtils";

interface ShopItem {
  id: string;
  name: string;
  price_mon: number;
  image_url: string | null;
  category: string;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  discount_percent: number;
  original_price: number;
  bundle_price: number;
  is_active: boolean;
  is_limited_time: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface BundleItem {
  id: string;
  bundle_id: string;
  item_id: string;
  shop_items: ShopItem;
}

export const AdminBundleManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLimitedTime, setIsLimitedTime] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Fetch all bundles
  const { data: bundles = [], isLoading: bundlesLoading } = useQuery({
    queryKey: ['admin-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_bundles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Bundle[];
    }
  });

  // Fetch official packs for selection
  const { data: officialPacks = [] } = useQuery({
    queryKey: ['official-packs-for-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("id, name, price_mon, image_url, category")
        .eq("creator_type", "platform")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as ShopItem[];
    }
  });

  // Fetch bundle items for selected bundle
  const { data: bundleItems = [] } = useQuery({
    queryKey: ['bundle-items', selectedBundle?.id],
    queryFn: async () => {
      if (!selectedBundle) return [];
      const { data, error } = await supabase
        .from("shop_bundle_items")
        .select("*, shop_items(*)")
        .eq("bundle_id", selectedBundle.id);

      if (error) throw error;
      return data as BundleItem[];
    },
    enabled: !!selectedBundle
  });

  const calculatePrices = () => {
    const originalPrice = selectedItems.reduce((sum, itemId) => {
      const item = officialPacks.find(p => p.id === itemId);
      return sum + (item?.price_mon || 0);
    }, 0);
    const bundlePrice = originalPrice * (1 - discountPercent / 100);
    return { originalPrice, bundlePrice: Math.round(bundlePrice * 100) / 100 };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedItems.length < 2) {
      toast.error("Please provide a name and select at least 2 packs");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const creatorId = userData.user?.id || profile?.id;

      if (!creatorId) {
        throw new Error("User profile not found. Please connect your wallet.");
      }

      const { originalPrice, bundlePrice } = calculatePrices();

      // Create bundle
      const { data: bundle, error: bundleError } = await supabase
        .from("shop_bundles")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          discount_percent: discountPercent,
          original_price: originalPrice,
          bundle_price: bundlePrice,
          created_by: userData.user.id,
          is_limited_time: isLimitedTime,
          starts_at: isLimitedTime && startsAt ? new Date(startsAt).toISOString() : null,
          expires_at: isLimitedTime && expiresAt ? new Date(expiresAt).toISOString() : null,
        })
        .select()
        .single();

      if (bundleError) throw bundleError;

      // Add items to bundle
      const bundleItemsData = selectedItems.map(itemId => ({
        bundle_id: bundle.id,
        item_id: itemId,
      }));

      const { error: itemsError } = await supabase
        .from("shop_bundle_items")
        .insert(bundleItemsData);

      if (itemsError) throw itemsError;

      toast.success("Bundle created successfully!");
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      resetForm();
      setCreateModalOpen(false);
    } catch (error: unknown) {
      console.error("Error creating bundle:", error);
      toast.error(getErrorMessage(error) || "Failed to create bundle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (bundleId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("shop_bundles")
        .update({ is_active: !currentActive })
        .eq("id", bundleId);

      if (error) throw error;
      toast.success(`Bundle ${!currentActive ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
    } catch (error: unknown) {
      toast.error("Failed to update bundle: " + getErrorMessage(error));
    }
  };

  const handleDelete = async (bundleId: string) => {
    if (!confirm("Are you sure you want to delete this bundle?")) return;

    try {
      const { error } = await supabase
        .from("shop_bundles")
        .delete()
        .eq("id", bundleId);

      if (error) throw error;
      toast.success("Bundle deleted");
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
    } catch (error: unknown) {
      toast.error("Failed to delete bundle: " + getErrorMessage(error));
    }
  };

  const handleEdit = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setName(bundle.name);
    setDescription(bundle.description || "");
    setDiscountPercent(bundle.discount_percent);
    setIsLimitedTime(bundle.is_limited_time);
    setStartsAt(bundle.starts_at ? format(new Date(bundle.starts_at), "yyyy-MM-dd'T'HH:mm") : "");
    setExpiresAt(bundle.expires_at ? format(new Date(bundle.expires_at), "yyyy-MM-dd'T'HH:mm") : "");
    setEditModalOpen(true);
  };

  const handleUpdateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBundle) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("shop_bundles")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          discount_percent: discountPercent,
          is_limited_time: isLimitedTime,
          starts_at: isLimitedTime && startsAt ? new Date(startsAt).toISOString() : null,
          expires_at: isLimitedTime && expiresAt ? new Date(expiresAt).toISOString() : null,
        })
        .eq("id", selectedBundle.id);

      if (error) throw error;

      toast.success("Bundle updated!");
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      setEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error("Failed to update bundle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDiscountPercent(10);
    setSelectedItems([]);
    setSelectedBundle(null);
    setIsLimitedTime(false);
    setStartsAt("");
    setExpiresAt("");
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const { originalPrice, bundlePrice } = calculatePrices();
  const savings = originalPrice - bundlePrice;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Bundle Deals Manager
        </CardTitle>
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Bundle Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Bundle Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Ultimate Frog Pack"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what's included in this bundle..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="discount"
                      type="number"
                      min={1}
                      max={90}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-24"
                    />
                    <Percent className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Limited Time Toggle */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-amber-500" />
                      <Label htmlFor="limited-time">Limited Time Offer</Label>
                    </div>
                    <Switch
                      id="limited-time"
                      checked={isLimitedTime}
                      onCheckedChange={setIsLimitedTime}
                    />
                  </div>

                  {isLimitedTime && (
                    <div className="grid gap-4 pt-2 border-t">
                      <div>
                        <Label htmlFor="starts-at">Starts At (optional)</Label>
                        <Input
                          id="starts-at"
                          type="datetime-local"
                          value={startsAt}
                          onChange={(e) => setStartsAt(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to start immediately
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="expires-at">Expires At</Label>
                        <Input
                          id="expires-at"
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          required={isLimitedTime}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pack Selection */}
              <div>
                <Label className="mb-3 block">Select Packs (min. 2)</Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {officialPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedItems.includes(pack.id)}
                        onCheckedChange={() => toggleItemSelection(pack.id)}
                      />
                      {pack.image_url && (
                        <img
                          src={pack.image_url}
                          alt={pack.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{pack.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {pack.category.replace("_", " ")}
                        </p>
                      </div>
                      <Badge variant="secondary">{pack.price_mon} SOL</Badge>
                    </div>
                  ))}
                  {officialPacks.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground">
                      No official packs available
                    </p>
                  )}
                </div>
              </div>

              {/* Price Preview */}
              {selectedItems.length >= 2 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Original Price:</span>
                    <span className="line-through text-muted-foreground">{originalPrice} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Savings ({discountPercent}% off):</span>
                    <span>-{savings.toFixed(2)} SOL</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Bundle Price:</span>
                    <span className="text-primary">{bundlePrice.toFixed(2)} SOL</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || selectedItems.length < 2}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Bundle"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {bundlesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : bundles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No bundles created yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bundle</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time Limit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundles.map((bundle) => (
                <TableRow key={bundle.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{bundle.name}</p>
                      {bundle.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {bundle.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Percent className="w-3 h-3" />
                      {bundle.discount_percent}% OFF
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm line-through text-muted-foreground">
                        {bundle.original_price} SOL
                      </p>
                      <p className="font-bold text-primary">
                        {bundle.bundle_price} SOL
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={bundle.is_active ? "default" : "secondary"}>
                        {bundle.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {bundle.is_limited_time ? (
                      <BundleCountdown
                        startsAt={bundle.starts_at}
                        expiresAt={bundle.expires_at}
                        isLimitedTime={bundle.is_limited_time}
                        variant="badge"
                      />
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        Permanent
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(bundle)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(bundle.id, bundle.is_active)}
                      >
                        {bundle.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bundle.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBundle} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Bundle Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-discount">Discount Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-discount"
                  type="number"
                  min={1}
                  max={90}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-24"
                />
                <Percent className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Limited Time Toggle */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-amber-500" />
                  <Label htmlFor="edit-limited-time">Limited Time Offer</Label>
                </div>
                <Switch
                  id="edit-limited-time"
                  checked={isLimitedTime}
                  onCheckedChange={setIsLimitedTime}
                />
              </div>

              {isLimitedTime && (
                <div className="grid gap-4 pt-2 border-t">
                  <div>
                    <Label htmlFor="edit-starts-at">Starts At (optional)</Label>
                    <Input
                      id="edit-starts-at"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-expires-at">Expires At</Label>
                    <Input
                      id="edit-expires-at"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      required={isLimitedTime}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Bundle"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
