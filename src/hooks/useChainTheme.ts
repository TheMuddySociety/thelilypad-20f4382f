import { useEffect } from 'react';
import { useChain } from '@/providers/ChainProvider';

/**
 * Hook to apply chain-specific theme colors to the document root.
 * This overrides the default application theme with the selected chain's colors.
 * It automatically reverts to the default theme when the component unmounts.
 */
export const useChainTheme = (enabled: boolean = true) => {
    const { chain } = useChain();

    useEffect(() => {
        if (!enabled) return;
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

        // Apply chain theme
        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--secondary', secondaryHSL);
        root.style.setProperty('--ring', primaryHSL);
        root.style.setProperty('--glow-primary', primaryHSL);
        root.style.setProperty('--glow-secondary', secondaryHSL);
        root.style.setProperty('--glow-accent', primaryHSL);

        // Cleanup: Revert to default standard values from index.css
        // We use the raw values from index.css here to ensure exact restoration
        return () => {
            // Default: --primary: 160 60% 45%;
            root.style.setProperty('--primary', '160 60% 45%');
            // Default: --secondary: 160 40% 85%;
            root.style.setProperty('--secondary', '160 40% 85%');
            // Default: --ring: 160 60% 45%;
            root.style.setProperty('--ring', '160 60% 45%');

            // Default glows
            root.style.setProperty('--glow-primary', '160 60% 45%');
            root.style.setProperty('--glow-secondary', '160 40% 60%');
            root.style.setProperty('--glow-accent', '160 70% 35%');
        };
    }, [chain, enabled]);
};
