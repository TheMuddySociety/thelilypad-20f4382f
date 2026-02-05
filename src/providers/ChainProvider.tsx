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

    // Global theme update removed to allow page-specific scoping via useChainTheme hook

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
