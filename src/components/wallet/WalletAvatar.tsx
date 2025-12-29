import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WalletAvatarProps {
  address: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onAvatarChange?: (avatarUrl: string | null) => void;
}

// Generate a deterministic gradient based on wallet address
const generateGradientFromAddress = (address: string): string => {
  const hash = address.toLowerCase().slice(2, 42);
  
  // Use different parts of the hash for colors
  const hue1 = parseInt(hash.slice(0, 8), 16) % 360;
  const hue2 = parseInt(hash.slice(8, 16), 16) % 360;
  const hue3 = parseInt(hash.slice(16, 24), 16) % 360;
  
  // Generate angle from hash
  const angle = parseInt(hash.slice(24, 32), 16) % 360;
  
  return `linear-gradient(${angle}deg, 
    hsl(${hue1}, 70%, 60%), 
    hsl(${hue2}, 65%, 55%), 
    hsl(${hue3}, 75%, 50%))`;
};

// Generate a blockie-style pattern using canvas
const generateBlockiePattern = (address: string): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  
  const size = 8;
  canvas.width = size;
  canvas.height = size;
  
  const hash = address.toLowerCase().slice(2);
  
  // Generate colors from hash
  const hue1 = parseInt(hash.slice(0, 8), 16) % 360;
  const hue2 = (hue1 + 120) % 360;
  const bgHue = (hue1 + 240) % 360;
  
  // Background
  ctx.fillStyle = `hsl(${bgHue}, 30%, 20%)`;
  ctx.fillRect(0, 0, size, size);
  
  // Draw pattern based on hash
  for (let i = 0; i < size * size / 2; i++) {
    const x = i % (size / 2);
    const y = Math.floor(i / (size / 2));
    
    const hashIndex = i % (hash.length / 2);
    const hashValue = parseInt(hash.slice(hashIndex * 2, hashIndex * 2 + 2), 16);
    
    if (hashValue > 127) {
      ctx.fillStyle = hashValue > 200 
        ? `hsl(${hue1}, 70%, 60%)` 
        : `hsl(${hue2}, 65%, 50%)`;
      
      // Mirror pattern for symmetry
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(size - 1 - x, y, 1, 1);
    }
  }
  
  return canvas.toDataURL();
};

export const WalletAvatar: React.FC<WalletAvatarProps> = ({
  address,
  size = "md",
  editable = false,
  onAvatarChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    if (address) {
      return localStorage.getItem(`walletAvatar_${address}`);
    }
    return null;
  });
  const [avatarType, setAvatarType] = useState<"gradient" | "blockie" | "custom">(() => {
    if (address) {
      const saved = localStorage.getItem(`walletAvatarType_${address}`);
      return (saved as "gradient" | "blockie" | "custom") || "gradient";
    }
    return "gradient";
  });

  const sizeClasses = {
    sm: "w-8 h-8 sm:w-10 sm:h-10",
    md: "w-12 h-12 sm:w-16 sm:h-16",
    lg: "w-20 h-20 sm:w-24 sm:h-24",
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCustomAvatar(dataUrl);
      setAvatarType("custom");
      localStorage.setItem(`walletAvatar_${address}`, dataUrl);
      localStorage.setItem(`walletAvatarType_${address}`, "custom");
      onAvatarChange?.(dataUrl);
      toast.success("Avatar updated");
    };
    reader.readAsDataURL(file);
  };

  const cycleAvatarType = () => {
    const types: ("gradient" | "blockie" | "custom")[] = customAvatar 
      ? ["gradient", "blockie", "custom"]
      : ["gradient", "blockie"];
    
    const currentIndex = types.indexOf(avatarType);
    const nextIndex = (currentIndex + 1) % types.length;
    const nextType = types[nextIndex];
    
    setAvatarType(nextType);
    localStorage.setItem(`walletAvatarType_${address}`, nextType);
    toast.success(`Switched to ${nextType} avatar`);
  };

  const removeCustomAvatar = () => {
    setCustomAvatar(null);
    setAvatarType("gradient");
    localStorage.removeItem(`walletAvatar_${address}`);
    localStorage.setItem(`walletAvatarType_${address}`, "gradient");
    onAvatarChange?.(null);
    toast.success("Custom avatar removed");
  };

  const getAvatarStyle = (): React.CSSProperties => {
    if (avatarType === "custom" && customAvatar) {
      return { backgroundImage: `url(${customAvatar})`, backgroundSize: "cover", backgroundPosition: "center" };
    }
    if (avatarType === "blockie") {
      const blockie = generateBlockiePattern(address);
      return { 
        backgroundImage: `url(${blockie})`, 
        backgroundSize: "cover",
        imageRendering: "pixelated" as const,
      };
    }
    return { background: generateGradientFromAddress(address) };
  };

  if (editable) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div
            className={`${sizeClasses.lg} rounded-full shrink-0 ring-2 ring-border`}
            style={getAvatarStyle()}
          />
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-1" />
                Upload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cycleAvatarType}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Style
              </Button>
            </div>
            {customAvatar && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={removeCustomAvatar}
              >
                Remove custom
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Current: {avatarType === "custom" ? "Custom upload" : avatarType === "blockie" ? "Blockie pattern" : "Gradient"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full shrink-0`}
      style={getAvatarStyle()}
    />
  );
};