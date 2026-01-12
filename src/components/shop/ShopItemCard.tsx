import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileEdit, Trash2, Smile, Sticker, Crown, Star, Lock } from "lucide-react";

interface ShopItemCardProps {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  tier: string;
  priceMon: number;
  totalSales: number;
  isActive: boolean;
  hasHolderRequirement: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const tierConfig: Record<string, { color: string; icon: React.ElementType }> = {
  free: { color: "bg-muted text-muted-foreground border-muted", icon: Star },
  basic: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Star },
  premium: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Crown },
  exclusive: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Crown },
};

export const ShopItemCard: React.FC<ShopItemCardProps> = ({
  id,
  name,
  description,
  imageUrl,
  category,
  tier,
  priceMon,
  totalSales,
  isActive,
  hasHolderRequirement,
  onEdit,
  onDelete,
}) => {
  const tierInfo = tierConfig[tier] || tierConfig.basic;
  const TierIcon = tierInfo.icon;
  const CategoryIcon = category === "emoji_pack" ? Smile : Sticker;

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <CategoryIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm sm:text-base truncate">{name}</h3>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            <CategoryIcon className="w-3 h-3 mr-1" />
            {category === "emoji_pack" ? "Emojis" : "Stickers"}
          </Badge>
          <Badge variant="outline" className={`text-xs ${tierInfo.color}`}>
            <TierIcon className="w-3 h-3 mr-1" />
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
          {hasHolderRequirement && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
              <Lock className="w-3 h-3 mr-1" />
              Holder
            </Badge>
          )}
          {!isActive && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </div>
      
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-sm font-bold text-primary">
          {priceMon > 0 ? `${priceMon} SOL` : "Free"}
        </div>
        <div className="text-xs text-muted-foreground">
          {totalSales} {totalSales === 1 ? "sale" : "sales"}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(id)}
        >
          <FileEdit className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
