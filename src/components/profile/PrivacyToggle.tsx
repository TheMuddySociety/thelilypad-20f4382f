import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EyeOff } from 'lucide-react';

interface PrivacyToggleProps {
  isPrivate: boolean;
  onChange: (value: boolean) => void;
}

export function PrivacyToggle({ isPrivate, onChange }: PrivacyToggleProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-primary" />
          Privacy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="privacy-toggle" className="text-sm font-medium">
              Private NFT Portfolio
            </Label>
            <p className="text-xs text-muted-foreground">
              Hide your NFT collection from public view. Your bio and socials remain visible.
            </p>
          </div>
          <Switch
            id="privacy-toggle"
            checked={isPrivate}
            onCheckedChange={onChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
