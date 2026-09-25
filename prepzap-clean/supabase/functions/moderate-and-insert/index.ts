import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import leoProfanity from "npm:leo-profanity@1.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, payload } = body;

    // Load default dictionaries + custom evader logic if needed
    leoProfanity.loadDictionary();

    if (action === "create_exam_room") {
      const { code, room_name, topic, mode, difficulty, question_count, time_limit, status, is_public, questions } = payload;
      
      // Check moderation
      if (leoProfanity.check(room_name) || leoProfanity.check(topic)) {
        return new Response(JSON.stringify({ error: "Inappropriate language detected in room name or topic." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check constraints
      if (room_name.length < 3 || room_name.length > 50 || topic.length < 3 || topic.length > 50) {
        return new Response(JSON.stringify({ error: "Room name and topic must be between 3 and 50 characters." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin.from("exam_rooms").insert([
        {
          host_id: user.id,
          code,
          room_name: room_name.trim(),
          topic: topic.trim(),
          mode,
          difficulty,
          question_count,
          time_limit,
          status,
          is_public,
          questions
        }
      ]).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_profile") {
      const { username, display_name } = payload;

      if (username && leoProfanity.check(username)) {
        return new Response(JSON.stringify({ error: "Inappropriate language detected in username." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (display_name && leoProfanity.check(display_name)) {
        return new Response(JSON.stringify({ error: "Inappropriate language detected in display name." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data, error } = await supabaseAdmin.from("profiles").update({
        ...(username && { username: username.trim() }),
        ...(display_name && { display_name: display_name.trim() })
      }).eq("id", user.id).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
