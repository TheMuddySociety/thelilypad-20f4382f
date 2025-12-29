import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of deleted collections...");

    // Find all collections where scheduled_permanent_delete_at has passed
    const now = new Date().toISOString();
    
    const { data: expiredCollections, error: fetchError } = await supabase
      .from("collections")
      .select("id, name, creator_id, deleted_at, scheduled_permanent_delete_at")
      .not("deleted_at", "is", null)
      .lte("scheduled_permanent_delete_at", now);

    if (fetchError) {
      console.error("Error fetching expired collections:", fetchError);
      throw fetchError;
    }

    if (!expiredCollections || expiredCollections.length === 0) {
      console.log("No expired collections to permanently delete");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired collections to delete",
          deleted: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredCollections.length} collections to permanently delete`);

    const deletedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    // Delete each expired collection
    for (const collection of expiredCollections) {
      console.log(`Permanently deleting collection: ${collection.name} (${collection.id})`);
      
      // First, delete related allowlist entries
      const { error: allowlistError } = await supabase
        .from("allowlist_entries")
        .delete()
        .eq("collection_id", collection.id);

      if (allowlistError) {
        console.error(`Error deleting allowlist entries for ${collection.id}:`, allowlistError);
      }

      // Delete related minted NFTs
      const { error: nftsError } = await supabase
        .from("minted_nfts")
        .delete()
        .eq("collection_id", collection.id);

      if (nftsError) {
        console.error(`Error deleting minted NFTs for ${collection.id}:`, nftsError);
      }

      // Delete related transactions
      const { error: txError } = await supabase
        .from("nft_transactions")
        .delete()
        .eq("collection_id", collection.id);

      if (txError) {
        console.error(`Error deleting transactions for ${collection.id}:`, txError);
      }

      // Finally, delete the collection itself
      const { error: deleteError } = await supabase
        .from("collections")
        .delete()
        .eq("id", collection.id);

      if (deleteError) {
        console.error(`Error deleting collection ${collection.id}:`, deleteError);
        errors.push({ id: collection.id, error: deleteError.message });
      } else {
        console.log(`Successfully deleted collection: ${collection.name}`);
        deletedIds.push(collection.id);
      }
    }

    const result = {
      success: true,
      message: `Permanently deleted ${deletedIds.length} collections`,
      deleted: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Cleanup complete:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in cleanup-deleted-collections:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
