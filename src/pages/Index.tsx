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

const Index: React.FC = () => {
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
