import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  challenger_streak: number;
  challenged_streak: number;
}

interface VolumeRecord {
  user_id: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Find active challenges that have ended
    const { data: endedChallenges, error: fetchError } = await supabase
      .from("streak_challenges")
      .select("*")
      .eq("status", "active")
      .lte("end_date", today);

    if (fetchError) {
      throw fetchError;
    }

    const results: { id: string; winner_id: string | null }[] = [];

    for (const challenge of (endedChallenges as Challenge[]) || []) {
      // Calculate streaks for both users during the challenge period
      const startDate = new Date(challenge.start_date);
      const endDate = new Date(challenge.end_date);

      const calculateStreak = async (userId: string): Promise<number> => {
        const { data: volumeData, error } = await supabase
          .from("volume_tracking")
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: true });

        if (error || !volumeData) return 0;

        // Get unique trading days
        const tradingDays = new Set(
          (volumeData as VolumeRecord[]).map((v) => v.created_at.split("T")[0])
        );

        // Calculate longest consecutive streak
        const sortedDays = Array.from(tradingDays).sort();
        let maxStreak = 0;
        let currentStreak = 0;
        let prevDate: Date | null = null;

        for (const day of sortedDays) {
          const currentDate = new Date(day);
          if (prevDate) {
            const diffDays = Math.floor(
              (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffDays === 1) {
              currentStreak++;
            } else {
              currentStreak = 1;
            }
          } else {
            currentStreak = 1;
          }
          maxStreak = Math.max(maxStreak, currentStreak);
          prevDate = currentDate;
        }

        return maxStreak;
      };

      const challengerStreak = await calculateStreak(challenge.challenger_id);
      const challengedStreak = await calculateStreak(challenge.challenged_id);

      // Determine winner
      let winnerId: string | null = null;
      if (challengerStreak > challengedStreak) {
        winnerId = challenge.challenger_id;
      } else if (challengedStreak > challengerStreak) {
        winnerId = challenge.challenged_id;
      }
      // If equal, it's a tie (winnerId remains null)

      // Update challenge
      const { error: updateError } = await supabase
        .from("streak_challenges")
        .update({
          status: "completed",
          challenger_streak: challengerStreak,
          challenged_streak: challengedStreak,
          winner_id: winnerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", challenge.id);

      if (updateError) {
        console.error(`Failed to update challenge ${challenge.id}:`, updateError);
      } else {
        results.push({ id: challenge.id, winner_id: winnerId });

        // Create notifications for both users
        const winnerName = winnerId === challenge.challenger_id ? "You" : "Your opponent";
        const challengerNotif = {
          user_id: challenge.challenger_id,
          type: "streak_challenge_complete",
          title: "Streak Challenge Complete!",
          message: winnerId === challenge.challenger_id 
            ? `You won the streak challenge with ${challengerStreak} days!`
            : winnerId === null
            ? `The streak challenge ended in a tie at ${challengerStreak} days!`
            : `You lost the streak challenge. Your streak: ${challengerStreak}, Opponent: ${challengedStreak}`,
          link: "/buyback-program",
          metadata: { challenge_id: challenge.id, won: winnerId === challenge.challenger_id }
        };

        const challengedNotif = {
          user_id: challenge.challenged_id,
          type: "streak_challenge_complete",
          title: "Streak Challenge Complete!",
          message: winnerId === challenge.challenged_id
            ? `You won the streak challenge with ${challengedStreak} days!`
            : winnerId === null
            ? `The streak challenge ended in a tie at ${challengedStreak} days!`
            : `You lost the streak challenge. Your streak: ${challengedStreak}, Opponent: ${challengerStreak}`,
          link: "/buyback-program",
          metadata: { challenge_id: challenge.id, won: winnerId === challenge.challenged_id }
        };

        await supabase.from("notifications").insert([challengerNotif, challengedNotif]);
      }
    }

    // Also update active challenges with current streak counts
    const { data: activeChallenges, error: activeError } = await supabase
      .from("streak_challenges")
      .select("*")
      .eq("status", "active")
      .gt("end_date", today);

    if (!activeError && activeChallenges) {
      for (const challenge of activeChallenges as Challenge[]) {
        const startDate = new Date(challenge.start_date);
        const now = new Date();

        const getRecentStreak = async (userId: string): Promise<number> => {
          const { data, error } = await supabase
            .from("volume_tracking")
            .select("created_at")
            .eq("user_id", userId)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", now.toISOString())
            .order("created_at", { ascending: false });

          if (error || !data) return 0;

          const tradingDays = new Set(
            (data as VolumeRecord[]).map((v) => v.created_at.split("T")[0])
          );
          const sortedDays = Array.from(tradingDays).sort().reverse();
          
          let streak = 0;
          let expectedDate = new Date(today);
          
          for (const day of sortedDays) {
            const dayDate = new Date(day);
            const diff = Math.floor(
              (expectedDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (diff <= 1) {
              streak++;
              expectedDate = dayDate;
            } else {
              break;
            }
          }
          
          return streak;
        };

        const challengerStreak = await getRecentStreak(challenge.challenger_id);
        const challengedStreak = await getRecentStreak(challenge.challenged_id);

        await supabase
          .from("streak_challenges")
          .update({
            challenger_streak: challengerStreak,
            challenged_streak: challengedStreak,
            updated_at: new Date().toISOString(),
          })
          .eq("id", challenge.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        completed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error("Error resolving challenges:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
