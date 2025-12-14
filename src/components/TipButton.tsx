import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { TipModal } from "./TipModal";

interface TipButtonProps {
  streamerAddress: string;
  streamerName: string;
  streamerId: string;
  streamId?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const TipButton: React.FC<TipButtonProps> = ({
  streamerAddress,
  streamerName,
  streamerId,
  streamId,
  variant = "default",
  size = "default",
  className,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsModalOpen(true)}
      >
        <Heart className="w-4 h-4 mr-2" />
        Tip
      </Button>

      <TipModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        streamerAddress={streamerAddress}
        streamerName={streamerName}
        streamerId={streamerId}
        streamId={streamId}
      />
    </>
  );
};
