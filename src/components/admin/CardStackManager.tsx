import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Layers3, Plus, Trash2, Edit, Eye, GripVertical, ExternalLink } from "lucide-react";
import { CardStack, CardStackItem } from "@/components/ui/card-stack";

interface CardStackItemRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  href: string | null;
  cta_label: string | null;
  tag: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const CardStackManager: React.FC = () => {
  const [items, setItems] = useState<CardStackItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [href, setHref] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [tag, setTag] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("card_stack_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching card stack items:", error);
      toast({
        title: "Error",
        description: "Failed to load card stack items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setHref("");
    setCtaLabel("");
    setTag("");
    setDisplayOrder(items.length);
    setIsActive(true);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setDisplayOrder(items.length);
    setModalOpen(true);
  };

  const openEditModal = (item: CardStackItemRow) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description || "");
    setImageUrl(item.image_url || "");
    setHref(item.href || "");
    setCtaLabel(item.cta_label || "");
    setTag(item.tag || "");
    setDisplayOrder(item.display_order);
    setIsActive(item.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        href: href.trim() || null,
        cta_label: ctaLabel.trim() || null,
        tag: tag.trim() || null,
        display_order: displayOrder,
        is_active: isActive,
      };

      if (editingId) {
        const { error } = await supabase
          .from("card_stack_items")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Card updated" });
      } else {
        const { error } = await supabase
          .from("card_stack_items")
          .insert(payload);

        if (error) throw error;
        toast({ title: "Success", description: "Card added" });
      }

      setModalOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      console.error("Error saving card:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this card?")) return;

    try {
      const { error } = await supabase
        .from("card_stack_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Card deleted" });
      fetchItems();
    } catch (error) {
      console.error("Error deleting card:", error);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (item: CardStackItemRow) => {
    try {
      const { error } = await supabase
        .from("card_stack_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Card ${item.is_active ? "deactivated" : "activated"}`,
      });
      fetchItems();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // Map to CardStack format for preview
  const previewItems: CardStackItem[] = items
    .filter((i) => i.is_active)
    .map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description || undefined,
      imageSrc: i.image_url || undefined,
      href: i.href || undefined,
      ctaLabel: i.cta_label || undefined,
      tag: i.tag || undefined,
    }));

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
                <Layers3 className="w-5 h-5 text-primary" />
                CardStack Manager
              </CardTitle>
              <CardDescription>
                Manage the 3D card stack showcase displayed on your site
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={previewItems.length === 0}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button onClick={openAddModal} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Card
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No cards yet. Add your first card to get started.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-16 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-10 rounded-lg bg-muted flex items-center justify-center text-xs">
                              No img
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Link
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.is_active ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleActive(item)}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
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
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Card" : "Add New Card"}</DialogTitle>
            <DialogDescription>
              Configure a card for the 3D stack showcase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Card title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                rows={2}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="href">Link URL</Label>
                <Input
                  id="href"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="/page or https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Featured"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "Save Changes" : "Add Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CardStack Preview</DialogTitle>
            <DialogDescription>
              Preview of active cards in the 3D stack
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            {previewItems.length > 0 ? (
              <CardStack
                items={previewItems}
                cardWidth={400}
                cardHeight={250}
                autoAdvance
                pauseOnHover
              />
            ) : (
              <p className="text-center text-muted-foreground">
                No active cards to preview
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
