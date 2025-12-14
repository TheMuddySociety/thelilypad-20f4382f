import React, { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Wallet, Coins } from "lucide-react";
import { monadMainnet } from "@/config/alchemy";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamerAddress: string;
  streamerName: string;
  streamerId: string;
  streamId?: string;
}

const presetAmounts = [0.1, 0.5, 1, 5, 10];

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  streamerAddress,
  streamerName,
  streamerId,
  streamId,
}) => {
  const { toast } = useToast();
  const { isConnected, address, balance, connect, sendTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleSendTip = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to send a tip",
        variant: "destructive",
      });
      return;
    }

    if (balance && parseFloat(amount) > parseFloat(balance)) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough MON to send this tip",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Send the transaction
      const txHash = await sendTransaction(streamerAddress, amount);

      if (txHash) {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Record the donation in the database
        if (session?.user) {
          await supabase.from("earnings").insert({
            user_id: streamerId,
            stream_id: streamId || null,
            amount: parseFloat(amount),
            currency: "MON",
            type: "donation",
            from_user_id: session.user.id,
            from_username: address.slice(0, 6) + "..." + address.slice(-4),
            message: message || null,
          });
        }

        toast({
          title: "Tip sent! 🎉",
          description: (
            <div className="space-y-1">
              <p>Successfully sent {amount} MON to {streamerName}</p>
              <a
                href={`${monadMainnet.blockExplorers.default.url}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                View transaction →
              </a>
            </div>
          ),
        });

        setAmount("");
        setMessage("");
        onClose();
      }
    } catch (error: any) {
      console.error("Error sending tip:", error);
      toast({
        title: "Transaction failed",
        description: error.message || "Failed to send tip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Send a Tip
          </DialogTitle>
          <DialogDescription>
            Support {streamerName} with a crypto donation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!isConnected ? (
            <div className="text-center py-6 space-y-4">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Connect your wallet to send a tip</p>
              <Button onClick={connect} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <>
              {/* Balance display */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Your Balance</span>
                <span className="font-medium">
                  {balance ? parseFloat(balance).toFixed(4) : "0"} MON
                </span>
              </div>

              {/* Preset amounts */}
              <div className="space-y-2">
                <Label>Quick Amounts</Label>
                <div className="grid grid-cols-5 gap-2">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      variant={amount === preset.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetClick(preset)}
                      className="text-xs"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (MON)</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Say something nice..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/200
                </p>
              </div>

              {/* Send button */}
              <Button
                onClick={handleSendTip}
                disabled={isSending || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Send {amount || "0"} MON
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Powered by Monad. Transaction fees apply.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
