import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only endpoint — verify shared secret to prevent public invocation
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("Processing scheduled reveals...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find collections with scheduled reveals that are due
    const now = new Date().toISOString();

    const { data: collections, error: fetchError } = await supabase
      .from("collections")
      .select("id, name, scheduled_reveal_at")
      .eq("is_revealed", false)
      .not("scheduled_reveal_at", "is", null)
      .lte("scheduled_reveal_at", now);

    if (fetchError) {
      console.error("Error fetching collections:", fetchError);
      throw fetchError;
    }

    if (!collections || collections.length === 0) {
      console.log("No scheduled reveals to process");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No scheduled reveals to process",
          processed: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    console.log(`Found ${collections.length} collection(s) to reveal`);

    let processedCount = 0;
    const results: { collectionId: string; name: string; success: boolean; error?: string }[] = [];

    for (const collection of collections) {
      try {
        console.log(`Revealing collection: ${collection.name} (${collection.id})`);

        // Reveal all NFTs in this collection
        const { error: nftError } = await supabase
          .from("minted_nfts")
          .update({
            is_revealed: true,
            revealed_at: now
          })
          .eq("collection_id", collection.id)
          .eq("is_revealed", false);

        if (nftError) {
          console.error(`Error revealing NFTs for ${collection.id}:`, nftError);
          results.push({
            collectionId: collection.id,
            name: collection.name,
            success: false,
            error: nftError.message
          });
          continue;
        }

        // Mark collection as revealed and clear the schedule
        const { error: collectionError } = await supabase
          .from("collections")
          .update({
            is_revealed: true,
            scheduled_reveal_at: null
          })
          .eq("id", collection.id);

        if (collectionError) {
          console.error(`Error updating collection ${collection.id}:`, collectionError);
          results.push({
            collectionId: collection.id,
            name: collection.name,
            success: false,
            error: collectionError.message
          });
          continue;
        }

        console.log(`Successfully revealed collection: ${collection.name}`);
        processedCount++;
        results.push({
          collectionId: collection.id,
          name: collection.name,
          success: true
        });

      } catch (error) {
        console.error(`Error processing collection ${collection.id}:`, error);
        results.push({
          collectionId: collection.id,
          name: collection.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    console.log(`Processed ${processedCount} of ${collections.length} reveals`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: collections.length,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error in process-scheduled-reveals:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
