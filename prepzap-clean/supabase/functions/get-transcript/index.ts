import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { YoutubeTranscript } from "npm:youtube-transcript";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) throw new Error("Missing video URL");

    try {
      const transcriptList = await YoutubeTranscript.fetchTranscript(url);
      const fullText = transcriptList.map((item) => item.text).join(" ");
      return new Response(JSON.stringify({ transcript: fullText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (ytError) {
      // If YouTube blocks the datacenter IP (Captcha), throw a user-friendly message
      if (ytError.message?.includes("captcha") || ytError.message?.includes("too many requests")) {
        throw new Error("YouTube blocked the cloud server (anti-bot protection). For a production app, you will need a residential proxy.");
      }
      throw ytError;
    }
  } catch (error) {
    console.error("Transcript Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to fetch transcript." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
