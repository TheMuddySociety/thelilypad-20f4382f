import { EtherealShadows } from "@/components/ui/ethereal-shadows";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Launchpad Background Variants
 * Different animated background options for the launchpad hero section
 */

// Variant 1: Purple/Violet Gradient (Primary brand colors)
export function PurpleEtherealBackground({ children }: { children?: React.ReactNode }) {
    return (
        <EtherealShadows
            color="rgba(147, 51, 234, 0.8)" // Purple-600
            animation={{ scale: 60, speed: 40 }}
            noise={{ opacity: 0.35, scale: 1.2 }}
            sizing="fill"
            showTitle={false}
            className="w-full h-full"
        >
            {children}
        </EtherealShadows>
    );
}

// Variant 2: Green/Lily Pad Theme
export function GreenEtherealBackground({ children }: { children?: React.ReactNode }) {
    return (
        <EtherealShadows
            color="rgba(34, 197, 94, 0.7)" // Green-500
            animation={{ scale: 70, speed: 30 }}
            noise={{ opacity: 0.4, scale: 1 }}
            sizing="fill"
            showTitle={false}
            className="w-full h-full"
        >
            {children}
        </EtherealShadows>
    );
}

// Variant 3: Blue Gradient
export function BlueEtherealBackground({ children }: { children?: React.ReactNode }) {
    return (
        <EtherealShadows
            color="rgba(59, 130, 246, 0.8)" // Blue-500
            animation={{ scale: 50, speed: 50 }}
            noise={{ opacity: 0.3, scale: 1.5 }}
            sizing="fill"
            showTitle={false}
            className="w-full h-full"
        >
            {children}
        </EtherealShadows>
    );
}

// Variant 4: Dark/Subtle
export function DarkEtherealBackground({ children }: { children?: React.ReactNode }) {
    return (
        <EtherealShadows
            color="rgba(100, 100, 100, 0.6)" // Gray
            animation={{ scale: 40, speed: 60 }}
            noise={{ opacity: 0.25, scale: 0.8 }}
            sizing="fill"
            showTitle={false}
            className="w-full h-full"
        >
            {children}
        </EtherealShadows>
    );
}

// Full page example with hero content
export function LaunchpadHeroWithBackground() {
    return (
        <div className="relative w-full min-h-[60vh] overflow-hidden">
            <PurpleEtherealBackground>
                <div className="relative z-20 max-w-4xl mx-auto px-4">
                    {/* Hero Content */}
                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                        The Lily Pad
                    </h1>
                    <p className="text-xl md:text-2xl text-center text-white/90 mb-8 max-w-2xl mx-auto">
                        Launch your NFT collection with zero code
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Button size="lg" className="text-lg px-8">
                            Start Creating
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
                            View Collections
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto">
                        {[
                            { label: "Collections", value: "1,234" },
                            { label: "NFTs Minted", value: "50K+" },
                            { label: "Total Volume", value: "12K+" }
                        ].map((stat) => (
                            <Card key={stat.label} className="p-6 bg-white/10 backdrop-blur-md border-white/20">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                                    <div className="text-sm text-white/70">{stat.label}</div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </PurpleEtherealBackground>
        </div>
    );
}

export default LaunchpadHeroWithBackground;
