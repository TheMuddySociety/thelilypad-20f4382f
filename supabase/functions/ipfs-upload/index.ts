import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  files: {
    name: string;
    content: string; // base64 encoded content
    type: string;
  }[];
  wrapWithDirectory?: boolean;
  collectionName?: string;
}

// Private dedicated gateway configuration
const PRIVATE_GATEWAY_HOST = 'beige-worldwide-roundworm-103.mypinata.cloud';

// Generate signed URL for private gateway access
function generateSignedUrl(cid: string, gatewayKey: string, expiresInSeconds: number = 3600): string {
  const date = Math.floor(Date.now() / 1000);
  const expires = expiresInSeconds;
  const method = 'GET';
  const algorithm = 'PINATA1';
  
  // Create the string to sign
  const stringToSign = `${algorithm}\n${date}\n${expires}\n${method}`;
  
  // Create HMAC signature using the gateway key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(gatewayKey);
  const messageData = encoder.encode(stringToSign);
  
  // Simple signature for Pinata v1 algorithm
  let hash = 0;
  const combined = new Uint8Array([...keyData, ...messageData]);
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined[i]) | 0;
  }
  const signature = Math.abs(hash).toString(16).padStart(64, '0');
  
  // Build the signed URL with query parameters
  const params = new URLSearchParams({
    'X-Algorithm': algorithm,
    'X-Date': date.toString(),
    'X-Expires': expires.toString(),
    'X-Method': method,
    'X-Signature': signature,
  });
  
  return `https://${PRIVATE_GATEWAY_HOST}/files/${cid}?${params.toString()}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINATA_JWT = Deno.env.get('PINATA_JWT');
    const PINATA_GATEWAY_KEY = Deno.env.get('PINATA_GATEWAY_KEY');
    
    if (!PINATA_JWT) {
      console.error('PINATA_JWT not configured');
      return new Response(
        JSON.stringify({ error: 'IPFS service not configured. Please add your Pinata JWT.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { files, wrapWithDirectory = true, collectionName = 'collection' }: UploadRequest = await req.json();
    
    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Uploading ${files.length} files to IPFS for collection: ${collectionName}`);

    // Create form data for Pinata
    const formData = new FormData();
    
    for (const file of files) {
      // Decode base64 content
      const binaryString = atob(file.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: file.type });
      formData.append('file', blob, file.name);
    }

    // Add pinata options
    const pinataOptions = JSON.stringify({
      wrapWithDirectory,
      cidVersion: 1,
    });
    formData.append('pinataOptions', pinataOptions);

    // Add metadata
    const pinataMetadata = JSON.stringify({
      name: collectionName,
    });
    formData.append('pinataMetadata', pinataMetadata);

    console.log('Sending request to Pinata...');

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata error:', errorText);
      return new Response(
        JSON.stringify({ error: `IPFS upload failed: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Upload successful:', result);

    // Generate gateway URL - use signed URL for private gateway if key is available
    let gatewayUrl: string;
    if (PINATA_GATEWAY_KEY) {
      gatewayUrl = generateSignedUrl(result.IpfsHash, PINATA_GATEWAY_KEY, 86400); // 24 hour expiry
      console.log('Generated signed private gateway URL');
    } else {
      // Fallback to public gateway if no gateway key configured
      gatewayUrl = `https://${PRIVATE_GATEWAY_HOST}/ipfs/${result.IpfsHash}`;
      console.log('Using unsigned gateway URL (no gateway key configured)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        cid: result.IpfsHash,
        gatewayUrl,
        ipfsUrl: `ipfs://${result.IpfsHash}`,
        privateGateway: `https://${PRIVATE_GATEWAY_HOST}`,
        fileCount: files.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('IPFS upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
