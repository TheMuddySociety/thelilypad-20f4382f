import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";

export const CreatorProtection: React.FC = () => {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-secondary/30 to-secondary/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/30 via-transparent to-transparent" />
      
      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/30 mb-6">
            <Shield className="w-8 h-8 text-secondary" />
          </div>
          
          {/* Header */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Protecting creators. Protecting collectors.{" "}
            <span className="gradient-text-premium">Elevating the ecosystem.</span>
          </h2>
          
          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Treasury-backed token system ensures safe, fair, transparent launches across Solana. 
            Your community deserves trust—we deliver it.
          </p>
          
          {/* CTA */}
          <Button variant="secondary" size="lg" className="group">
            Learn More
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};
