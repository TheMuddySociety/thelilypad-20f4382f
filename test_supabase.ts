import { supabase } from './src/integrations/supabase/client';

async function test() {
  const { data, error, count } = await supabase
    .from('minted_nfts')
    .select('*', { count: 'exact', head: true })
    .ilike('owner_address', 'rDioFjwotyCXApacrJ7C1oK3tmSmGtEnjT');
    
  console.log('Minted NFTs count:', count);
  console.log('Error:', error);
}

test();
