import { useState, useEffect } from 'react';

const LOCAL_GATEWAY = 'http://127.0.0.1:8080';
const DEFAULT_GATEWAY = 'https://nftstorage.link';

// A tiny IPFS file used to probe for a local gateway (the word "Hello" in IPFS)
const PROBE_CID = 'bafkreic7m6mscf6t6ypsx2pdr36p53rkmphvxuxy7ulx6lqpxqpcsh577i';

/**
 * Hook to detect and manage the preferred IPFS gateway.
 * Automatically switches to a local gateway if IPFS Companion or 
 * a local node (like IPFS Desktop) is detected.
 */
export function useIpfsGateway() {
    const [gateway, setGateway] = useState<string>(DEFAULT_GATEWAY);
    const [isLocal, setIsLocal] = useState<boolean>(false);

    useEffect(() => {
        const detectLocalGateway = async () => {
            try {
                // Try to fetch a tiny probe file from the local gateway
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);

                const response = await fetch(`${LOCAL_GATEWAY}/ipfs/${PROBE_CID}`, {
                    signal: controller.signal,
                    mode: 'no-cors' // We just need to know if it responds
                });

                clearTimeout(timeoutId);

                // If the fetch didn't throw/abort, we have a local node
                setGateway(LOCAL_GATEWAY);
                setIsLocal(true);
                console.log('[IPFS] Local gateway detected! Redirections enabled.');
            } catch (err) {
                // No local gateway found, stick with default
                setGateway(DEFAULT_GATEWAY);
                setIsLocal(false);
            }
        };

        detectLocalGateway();
    }, []);

    const resolveToGateway = (uri: string) => {
        if (!uri) return '';
        if (uri.startsWith('ipfs://')) {
            const cid = uri.replace('ipfs://', '');
            return `${gateway}/ipfs/${cid}`;
        }
        return uri;
    };

    return { gateway, isLocal, resolveToGateway };
}
