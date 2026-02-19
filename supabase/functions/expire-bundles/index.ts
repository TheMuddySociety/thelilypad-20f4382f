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
    console.info("Processing expired bundles...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find all active bundles that have expired
    const { data: expiredBundles, error: fetchError } = await supabase
      .from("shop_bundles")
      .select("id, name, expires_at")
      .eq("is_active", true)
      .eq("is_limited_time", true)
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (fetchError) {
      console.error("Error fetching expired bundles:", fetchError);
      throw fetchError;
    }

    if (!expiredBundles || expiredBundles.length === 0) {
      console.info("No expired bundles to process");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired bundles found",
          processed: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    console.info(`Found ${expiredBundles.length} expired bundle(s) to deactivate`);

    // Deactivate all expired bundles
    const bundleIds = expiredBundles.map(b => b.id);

    const { error: updateError } = await supabase
      .from("shop_bundles")
      .update({ is_active: false })
      .in("id", bundleIds);

    if (updateError) {
      console.error("Error deactivating bundles:", updateError);
      throw updateError;
    }

    // Log which bundles were deactivated
    for (const bundle of expiredBundles) {
      console.info(`Deactivated bundle: "${bundle.name}" (ID: ${bundle.id}, expired: ${bundle.expires_at})`);
    }

    console.info(`Successfully deactivated ${expiredBundles.length} expired bundle(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deactivated ${expiredBundles.length} expired bundle(s)`,
        processed: expiredBundles.length,
        bundles: expiredBundles.map(b => ({ id: b.id, name: b.name }))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in expire-bundles function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
