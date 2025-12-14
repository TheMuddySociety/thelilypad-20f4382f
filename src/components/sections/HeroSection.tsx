import React from "react";
import { Button } from "@/components/ui/button";
import { LilyPadLogo } from "@/components/LilyPadLogo";
import { Sparkles, Rocket } from "lucide-react";
import monadLogo from "@/assets/monad-logo.svg";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14 sm:pt-16 md:pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-hero-gradient" />
      
      {/* Animated glow orbs - hidden on small mobile for performance */}
      <div className="hidden sm:block absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-secondary/20 rounded-full blur-3xl animate-glow-pulse" />
      <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-56 md:w-80 h-56 md:h-80 bg-primary/20 rounded-full blur-3xl animate-glow-pulse delay-1000" />
      
      {/* Floating particles - fewer on mobile */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="hidden sm:block absolute w-2 h-2 bg-primary/40 rounded-full animate-drift-up"
          style={{
            left: `${15 + i * 20}%`,
            animationDelay: `${i * 2.5}s`,
            animationDuration: `${12 + i * 2}s`,
          }}
        />
      ))}
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
            <LilyPadLogo size={80} className="relative sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px]" />
          </div>
        </div>
        
        {/* Title */}
        <h1 
          className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold mb-4 sm:mb-6 opacity-0 animate-fade-in leading-tight"
          style={{ animationDelay: "0.4s" }}
        >
          <span className="text-foreground">Create. Stream. </span>
          <span className="text-primary">Launch.</span>
          <br className="sm:hidden" />
          <span className="text-foreground"> Thrive.</span>
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-10 opacity-0 animate-fade-in flex flex-wrap items-center justify-center gap-2 px-2"
          style={{ animationDelay: "0.6s" }}
        >
          <span>The all-in-one NFT launch pad and marketplace built exclusively for</span>
          <img src={monadLogo} alt="Monad" className="h-5 sm:h-6 md:h-8 inline-block" />
        </p>
        
        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center opacity-0 animate-fade-in px-4 sm:px-0"
          style={{ animationDelay: "0.8s" }}
        >
          <Button variant="hero" size="lg" className="group w-full sm:w-auto">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
            Launch Your Collection
          </Button>
          <Button variant="heroOutline" size="lg" className="group w-full sm:w-auto">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
            Explore Marketplace
          </Button>
        </div>
        
        {/* Stats preview */}
        <div 
          className="mt-12 sm:mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto opacity-0 animate-fade-in"
          style={{ animationDelay: "1s" }}
        >
          {[
            { label: "Collections", value: "500+" },
            { label: "Creators", value: "2.5K+" },
            { label: "Volume", value: "$12M+" },
            { label: "Community", value: "50K+" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-3 sm:p-4">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
