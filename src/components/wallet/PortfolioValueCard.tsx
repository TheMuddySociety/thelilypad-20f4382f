import { TrendingUp, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PortfolioValueCardProps {
  totalValue: number;
  currency: string;
  nftCount: number;
  collectionCount: number;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function PortfolioValueCard({
  totalValue,
  currency,
  nftCount,
  collectionCount,
  isLoading,
  error,
  onRefresh,
}: PortfolioValueCardProps) {
  const formattedValue = totalValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">
              Estimated Portfolio Value
            </p>
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Calculating...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">Unable to fetch prices</span>
                </div>
              ) : (
                <>
                  <span className="text-3xl font-bold text-foreground">
                    {formattedValue}
                  </span>
                  <span className="text-lg font-medium text-primary">
                    {currency}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh floor prices</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="p-2 rounded-full bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total NFTs</p>
            <p className="text-lg font-semibold">{nftCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Collections</p>
            <p className="text-lg font-semibold">{collectionCount}</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          * Based on collection floor prices from OpenSea & LooksRare
        </p>
      </CardContent>
    </Card>
  );
}
