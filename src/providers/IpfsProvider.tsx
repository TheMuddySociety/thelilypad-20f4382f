import React, { createContext, useContext, ReactNode } from 'react';
import { useIpfsGateway } from '@/hooks/useIpfsGateway';

interface IpfsContextType {
    gateway: string;
    isLocal: boolean;
    resolveToGateway: (uri: string) => string;
}

const IpfsContext = createContext<IpfsContextType | undefined>(undefined);

export function IpfsProvider({ children }: { children: ReactNode }) {
    const ipfs = useIpfsGateway();

    return (
        <IpfsContext.Provider value={ipfs}>
            {children}
        </IpfsContext.Provider>
    );
}

export function useIpfs() {
    const context = useContext(IpfsContext);
    if (context === undefined) {
        throw new Error('useIpfs must be used within an IpfsProvider');
    }
    return context;
}
