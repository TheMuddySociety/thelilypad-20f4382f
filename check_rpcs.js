
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env'));

const url = env.VITE_SUPABASE_URL + '/rest/v1/';
console.log('Fetching', url);
fetch(url, {
  headers: {
    'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'Authorization': 'Bearer ' + env.VITE_SUPABASE_PUBLISHABLE_KEY
  }
}).then(r => r.json()).then(openapi => {
    if (openapi.paths) {
        Object.keys(openapi.paths).forEach(p => {
            if (p.includes('rpc/')) console.log(p);
        });
    } else {
        console.log("No openapi paths found?");
    }
}).catch(console.error);
