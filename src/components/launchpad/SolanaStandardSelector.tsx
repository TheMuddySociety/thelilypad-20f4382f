import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  SolanaStandard, 
  SOLANA_STANDARDS_CONFIG,
  getStandardFeatures 
} from '@/config/solana';
import { Sparkles, Layers, Boxes, Gift, FileText, Music, Shield, Zap } from 'lucide-react';

interface SolanaStandardSelectorProps {
  value: SolanaStandard;
  onChange: (value: SolanaStandard) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

const standardIcons: Record<SolanaStandard, React.ReactNode> = {
  'core': <Sparkles className="h-5 w-5" />,
  'token-metadata': <FileText className="h-5 w-5" />,
  'bubblegum': <Boxes className="h-5 w-5" />,
  'candy-machine': <Gift className="h-5 w-5" />,
  'inscription': <Layers className="h-5 w-5" />,
};

export const SolanaStandardSelector = ({ 
  value, 
  onChange, 
  disabled = false,
  showDetails = true
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
        {Object.values(SOLANA_STANDARDS_CONFIG).map((config) => {
          const features = config.features;
          const isSelected = value === config.id;
          
          return (
            <Card 
              key={config.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isSelected ? 'border-primary bg-primary/5' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onChange(config.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem 
                    value={config.id} 
                    id={config.id}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={isSelected ? "text-primary" : "text-muted-foreground"}>
                        {standardIcons[config.id]}
                      </span>
                      <Label 
                        htmlFor={config.id} 
                        className="text-sm font-semibold cursor-pointer"
                      >
                        {config.name}
                      </Label>
                      <Badge variant={features.badge.variant as any} className="text-xs">
                        {features.badge.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {features.costPerMint}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {config.description}
                    </p>
                    
                    {showDetails && (
                      <>
                        {/* Supported Types */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {features.supportedTypes.map(type => (
                            <Badge 
                              key={type} 
                              variant="secondary" 
                              className="text-[9px] px-1.5 py-0"
                            >
                              {type === 'one_of_one' ? '1/1s' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Feature Indicators */}
                        <div className="flex flex-wrap gap-1">
                          {features.supportsMusic && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-pink-500 border-pink-500/30">
                              <Music className="w-2.5 h-2.5 mr-0.5" /> Music
                            </Badge>
                          )}
                          {features.supportsCompression && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-500 border-blue-500/30">
                              <Zap className="w-2.5 h-2.5 mr-0.5" /> Compressed
                            </Badge>
                          )}
                          {features.supportsMasterEdition && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                              Master Edition
                            </Badge>
                          )}
                          {features.supportsOnChainMetadata && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500 border-emerald-500/30">
                              On-Chain
                            </Badge>
                          )}
                          {features.supportsCandyMachine && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-purple-500 border-purple-500/30">
                              <Shield className="w-2.5 h-2.5 mr-0.5" /> Candy Machine
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default SolanaStandardSelector;
