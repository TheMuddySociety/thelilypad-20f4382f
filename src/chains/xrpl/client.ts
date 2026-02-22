/**
 * XRPL Client - XRP Ledger client initialization and network management
 */

import { Client } from 'xrpl';

export type XRPLNetwork = 'mainnet' | 'testnet' | 'devnet';

const XRPL_ENDPOINTS = {
    mainnet: 'wss://xrplcluster.com',
    testnet: 'wss://s.altnet.rippletest.net:51233',
    devnet: 'wss://s.devnet.rippletest.net:51233',
} as const;

/**
 * Get XRPL WebSocket endpoint for a network
 */
export function getXRPLEndpoint(network: XRPLNetwork): string {
    return XRPL_ENDPOINTS[network];
}

/**
 * Create and connect an xrpl.js Client.
 */
export async function createXRPLClient(network: XRPLNetwork = 'testnet'): Promise<Client> {
    const endpoint = getXRPLEndpoint(network);
    const client = new Client(endpoint);
    await client.connect();
    console.log(`[XRPL] Client connected to ${network} (${endpoint})`);
    return client;
}

/**
 * Disconnect an xrpl.js Client.
 */
export async function disconnectXRPLClient(client: Client): Promise<void> {
    if (client.isConnected()) {
        await client.disconnect();
    }
}
