import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import type { NFT } from "@/hooks/useWalletNFTs";

export type SortOption = "name-asc" | "name-desc" | "collection-asc" | "collection-desc";

interface NFTFiltersProps {
  nfts: NFT[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCollections: string[];
  onCollectionsChange: (collections: string[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  disabled?: boolean;
}

export const NFTFilters: React.FC<NFTFiltersProps> = ({
  nfts,
  searchQuery,
  onSearchChange,
  selectedCollections,
  onCollectionsChange,
  sortBy,
  onSortChange,
  disabled = false,
}) => {
  // Extract unique collections from NFTs
  const collections = useMemo(() => {
    const collectionSet = new Set<string>();
    nfts.forEach((nft) => {
      if (nft.collection) {
        collectionSet.add(nft.collection);
      }
    });
    return Array.from(collectionSet).sort();
  }, [nfts]);

  const handleCollectionToggle = (collection: string) => {
    if (selectedCollections.includes(collection)) {
      onCollectionsChange(selectedCollections.filter((c) => c !== collection));
    } else {
      onCollectionsChange([...selectedCollections, collection]);
    }
  };

  const clearFilters = () => {
    onSearchChange("");
    onCollectionsChange([]);
    onSortChange("name-asc");
  };

  const hasActiveFilters = searchQuery || selectedCollections.length > 0 || sortBy !== "name-asc";

  return (
    <div className="space-y-3">
      {/* Search and Controls Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
            disabled={disabled}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)} disabled={disabled}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="collection-asc">Collection (A-Z)</SelectItem>
            <SelectItem value="collection-desc">Collection (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        {/* Collection Filter Popover */}
        {collections.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2"
                disabled={disabled}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Collections</span>
                {selectedCollections.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {selectedCollections.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filter by Collection</span>
                  {selectedCollections.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onCollectionsChange([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  {collections.map((collection) => (
                    <label
                      key={collection}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCollections.includes(collection)}
                        onCheckedChange={() => handleCollectionToggle(collection)}
                      />
                      <span className="text-sm truncate flex-1" title={collection}>
                        {collection}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {selectedCollections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCollections.map((collection) => (
            <Badge
              key={collection}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-muted"
              onClick={() => handleCollectionToggle(collection)}
            >
              <span className="truncate max-w-[150px]">{collection}</span>
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to filter and sort NFTs
export function filterAndSortNFTs(
  nfts: NFT[],
  searchQuery: string,
  selectedCollections: string[],
  sortBy: SortOption
): NFT[] {
  let filtered = [...nfts];

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (nft) =>
        nft.name?.toLowerCase().includes(query) ||
        nft.collection?.toLowerCase().includes(query) ||
        nft.tokenId?.toLowerCase().includes(query)
    );
  }

  // Filter by selected collections
  if (selectedCollections.length > 0) {
    filtered = filtered.filter((nft) => 
      nft.collection && selectedCollections.includes(nft.collection)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "");
      case "collection-asc":
        return (a.collection || "").localeCompare(b.collection || "");
      case "collection-desc":
        return (b.collection || "").localeCompare(a.collection || "");
      default:
        return 0;
    }
  });

  return filtered;
}

export default NFTFilters;
