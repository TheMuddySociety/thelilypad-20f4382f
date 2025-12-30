import React from 'react';
import { Play, Square, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface StreamControlsProps {
  isStreaming: boolean;
  isConnecting: boolean;
  roomId: string | null;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
}

export const StreamControls: React.FC<StreamControlsProps> = ({
  isStreaming,
  isConnecting,
  roomId,
  onStart,
  onStop,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const shareUrl = roomId ? `${window.location.origin}/watch/${roomId}` : '';

  const copyShareLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share this link with your viewers.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareStream = async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: 'Watch my live stream!',
          text: 'Join my live stream on The Lily Pad',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        copyShareLink();
      }
    } else {
      copyShareLink();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream Controls</CardTitle>
        <CardDescription>
          {isStreaming 
            ? 'You are currently live! Share your stream with viewers.'
            : 'Start streaming directly from your browser.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Start/Stop Button */}
        <div className="flex gap-3">
          {!isStreaming ? (
            <Button 
              onClick={onStart} 
              disabled={isConnecting}
              className="flex-1"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Go Live
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={onStop} 
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <Square className="mr-2 h-5 w-5" />
              End Stream
            </Button>
          )}
        </div>

        {/* Share Link */}
        {isStreaming && roomId && (
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input 
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={copyShareLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={shareStream}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
