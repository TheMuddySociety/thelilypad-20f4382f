import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env'));

const url = 'https://zoomsxaoqkywdqpdtqnm.supabase.co/rest/v1/minted_nfts?owner_address=ilike.rDio*&select=id,name';
const headers = {
  'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
  'Authorization': 'Bearer ' + env.VITE_SUPABASE_PUBLISHABLE_KEY
};

fetch(url, { headers })
  .then(r => r.json())
  .then(data => console.log('Minted NFTs count:', Array.isArray(data) ? data.length : data))
  .catch(console.error);

const collUrl = 'https://zoomsxaoqkywdqpdtqnm.supabase.co/rest/v1/collections?creator_address=ilike.rDio*&select=id,name,minted,total_supply';
fetch(collUrl, { headers })
  .then(r => r.json())
  .then(data => console.log('Collections:', JSON.stringify(data, null, 2)))
  .catch(console.error);
