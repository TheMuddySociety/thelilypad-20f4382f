import React from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { ValuePropsSection } from "@/components/sections/ValuePropsSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { MarketplacePreview } from "@/components/sections/MarketplacePreview";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { CreatorProtection } from "@/components/sections/CreatorProtection";
import { CommunityBenefits } from "@/components/sections/CommunityBenefits";
import { Footer } from "@/components/sections/Footer";
import { useSEO } from "@/hooks/useSEO";

const Index: React.FC = () => {
  useSEO({
    title: "The Lily Pad | NFT Launchpad & Live Streaming Platform on Monad",
    description: "Launch NFT collections and stream live on Monad blockchain. Create, mint, and trade digital collectibles with built-in creator tools and community features.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "The Lily Pad",
      "url": "https://thelilypad.app",
      "description": "NFT Launchpad & Live Streaming Platform on Monad blockchain",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://thelilypad.app/streamers?q={search_term_string}",
        "query-input": "required name=search_term_string"
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Lily Pad",
        "url": "https://thelilypad.app",
        "logo": "https://thelilypad.app/favicon.ico"
      }
    }
  });
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <HeroSection />
      <ValuePropsSection />
      <FeaturesSection />
      <MarketplacePreview />
      <HowItWorks />
      <CreatorProtection />
      <CommunityBenefits />
      <Footer />
    </main>
  );
};

export default Index;
