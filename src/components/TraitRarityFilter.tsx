import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, X, Sparkles, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TraitValue {
  value: string;
  count: number;
  percentage: number;
}

interface TraitType {
  name: string;
  values: TraitValue[];
  isOpen: boolean;
}

interface TraitRarityFilterProps {
  collectionId: string;
  selectedTraits: Map<string, Set<string>>;
  onTraitSelect: (traitType: string, value: string) => void;
  onClearAll: () => void;
  totalNfts: number;
}

export function TraitRarityFilter({
  collectionId,
  selectedTraits,
  onTraitSelect,
  onClearAll,
  totalNfts
}: TraitRarityFilterProps) {
  const [traits, setTraits] = useState<TraitType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTraitRarity();
  }, [collectionId]);

  const fetchTraitRarity = async () => {
    setIsLoading(true);
    try {
      const { data: nfts } = await supabase
        .from("minted_nfts")
        .select("attributes")
        .eq("collection_id", collectionId);

      if (nfts) {
        // Aggregate traits
        const traitMap = new Map<string, Map<string, number>>();
        
        nfts.forEach(nft => {
          const attributes = (nft.attributes as { trait_type: string; value: string }[]) || [];
          attributes.forEach(attr => {
            if (!traitMap.has(attr.trait_type)) {
              traitMap.set(attr.trait_type, new Map());
            }
            const valueMap = traitMap.get(attr.trait_type)!;
            valueMap.set(attr.value, (valueMap.get(attr.value) || 0) + 1);
          });
        });

        // Convert to array and calculate percentages
        const traitTypes: TraitType[] = Array.from(traitMap.entries())
          .map(([name, valueMap]) => ({
            name,
            isOpen: selectedTraits.has(name),
            values: Array.from(valueMap.entries())
              .map(([value, count]) => ({
                value,
                count,
                percentage: nfts.length > 0 ? (count / nfts.length) * 100 : 0
              }))
              .sort((a, b) => b.count - a.count)
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setTraits(traitTypes);
      }
    } catch (error) {
      console.error("Error fetching trait rarity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTraitSection = (traitName: string) => {
    setTraits(prev => prev.map(t => 
      t.name === traitName ? { ...t, isOpen: !t.isOpen } : t
    ));
  };

  const getSelectedCount = () => {
    let count = 0;
    selectedTraits.forEach(values => count += values.size);
    return count;
  };

  const selectedCount = getSelectedCount();

  const getRarityColor = (percentage: number) => {
    if (percentage <= 1) return "text-yellow-500"; // Legendary
    if (percentage <= 5) return "text-purple-500"; // Epic
    if (percentage <= 15) return "text-blue-500"; // Rare
    if (percentage <= 30) return "text-green-500"; // Uncommon
    return "text-muted-foreground"; // Common
  };

  const getRarityLabel = (percentage: number) => {
    if (percentage <= 1) return "Legendary";
    if (percentage <= 5) return "Epic";
    if (percentage <= 15) return "Rare";
    if (percentage <= 30) return "Uncommon";
    return "Common";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Traits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (traits.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Traits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No traits available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Traits
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedCount}
              </Badge>
            )}
          </CardTitle>
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={onClearAll}
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px]">
          <div className="px-4 pb-4 space-y-1">
            {traits.map((trait) => (
              <Collapsible
                key={trait.name}
                open={trait.isOpen}
                onOpenChange={() => toggleTraitSection(trait.name)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-9 px-2 hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2">
                      {trait.isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{trait.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedTraits.has(trait.name) && selectedTraits.get(trait.name)!.size > 0 && (
                        <Badge variant="secondary" className="h-5 text-xs">
                          {selectedTraits.get(trait.name)!.size}
                        </Badge>
                      )}
                      <Badge variant="outline" className="h-5 text-xs">
                        {trait.values.length}
                      </Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pr-2 space-y-1 pt-1">
                  {trait.values.map((value) => {
                    const isSelected = selectedTraits.get(trait.name)?.has(value.value) || false;
                    return (
                      <Button
                        key={value.value}
                        variant={isSelected ? "secondary" : "ghost"}
                        size="sm"
                        className={`w-full justify-between h-auto py-2 px-2 ${isSelected ? "ring-1 ring-primary" : ""}`}
                        onClick={() => onTraitSelect(trait.name, value.value)}
                      >
                        <div className="flex flex-col items-start gap-0.5 text-left min-w-0 flex-1">
                          <span className="text-sm truncate w-full">{value.value}</span>
                          <div className="flex items-center gap-2 w-full">
                            <Progress 
                              value={value.percentage} 
                              className="h-1 flex-1" 
                            />
                            <span className={`text-xs ${getRarityColor(value.percentage)}`}>
                              {value.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 ml-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRarityColor(value.percentage)} border-current/30`}
                          >
                            {value.count}
                          </Badge>
                          {value.percentage <= 5 && (
                            <span className={`text-[10px] ${getRarityColor(value.percentage)} flex items-center gap-0.5`}>
                              <Sparkles className="w-2.5 h-2.5" />
                              {getRarityLabel(value.percentage)}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Selected traits display component
export function SelectedTraitsBar({
  selectedTraits,
  onRemoveTrait,
  onClearAll,
  filteredCount,
  totalCount
}: {
  selectedTraits: Map<string, Set<string>>;
  onRemoveTrait: (traitType: string, value: string) => void;
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
}) {
  const allSelected: { traitType: string; value: string }[] = [];
  selectedTraits.forEach((values, traitType) => {
    values.forEach(value => {
      allSelected.push({ traitType, value });
    });
  });

  if (allSelected.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
      <span className="text-sm text-muted-foreground">
        Showing {filteredCount} of {totalCount}:
      </span>
      {allSelected.map(({ traitType, value }) => (
        <Badge
          key={`${traitType}-${value}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          <span className="text-muted-foreground">{traitType}:</span> {value}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1 hover:bg-destructive/20"
            onClick={() => onRemoveTrait(traitType, value)}
          >
            <X className="w-3 h-3" />
          </Button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs text-muted-foreground"
        onClick={onClearAll}
      >
        Clear All
      </Button>
    </div>
  );
}
