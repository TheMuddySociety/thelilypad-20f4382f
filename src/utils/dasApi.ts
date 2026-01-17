import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';

// Cache the Umi instance to avoid recreating it on every call
let umiInstance: ReturnType<typeof createUmi> | null = null;
let currentEndpoint: string | null = null;

export const getDasUmi = (endpoint: string) => {
    if (umiInstance && currentEndpoint === endpoint) {
        return umiInstance;
    }

    const umi = createUmi(endpoint).use(dasApi());
    umiInstance = umi;
    currentEndpoint = endpoint;

    return umi;
};
