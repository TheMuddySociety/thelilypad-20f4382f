import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Link, Twitter, Facebook, Copy, Check, MessageCircle } from "lucide-react";

interface ClipShareMenuProps {
  clipId: string;
  clipTitle: string;
  clipUrl?: string | null;
  streamerName?: string;
}

export const ClipShareMenu = ({
  clipId,
  clipTitle,
  clipUrl,
  streamerName = "a streamer",
}: ClipShareMenuProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Generate the shareable URL
  const shareUrl = clipUrl || `${window.location.origin}/clip/${clipId}`;
  const shareText = `Check out "${clipTitle}" by ${streamerName}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The clip link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Failed to copy",
        description: "Please try again or copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
    setOpen(false);
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=550,height=420");
    setOpen(false);
  };

  const shareToReddit = () => {
    const url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=550,height=420");
    setOpen(false);
  };

  const shareToDiscord = () => {
    // Discord doesn't have a direct share URL, so we copy and suggest pasting
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    toast({
      title: "Copied for Discord!",
      description: "Paste the link in your Discord chat.",
    });
    setOpen(false);
  };

  const socialButtons = [
    { icon: Twitter, label: "Twitter/X", onClick: shareToTwitter, color: "hover:bg-sky-500/10 hover:text-sky-500" },
    { icon: Facebook, label: "Facebook", onClick: shareToFacebook, color: "hover:bg-blue-600/10 hover:text-blue-600" },
    { icon: MessageCircle, label: "Discord", onClick: shareToDiscord, color: "hover:bg-indigo-500/10 hover:text-indigo-500" },
    { icon: Link, label: "Reddit", onClick: shareToReddit, color: "hover:bg-orange-500/10 hover:text-orange-500" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-3" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="text-sm font-medium">Share Clip</div>
          
          {/* Copy Link */}
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="h-9 text-xs bg-muted/50"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 shrink-0"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Social Share Buttons */}
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Share on social media</p>
            <div className="grid grid-cols-4 gap-2">
              {socialButtons.map((social) => {
                const Icon = social.icon;
                return (
                  <Button
                    key={social.label}
                    variant="ghost"
                    size="sm"
                    className={`h-10 flex-col gap-1 ${social.color}`}
                    onClick={social.onClick}
                    title={social.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px]">{social.label.split('/')[0]}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Native Share (if supported) */}
          {navigator.share && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.share({
                    title: clipTitle,
                    text: shareText,
                    url: shareUrl,
                  });
                  setOpen(false);
                } catch (error) {
                  // User cancelled or share failed
                  console.log("Share cancelled or failed:", error);
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              More sharing options
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
