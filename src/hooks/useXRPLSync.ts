import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "xrpl";
import { toast } from "sonner";

export function useXRPLSync() {
    const [isSyncing, setIsSyncing] = useState(false);

    const syncMissingNFTs = useCallback(async (address: string) => {
        if (!address) return;
        setIsSyncing(true);
        try {
            console.log("Starting background XRPL sync for", address);
            // 1. Fetch from XRPL
            const client = new Client('wss://s.altnet.rippletest.net:51233');
            await client.connect();
            
            let marker = undefined;
            const allNfts = [];
            do {
                const response = await client.request({
                    command: 'account_nfts',
                    account: address,
                    limit: 400,
                    ledger_index: 'validated',
                    ...(marker ? { marker } : {}),
                });
                const page = response.result.account_nfts || [];
                allNfts.push(...page);
                marker = response.result.marker;
            } while(marker);
            
            await client.disconnect();
            if (allNfts.length === 0) {
                setIsSyncing(false);
                return;
            }

            // 2. Fetch existing DB NFTs
            const { data: cols } = await supabase.from('collections').select('*').eq('creator_address', address);
            if (!cols || cols.length === 0) {
                setIsSyncing(false);
                return;
            }
            // assume the first one or target
            const targetCol = cols.find(c => c.name === "IT's A BOP") || cols[0];

            const { data: existingNfts } = await supabase.from('minted_nfts').select('nft_token_id, attributes').eq('collection_id', targetCol.id);
            
            const existingIds = new Set(
                (existingNfts || []).map(n => {
                    const attrs = typeof n.attributes === 'string' ? JSON.parse(n.attributes) : (n.attributes as any);
                    return n.nft_token_id || attrs?.xrpl_nft_id;
                }).filter(Boolean)
            );

            // 3. Filter missing
            const toInsert = allNfts
                .filter(n => !existingIds.has(n.NFTokenID))
                .map((nft, i) => {
                    return {
                        collection_id: targetCol.id,
                        token_id: existingIds.size + i,
                        attributes: { xrpl_nft_id: nft.NFTokenID }, // Bypassing nft_token_id schema cache
                        name: `${targetCol.name} #${existingIds.size + i + 1}`,
                        image_url: nft.URI ? Buffer.from(nft.URI, 'hex').toString('utf8') : '',
                        owner_address: address,
                        owner_id: targetCol.creator_id,
                        tx_hash: 'synced_from_ledger',
                        is_revealed: true,
                        minted_at: new Date().toISOString()
                    };
                });

            if (toInsert.length > 0) {
                toast.loading(`Syncing ${toInsert.length} missing NFTs...`, { id: 'sync' });
                // Insert in chunks
                for(let i = 0; i < toInsert.length; i += 100) {
                    const chunk = toInsert.slice(i, i + 100);
                    const { error } = await supabase.from('minted_nfts').insert(chunk);
                    if (error) console.error("Sync insert error:", error);
                }
                
                await supabase.from('collections')
                    .update({ minted: existingIds.size + toInsert.length, status: "live" })
                    .eq('id', targetCol.id);
                
                toast.success(`Recovered ${toInsert.length} missing NFTs! Refreshing...`, { id: 'sync' });
                window.location.reload();
            }
            
        } catch (err: any) {
            console.error("Sync error:", err);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    return { syncMissingNFTs, isSyncing };
}
