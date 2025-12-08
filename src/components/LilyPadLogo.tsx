import React from "react";

interface LilyPadLogoProps {
  className?: string;
  size?: number;
}

export const LilyPadLogo: React.FC<LilyPadLogoProps> = ({ className = "", size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Glow effect */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="padGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(150, 80%, 45%)" />
          <stop offset="100%" stopColor="hsl(160, 70%, 35%)" />
        </linearGradient>
        <linearGradient id="crownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(45, 90%, 55%)" />
          <stop offset="100%" stopColor="hsl(35, 85%, 50%)" />
        </linearGradient>
      </defs>
      
      {/* Lily pad base */}
      <ellipse
        cx="50"
        cy="65"
        rx="35"
        ry="20"
        fill="url(#padGradient)"
        filter="url(#glow)"
      />
      
      {/* Lily pad notch */}
      <path
        d="M50 45 L35 65 L50 60 L65 65 Z"
        fill="hsl(270, 50%, 8%)"
      />
      
      {/* Crown */}
      <path
        d="M30 45 L35 25 L42 38 L50 20 L58 38 L65 25 L70 45 Z"
        fill="url(#crownGradient)"
        filter="url(#glow)"
      />
      
      {/* Crown jewels */}
      <circle cx="50" cy="28" r="3" fill="hsl(270, 60%, 50%)" />
      <circle cx="38" cy="35" r="2" fill="hsl(270, 60%, 50%)" />
      <circle cx="62" cy="35" r="2" fill="hsl(270, 60%, 50%)" />
      
      {/* Pad veins */}
      <path
        d="M50 60 L50 75"
        stroke="hsl(150, 60%, 35%)"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M50 60 L35 70"
        stroke="hsl(150, 60%, 35%)"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M50 60 L65 70"
        stroke="hsl(150, 60%, 35%)"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
};
