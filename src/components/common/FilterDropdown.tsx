import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, LucideIcon } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface FilterDropdownProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  minWidth?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  options,
  value,
  onChange,
  className = "",
  minWidth = "180px",
}) => {
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`gap-2 justify-between ${className}`}
          style={{ minWidth }}
        >
          <div className="flex items-center gap-2">
            <SelectedIcon className="w-4 h-4" />
            <span>{selectedOption.label}</span>
            {selectedOption.count !== undefined && selectedOption.count > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selectedOption.count}
              </Badge>
            )}
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-popover" style={{ width: minWidth }}>
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`flex items-center justify-between gap-2 ${isSelected ? "bg-accent" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
                {option.count !== undefined && option.count > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {option.count}
                  </Badge>
                )}
              </div>
              {isSelected && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
