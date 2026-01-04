import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FilterDropdown, type FilterOption } from "@/components/common";
import { 
  LayoutGrid, 
  BarChart3, 
  Tag, 
  Rocket, 
  Sticker, 
  Leaf, 
  Shield, 
  TrendingUp, 
  Flame 
} from "lucide-react";

interface MarketplaceFiltersProps {
  activeFilter: string;
  onFilterChange: (value: string) => void;
  verifiedOnly: boolean;
  onVerifiedChange: (checked: boolean) => void;
  showHotOnly: boolean;
  onHotChange: () => void;
  showNewOnly: boolean;
  onNewChange: () => void;
  hotCount: number;
  newCount: number;
  verifiedCount: number;
}

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  activeFilter,
  onFilterChange,
  verifiedOnly,
  onVerifiedChange,
  showHotOnly,
  onHotChange,
  showNewOnly,
  onNewChange,
  hotCount,
  newCount,
  verifiedCount,
}) => {
  const filterOptions: FilterOption[] = [
    { value: "all", label: "All Items", icon: LayoutGrid },
    { value: "analytics", label: "Analytics", icon: BarChart3 },
    { value: "listings", label: "NFT Listings", icon: Tag },
    { value: "collections", label: "Collections", icon: Rocket },
    { value: "stickers", label: "Sticker Packs", icon: Sticker },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      {/* Category Dropdown */}
      <FilterDropdown
        options={filterOptions}
        value={activeFilter}
        onChange={onFilterChange}
        minWidth="180px"
      />

      {/* Verified Only Toggle */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-primary" />
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <Label 
          htmlFor="verified-filter" 
          className="text-sm font-medium cursor-pointer whitespace-nowrap"
        >
          LilyPad Verified Only
        </Label>
        <Switch
          id="verified-filter"
          checked={verifiedOnly}
          onCheckedChange={onVerifiedChange}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* Hot Only Toggle */}
      <Button
        variant={showHotOnly ? "default" : "outline"}
        size="sm"
        onClick={onHotChange}
        className={`gap-2 ${showHotOnly ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0' : ''}`}
      >
        <TrendingUp className="w-4 h-4" />
        Hot 🔥
        {showHotOnly && (
          <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
            {hotCount}
          </Badge>
        )}
      </Button>

      {/* New Only Toggle */}
      <Button
        variant={showNewOnly ? "default" : "outline"}
        size="sm"
        onClick={onNewChange}
        className={`gap-2 ${showNewOnly ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0' : ''}`}
      >
        <Flame className="w-4 h-4" />
        New
        {showNewOnly && (
          <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
            {newCount}
          </Badge>
        )}
      </Button>

      {/* Verified count badge */}
      {verifiedOnly && (
        <Badge variant="secondary" className="gap-1">
          <Shield className="w-3 h-3" />
          {verifiedCount} verified
        </Badge>
      )}
    </div>
  );
};
