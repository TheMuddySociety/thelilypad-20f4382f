import React from "react";
import { Shield, Store, Video } from "lucide-react";

const valueProps = [
  {
    icon: Shield,
    title: "Creator First",
    description: "Tools built to grow and protect creators on Solana.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Store,
    title: "Marketplace Ready",
    description: "Trade, auction, and discover premium collections.",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: Video,
    title: "Streaming + Engagement",
    description: "Livestreams, chats, donations—built straight in.",
    gradient: "from-accent/20 to-accent/5",
  },
];

export const ValuePropsSection: React.FC = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Why <span className="gradient-text">The Lily Pad</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to create, launch, and grow your NFT empire on Solana.
          </p>
        </div>
        
        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {valueProps.map((prop, index) => (
            <div
              key={prop.title}
              className="group glass-card p-6 hover:border-primary/50 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-primary/10"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon container */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${prop.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <prop.icon className="w-7 h-7 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                {prop.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
