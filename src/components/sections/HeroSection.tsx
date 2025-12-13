import React from "react";
import { Button } from "@/components/ui/button";
import { LilyPadLogo } from "@/components/LilyPadLogo";
import { Sparkles, Rocket } from "lucide-react";
import monadLogo from "@/assets/monad-logo.svg";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-hero-gradient" />
      
      {/* Animated glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-glow-pulse delay-1000" />
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-primary/40 rounded-full animate-drift-up"
          style={{
            left: `${15 + i * 15}%`,
            animationDelay: `${i * 2.5}s`,
            animationDuration: `${12 + i * 2}s`,
          }}
        />
      ))}
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
            <LilyPadLogo size={120} className="relative" />
          </div>
        </div>
        
        {/* Title */}
        <h1 
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <span className="text-foreground">Create. Stream. </span>
          <span className="text-primary">Launch.</span>
          <span className="text-foreground"> Thrive.</span>
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 opacity-0 animate-fade-in flex flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "0.6s" }}
        >
          <span>The all-in-one NFT launch pad and marketplace built exclusively for</span>
          <img src={monadLogo} alt="Monad" className="h-6 md:h-8 inline-block" />
        </p>
        
        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-fade-in"
          style={{ animationDelay: "0.8s" }}
        >
          <Button variant="hero" size="xl" className="group">
            <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Launch Your Collection
          </Button>
          <Button variant="heroOutline" size="xl" className="group">
            <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Explore Marketplace
          </Button>
        </div>
        
        {/* Stats preview */}
        <div 
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto opacity-0 animate-fade-in"
          style={{ animationDelay: "1s" }}
        >
          {[
            { label: "Collections", value: "500+" },
            { label: "Creators", value: "2.5K+" },
            { label: "Volume", value: "$12M+" },
            { label: "Community", value: "50K+" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4">
              <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
