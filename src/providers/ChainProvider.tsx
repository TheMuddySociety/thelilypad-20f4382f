import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    SupportedChain,
    ChainConfig,
    CHAINS,
    getStoredChain,
    setStoredChain,
    DEFAULT_CHAIN,
} from '@/config/chains';

interface ChainContextValue {
    chain: ChainConfig;
    setChain: (chainId: SupportedChain) => void;
    selectedChainId: SupportedChain;
}

const ChainContext = createContext<ChainContextValue | null>(null);

export const useChain = () => {
    const context = useContext(ChainContext);
    if (!context) {
        throw new Error('useChain must be used within ChainProvider');
    }
    return context;
};

interface ChainProviderProps {
    children: ReactNode;
    initialChain?: SupportedChain;
}

export const ChainProvider: React.FC<ChainProviderProps> = ({
    children,
    initialChain
}) => {
    const [selectedChainId, setSelectedChainId] = useState<SupportedChain>(() => {
        // Try to get stored chain, fallback to initial or default
        if (initialChain) return initialChain;
        return getStoredChain();
    });

    const chain = CHAINS[selectedChainId];

    const handleSetChain = (chainId: SupportedChain) => {
        setSelectedChainId(chainId);
        setStoredChain(chainId);
    };

    // Persist chain selection to localStorage whenever it changes
    useEffect(() => {
        setStoredChain(selectedChainId);
    }, [selectedChainId]);

    // Update global CSS variables for dynamic theming
    useEffect(() => {
        const root = document.documentElement;

        // Helper to convert hex to HSL for Tailwind variables
        const hexToHSL = (hex: string): string => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return '0 0% 0%'; // Fallback

            let r = parseInt(result[1], 16);
            let g = parseInt(result[2], 16);
            let b = parseInt(result[3], 16);

            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;

            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }

            // Return H S% L% format for Tailwind opacity modifiers
            return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };

        const primaryHSL = hexToHSL(chain.theme.primaryColor);
        const secondaryHSL = hexToHSL(chain.theme.secondaryColor);
        const glowColor = chain.theme.glowColor; // Keep hex for some uses if needed, or convert

        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--secondary', secondaryHSL);
        root.style.setProperty('--ring', primaryHSL);

        // Also update glow variables
        root.style.setProperty('--glow-primary', primaryHSL);
        root.style.setProperty('--glow-secondary', secondaryHSL);
        root.style.setProperty('--glow-accent', primaryHSL);

    }, [chain]);

    return (
        <ChainContext.Provider
            value={{
                chain,
                setChain: handleSetChain,
                selectedChainId,
            }}
        >
            {children}
        </ChainContext.Provider>
    );
};
