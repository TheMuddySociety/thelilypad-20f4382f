import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShopItemCard } from "./ShopItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  tier: string;
  price_mon: number;
  total_sales: number;
  is_active: boolean;
  required_collection_id: string | null;
  created_at: string;
}

interface ShopItemsListProps {
  userId: string;
  onEdit: (id: string) => void;
  onCreateNew: () => void;
  refreshTrigger?: number;
}

export const ShopItemsList: React.FC<ShopItemsListProps> = ({
  userId,
  onEdit,
  onCreateNew,
  refreshTrigger,
}) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching shop items:", error);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchItems();
    }
  }, [userId, refreshTrigger]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("shop_items")
        .delete()
        .eq("id", deleteId)
        .eq("creator_id", userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete shop item",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deleted",
          description: "Shop item removed successfully",
        });
        fetchItems();
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Sticker className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No shop items yet</p>
        <Button variant="link" onClick={onCreateNew}>
          Create your first sticker pack
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {items.map((item) => (
          <ShopItemCard
            key={item.id}
            id={item.id}
            name={item.name}
            description={item.description}
            imageUrl={item.image_url}
            category={item.category}
            tier={item.tier}
            priceMon={Number(item.price_mon)}
            totalSales={item.total_sales}
            isActive={item.is_active}
            hasHolderRequirement={!!item.required_collection_id}
            onEdit={onEdit}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sticker/emoji pack. Existing buyers will still have access to their purchased content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
