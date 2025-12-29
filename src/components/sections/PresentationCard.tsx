import React from "react";
import presentationCard from "@/assets/lilypad-presentation-card.png";

export const PresentationCard: React.FC = () => {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6">
        <div className="flex justify-center">
          <div className="relative group">
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-3xl scale-90 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Card image */}
            <img
              src={presentationCard}
              alt="The Lily Pad - NFT Launchpad on Monad"
              className="relative w-full max-w-4xl rounded-2xl shadow-2xl shadow-primary/10 border border-border/50 transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PresentationCard;
