import { Client } from 'xrpl';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env'));
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function syncAll() {
    const account = 'rDioFjwotyCXApacrJ7C1oK3tmSmGtEnjT';
    const client = new Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();

    console.log(`Fetching all NFTs for ${account} on XRPL Testnet...`);

    let marker = undefined;
    const allNfts = [];

    do {
        const response = await client.request({
            command: 'account_nfts',
            account,
            limit: 400,
            ledger_index: 'validated',
            ...(marker ? { marker } : {}),
        });

        const page = response.result.account_nfts || [];
        allNfts.push(...page);
        marker = response.result.marker;
        console.log(`Fetched ${allNfts.length} NFTs...`);
    } while (marker);

    console.log(`Total NFTs on ledger: ${allNfts.length}`);

    // Fetch the collection for this user
    const { data: cols } = await supabase
        .from('collections')
        .select('*')
        .eq('creator_address', account);

    if (!cols || cols.length === 0) {
        console.log("No collections found for user!");
        return;
    }

    // We assume the collection the user is talking about is "IT's A BOP"
    const targetCol = cols.find(c => c.name === "IT's A BOP") || cols[0];
    console.log(`Syncing to DB Collection: ${targetCol.name} (${targetCol.id})`);

    // Fetch existing minted NFTs in DB to prevent duplicates
    const { data: existingNfts } = await supabase
        .from('minted_nfts')
        .select('nft_token_id')
        .eq('collection_id', targetCol.id);
        
    const existingIds = new Set((existingNfts || []).map(n => n.nft_token_id));
    console.log(`DB has ${existingIds.size} existing NFTs for this collection.`);

    const toInsert = allNfts
        .filter(n => !existingIds.has(n.NFTokenID))
        .map((nft, i) => {
            return {
                collection_id: targetCol.id,
                token_id: existingIds.size + i, // approx index
                attributes: { xrpl_nft_id: nft.NFTokenID, description: targetCol.description },
                name: `${targetCol.name} #${existingIds.size + i + 1}`,
                image_url: nft.URI ? Buffer.from(nft.URI, 'hex').toString('utf8') : '', // We'll try to decode hex
                owner_address: account,
                owner_id: targetCol.creator_id,
                tx_hash: 'synced_from_ledger',
                is_revealed: true,
                minted_at: new Date().toISOString()
            };
        });

    console.log(`Prepared ${toInsert.length} records to insert into DB.`);

    if (toInsert.length > 0) {
        // chunk inserts to 100 max
        for(let i = 0; i < toInsert.length; i += 100) {
            const chunk = toInsert.slice(i, i + 100);
            const { error } = await supabase.from('minted_nfts').insert(chunk);
            if (error) {
                console.error("Insert error:", error);
            } else {
                console.log(`Inserted chunk ${i} to ${i + 100}`);
            }
        }
        
        // update collection minted count
        await supabase.from('collections')
            .update({ minted: existingIds.size + toInsert.length })
            .eq('id', targetCol.id);
            
        console.log("Sync complete!");
    } else {
        console.log("Nothing to sync.");
    }
    
    await client.disconnect();
}

syncAll().catch(console.error);
