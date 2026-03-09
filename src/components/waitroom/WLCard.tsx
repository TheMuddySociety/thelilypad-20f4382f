import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { LilyPadLogo } from '@/components/LilyPadLogo';

interface WLCardProps {
  displayName: string;
  avatarUrl?: string;
  affiliateLink: string;
  referralCount: number;
}

export function WLCard({ displayName, avatarUrl, affiliateLink, referralCount }: WLCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      // Use html2canvas-like approach with canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 340;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 340);
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(0.5, '#0f2847');
      grad.addColorStop(1, '#0a1628');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, 600, 340, 20);
      ctx.fill();

      // Border glow
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.roundRect(4, 4, 592, 332, 18);
      ctx.stroke();

      // Title
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 28px system-ui';
      ctx.fillText('🐸 THE LILY PAD', 30, 50);

      // WL Badge
      ctx.fillStyle = '#22c55e20';
      ctx.roundRect(30, 70, 160, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px system-ui';
      ctx.fillText('✅ WHITELISTED', 50, 95);

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui';
      ctx.fillText(displayName, 30, 155);

      // Referral count
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui';
      ctx.fillText(`${referralCount} referrals`, 30, 185);

      // Affiliate link
      ctx.fillStyle = '#22c55e';
      ctx.font = '12px system-ui';
      ctx.fillText(affiliateLink || 'thelilypad.lovable.app', 30, 310);

      // Download
      const link = document.createElement('a');
      link.download = `lilypad-wl-${displayName.replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('WL Card downloaded!');
    } catch (e) {
      toast.error('Failed to download card');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'I\'m Whitelisted on The Lily Pad! 🐸',
          text: `Join me on The Lily Pad! Use my referral link:`,
          url: affiliateLink,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(affiliateLink);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-3">
      {/* Visual card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[hsl(var(--card))]/80 to-[hsl(var(--card))]/40 backdrop-blur-xl p-6"
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LilyPadLogo size={28} />
              <span className="font-bold text-sm text-primary">THE LILY PAD</span>
            </div>
            <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold">
              ✅ WHITELISTED
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 border-2 border-primary/50">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg">{displayName}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {referralCount} referrals
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground truncate">
            {affiliateLink}
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleDownload}>
          <Download className="w-3 h-3" /> Download Card
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleShare}>
          <Share2 className="w-3 h-3" /> Share
        </Button>
      </div>
    </div>
  );
}
