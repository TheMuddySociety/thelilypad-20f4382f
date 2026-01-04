import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

export interface StatItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  loading?: boolean;
  suffix?: string;
  className?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ 
  stats, 
  columns = 4,
  className = "" 
}) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-5",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index} className={stat.className}>
          <CardContent className="pt-6">
            {stat.loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="flex items-center gap-2">
                {stat.icon && <stat.icon className="w-5 h-5 text-muted-foreground" />}
                <div className="text-2xl font-bold">
                  {stat.value}
                  {stat.suffix && <span className="text-base font-normal text-muted-foreground ml-1">{stat.suffix}</span>}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
