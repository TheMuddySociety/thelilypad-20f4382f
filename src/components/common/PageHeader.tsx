import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Globe, LucideIcon } from "lucide-react";

interface PageHeaderProps {
  logo?: React.ReactNode;
  title: string;
  subtitle?: string;
  networkName?: string;
  isTestnet?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  logo,
  title,
  subtitle,
  networkName,
  isTestnet = false,
  actions,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 ${className}`}>
      <div className="flex items-center gap-4">
        {logo}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-bold">{title}</h1>
            {networkName && (
              <Badge 
                variant="outline" 
                className={isTestnet 
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                  : "bg-primary/10 text-primary border-primary/30"
                }
              >
                {isTestnet ? (
                  <FlaskConical className="w-3 h-3 mr-1" />
                ) : (
                  <Globe className="w-3 h-3 mr-1" />
                )}
                {networkName}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
