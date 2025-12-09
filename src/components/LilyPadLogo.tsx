import React from "react";
import lilypadLogo from "@/assets/lilypad-logo.png";

interface LilyPadLogoProps {
  className?: string;
  size?: number;
}

export const LilyPadLogo: React.FC<LilyPadLogoProps> = ({ className = "", size = 80 }) => {
  return (
    <img
      src={lilypadLogo}
      alt="The Lily Pad"
      width={size}
      height={size}
      className={className}
    />
  );
};
