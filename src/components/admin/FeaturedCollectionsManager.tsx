import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Calendar, Plus, Trash2, Edit, Sparkles, Search, Eye, Home, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { FeaturedCollectionsSlideshow } from "@/components/sections/FeaturedCollectionsSlideshow";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_HOMEPAGE_FEATURED = 5;

interface Collection {
  id: string;
  name: string;
  symbol: string;
  image_url: string | null;
  status: string;
}

interface FeaturedCollection {
  id: string;
  collection_id: string;
  feature_type: string;
  start_date: string;
  end_date: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  collection: Collection | null;
}

export const FeaturedCollectionsManager: React.FC = () => {
  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>([]);
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collectionSearchTerm, setCollectionSearchTerm] = useState("");

  // Form state
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [featureType, setFeatureType] = useState<string>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchFeaturedCollections(), fetchAvailableCollections()]);
    setLoading(false);
  };

  const fetchFeaturedCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("featured_collections")
        .select(`
          *,
          collection:collections (
            id,
            name,
            symbol,
            image_url,
            status
          )
        `)
        .order("feature_type", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFeaturedCollections(data || []);
    } catch (error) {
      console.error("Error fetching featured collections:", error);
      toast({
        title: "Error",
        description: "Failed to load featured collections",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, symbol, image_url, status")
        .is("deleted_at", null)
        .order("name", { ascending: true });

      if (error) throw error;
      setAvailableCollections(data || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const resetForm = () => {
    setSelectedCollectionId("");
    setFeatureType("monthly");
    setStartDate("");
    setEndDate("");
    setDisplayOrder(0);
    setIsActive(true);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    // Set default dates
    const today = new Date();
    setStartDate(today.toISOString().split("T")[0]);
    if (featureType === "monthly") {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setEndDate(nextMonth.toISOString().split("T")[0]);
    } else {
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setEndDate(nextWeek.toISOString().split("T")[0]);
    }
    setModalOpen(true);
  };

  const openEditModal = (featured: FeaturedCollection) => {
    setEditingId(featured.id);
    setSelectedCollectionId(featured.collection_id);
    setFeatureType(featured.feature_type);
    setStartDate(featured.start_date);
    setEndDate(featured.end_date);
    setDisplayOrder(featured.display_order);
    setIsActive(featured.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedCollectionId || !startDate || !endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        collection_id: selectedCollectionId,
        feature_type: featureType,
        start_date: startDate,
        end_date: endDate,
        display_order: displayOrder,
        is_active: isActive,
      };

      if (editingId) {
        const { error } = await supabase
          .from("featured_collections")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Featured collection updated",
        });
      } else {
        const { error } = await supabase
          .from("featured_collections")
          .insert(payload);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Collection added to featured",
        });
      }

      setModalOpen(false);
      resetForm();
      fetchFeaturedCollections();
    } catch (error: any) {
      console.error("Error saving featured collection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this collection from featured?")) return;

    try {
      const { error } = await supabase
        .from("featured_collections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Collection removed from featured",
      });
      fetchFeaturedCollections();
    } catch (error) {
      console.error("Error deleting featured collection:", error);
      toast({
        title: "Error",
        description: "Failed to remove collection",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (featured: FeaturedCollection) => {
    try {
      const { error } = await supabase
        .from("featured_collections")
        .update({ is_active: !featured.is_active })
        .eq("id", featured.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Collection ${featured.is_active ? "deactivated" : "activated"}`,
      });
      fetchFeaturedCollections();
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const filteredFeatured = featuredCollections.filter(
    (f) =>
      f.collection?.name.toLowerCase().includes(collectionSearchTerm.toLowerCase()) ||
      f.collection?.symbol.toLowerCase().includes(collectionSearchTerm.toLowerCase())
  );

  const homepageFeatured = filteredFeatured.filter((f) => f.feature_type === "homepage");
  const monthlyFeatured = filteredFeatured.filter((f) => f.feature_type === "monthly");
  const weeklyFeatured = filteredFeatured.filter((f) => f.feature_type === "weekly");

  const canAddHomepage = homepageFeatured.filter(f => f.is_active).length < MAX_HOMEPAGE_FEATURED;

  const filteredAvailableCollections = availableCollections.filter(
    (c) =>
      c.name.toLowerCase().includes(collectionSearchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(collectionSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Featured Collections
              </CardTitle>
              <CardDescription>
                Manage monthly and weekly featured collections for the landing page
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button onClick={openAddModal} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Featured
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search featured collections..."
              value={collectionSearchTerm}
              onChange={(e) => setCollectionSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Homepage Featured (Marketplace & Landing) */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-primary" />
              Homepage Featured ({homepageFeatured.filter(f => f.is_active).length}/{MAX_HOMEPAGE_FEATURED})
            </h3>
            {!canAddHomepage && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Maximum of {MAX_HOMEPAGE_FEATURED} active homepage featured collections reached. Deactivate one to add another.
                </AlertDescription>
              </Alert>
            )}
            {homepageFeatured.length === 0 ? (
              <p className="text-muted-foreground text-sm">No homepage featured collections</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {homepageFeatured.map((featured) => (
                      <TableRow key={featured.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {featured.collection?.image_url ? (
                              <img
                                src={featured.collection.image_url}
                                alt={featured.collection.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                {featured.collection?.symbol?.slice(0, 2) || "?"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{featured.collection?.name || "Deleted"}</p>
                              <p className="text-xs text-muted-foreground">{featured.collection?.symbol}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(featured.start_date), "MMM d")} -{" "}
                            {format(new Date(featured.end_date), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>{featured.display_order}</TableCell>
                        <TableCell>
                          <Badge
                            variant={featured.is_active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleActive(featured)}
                          >
                            {featured.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(featured)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(featured.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Monthly Featured */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-500" />
              Monthly Featured ({monthlyFeatured.length})
            </h3>
            {monthlyFeatured.length === 0 ? (
              <p className="text-muted-foreground text-sm">No monthly featured collections</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyFeatured.map((featured) => (
                      <TableRow key={featured.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {featured.collection?.image_url ? (
                              <img
                                src={featured.collection.image_url}
                                alt={featured.collection.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                {featured.collection?.symbol?.slice(0, 2) || "?"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{featured.collection?.name || "Deleted"}</p>
                              <p className="text-xs text-muted-foreground">{featured.collection?.symbol}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(featured.start_date), "MMM d")} -{" "}
                            {format(new Date(featured.end_date), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>{featured.display_order}</TableCell>
                        <TableCell>
                          <Badge
                            variant={featured.is_active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleActive(featured)}
                          >
                            {featured.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(featured)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(featured.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Weekly Featured */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-violet-500" />
              Weekly Featured ({weeklyFeatured.length})
            </h3>
            {weeklyFeatured.length === 0 ? (
              <p className="text-muted-foreground text-sm">No weekly featured collections</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyFeatured.map((featured) => (
                      <TableRow key={featured.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {featured.collection?.image_url ? (
                              <img
                                src={featured.collection.image_url}
                                alt={featured.collection.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                {featured.collection?.symbol?.slice(0, 2) || "?"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{featured.collection?.name || "Deleted"}</p>
                              <p className="text-xs text-muted-foreground">{featured.collection?.symbol}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(featured.start_date), "MMM d")} -{" "}
                            {format(new Date(featured.end_date), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>{featured.display_order}</TableCell>
                        <TableCell>
                          <Badge
                            variant={featured.is_active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleActive(featured)}
                          >
                            {featured.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(featured)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(featured.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Featured Collection" : "Add Featured Collection"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the featured collection settings"
                : "Select a collection to feature on the landing page"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Collection Select */}
            <div className="space-y-2">
              <Label>Collection *</Label>
              <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {availableCollections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        <div className="flex items-center gap-2">
                          {collection.image_url ? (
                            <img
                              src={collection.image_url}
                              alt={collection.name}
                              className="w-6 h-6 rounded object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                              {collection.symbol?.slice(0, 2)}
                            </div>
                          )}
                          <span>{collection.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {collection.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Feature Type */}
            <div className="space-y-2">
              <Label>Feature Type *</Label>
              <Select value={featureType} onValueChange={setFeatureType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homepage" disabled={!canAddHomepage && featureType !== "homepage"}>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-primary" />
                      Homepage Featured (Max {MAX_HOMEPAGE_FEATURED})
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      Monthly Feature
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-violet-500" />
                      Weekly Feature
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                placeholder="0 = first"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in the slideshow
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Button
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? "Active" : "Inactive"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "Update" : "Add Featured"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Landing Page Preview
            </DialogTitle>
            <DialogDescription>
              Preview how the featured collections will appear on the landing page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Monthly Preview */}
            <FeaturedCollectionsSlideshow
              featureType="monthly"
              title="Collection of the Month"
              subtitle="Our top pick for this month"
              icon={<Crown className="w-5 h-5" />}
              gradientFrom="from-amber-500/20"
              gradientTo="to-orange-500/20"
              autoPlayInterval={6000}
            />

            {/* Weekly Preview */}
            <FeaturedCollectionsSlideshow
              featureType="weekly"
              title="Weekly Spotlight"
              subtitle="This week's highlighted collections"
              icon={<Calendar className="w-5 h-5" />}
              gradientFrom="from-violet-500/20"
              gradientTo="to-purple-500/20"
              autoPlayInterval={4000}
            />

            {monthlyFeatured.length === 0 && weeklyFeatured.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Active Featured Collections</p>
                <p className="text-sm">Add some featured collections to see the preview</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
