import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SOLANA_STANDARDS, SolanaStandard } from '@/config/solana';
import { Sparkles, Layers, Boxes, Gift, FileText } from 'lucide-react';

interface SolanaStandardSelectorProps {
  value: SolanaStandard;
  onChange: (value: SolanaStandard) => void;
  disabled?: boolean;
}

const standardIcons: Record<SolanaStandard, React.ReactNode> = {
  'core': <Sparkles className="h-5 w-5" />,
  'token-metadata': <FileText className="h-5 w-5" />,
  'bubblegum': <Boxes className="h-5 w-5" />,
  'candy-machine': <Gift className="h-5 w-5" />,
  'inscription': <Layers className="h-5 w-5" />,
};

const standardBadges: Record<SolanaStandard, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'core': { label: 'Recommended', variant: 'default' },
  'token-metadata': { label: 'Classic', variant: 'secondary' },
  'bubblegum': { label: 'Low Cost', variant: 'outline' },
  'candy-machine': { label: 'Fair Launch', variant: 'secondary' },
  'inscription': { label: 'On-Chain', variant: 'outline' },
};

export const SolanaStandardSelector = ({ 
  value, 
  onChange, 
  disabled = false 
}: SolanaStandardSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">NFT Standard</Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as SolanaStandard)}
        disabled={disabled}
        className="grid gap-3"
      >
        {SOLANA_STANDARDS.map((standard) => (
          <Card 
            key={standard.id}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              value === standard.id ? 'border-primary bg-primary/5' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onChange(standard.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <RadioGroupItem 
                  value={standard.id} 
                  id={standard.id}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">
                      {standardIcons[standard.id]}
                    </span>
                    <Label 
                      htmlFor={standard.id} 
                      className="text-sm font-semibold cursor-pointer"
                    >
                      {standard.name}
                    </Label>
                    <Badge variant={standardBadges[standard.id].variant} className="text-xs">
                      {standardBadges[standard.id].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {standard.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
};

export default SolanaStandardSelector;
