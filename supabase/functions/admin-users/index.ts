import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list": {
        // Get all users from auth.users using admin API
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
          page: params.page || 1,
          perPage: params.perPage || 50,
        });

        if (error) {
          throw error;
        }

        // Get roles and ban status for each user
        const userIds = users.map(u => u.id);
        
        const [rolesResult, bansResult, profilesResult] = await Promise.all([
          supabaseAdmin.from("user_roles").select("*").in("user_id", userIds),
          supabaseAdmin.from("banned_users").select("*").in("user_id", userIds),
          supabaseAdmin.from("streamer_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        ]);

        const rolesMap = new Map(rolesResult.data?.map(r => [r.user_id, r]) || []);
        const bansMap = new Map(bansResult.data?.map(b => [b.user_id, b]) || []);
        const profilesMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);

        const enrichedUsers = users.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: rolesMap.get(u.id)?.role || null,
          is_banned: !!bansMap.get(u.id),
          ban_info: bansMap.get(u.id) || null,
          profile: profilesMap.get(u.id) || null,
        }));

        return new Response(JSON.stringify({ users: enrichedUsers }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "assign_role": {
        const { userId, role } = params;
        
        if (!userId || !role) {
          return new Response(JSON.stringify({ error: "Missing userId or role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete existing role first
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        
        // Insert new role if not 'user' (default)
        if (role !== "user") {
          const { error } = await supabaseAdmin.from("user_roles").insert({
            user_id: userId,
            role: role,
          });

          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ban": {
        const { userId, reason, expiresAt } = params;
        
        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing userId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabaseAdmin.from("banned_users").insert({
          user_id: userId,
          banned_by: user.id,
          reason: reason || null,
          expires_at: expiresAt || null,
        });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "unban": {
        const { userId } = params;
        
        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing userId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabaseAdmin.from("banned_users").delete().eq("user_id", userId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
