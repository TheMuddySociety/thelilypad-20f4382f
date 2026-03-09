import React from "react";
import { Button } from "@/components/ui/button";
import { Palette, Rocket, Users, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Palette,
    title: "Create Your Collection",
    description: "Upload art, generate assets, configure mint settings and rarity traits.",
  },
  {
    number: "02",
    icon: Rocket,
    title: "Launch on Solana",
    description: "Instant deployment with reveal options, rewards enabled, and full customization.",
  },
  {
    number: "03",
    icon: Users,
    title: "Grow Your Community",
    description: "Stream, run raffles, reward holders, and build your brand on The Lily Pad.",
  },
];

import { useNavigate } from "react-router-dom";

export const HowItWorks: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From idea to thriving community in three simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="glass-card p-8 text-center group hover:border-primary/50 transition-all duration-500 hover:scale-105">
                {/* Step number */}
                <div className="text-6xl font-extrabold gradient-text opacity-20 mb-4">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button
            variant="hero"
            size="xl"
            className="group"
            onClick={() => navigate('/launchpad')}
          >
            Start Creating
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};
