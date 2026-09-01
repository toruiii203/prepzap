import { createClient } from "@supabase/supabase-js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GROQ_API_KEY: string;
  // Payload validation secrets
  PAYPAL_WEBHOOK_ID: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. PayPal Webhook Endpoint
    if (request.method === "POST" && url.pathname === "/webhooks/paypal") {
      try {
        const body = await request.text();
        const payload = JSON.parse(body);

        // Verification logic would normally go here using PAYPAL_WEBHOOK_ID
        // and fetching a token from PayPal REST API to verify signature.
        
        // Handle checkout completed / subscription activated
        if (
          payload.event_type === "PAYMENT.SALE.COMPLETED" || 
          payload.event_type === "CHECKOUT.ORDER.APPROVED" ||
          payload.event_type === "BILLING.SUBSCRIPTION.ACTIVATED"
        ) {
          // PayPal custom_id is where we pass the Supabase user_id from the frontend checkout
          const customId = payload.resource?.custom_id || payload.resource?.custom;
          if (customId) {
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            const { error } = await supabase
              .from("profiles")
              .update({ plan: "pro" })
              .eq("id", customId);
              
            if (error) console.error("Supabase upgrade error:", error);
          }
        }
        return new Response("Webhook processed", { status: 200 });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    // 2. Mongo Pay Webhook Endpoint
    if (request.method === "POST" && url.pathname === "/webhooks/mongo") {
      try {
        const body = await request.text();
        const payload = JSON.parse(body);
        
        // Mongo Pay custom payload
        const userId = payload.custom_data?.user_id || payload.metadata?.user_id;
        
        if (userId && payload.status === "success") {
          const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
          await supabase
            .from("profiles")
            .update({ plan: "pro" })
            .eq("id", userId);
        }
        return new Response("Mongo Webhook processed", { status: 200 });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // We want to run the daily quiz generation once per day (e.g. midnight PH time).
    // The cron triggers every hour ("0 * * * *"). We check if the current hour in PH time is 0 (midnight).
    const now = new Date();
    // PH Time is UTC+8
    const phHour = (now.getUTCHours() + 8) % 24;
    
    if (phHour === 0) {
      await generateDailyChallenge(supabase, env.GROQ_API_KEY);
    }
    
    // Push notifications can be sent out hourly
    await dispatchPushNotifications(supabase);
  }
};

async function generateDailyChallenge(supabase: any, groqKey: string) {
  try {
    const today = new Date();
    const phTime = new Date(today.getTime() + 8 * 60 * 60 * 1000);
    const dateStr = phTime.toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Don't generate if it already exists
    const { data: existing } = await supabase.from("daily_challenges").select("id").eq("challenge_date", dateStr).single();
    if (existing) return;

    // Call Groq directly
    const prompt = `Generate 10 multiple choice questions across various academic subjects (Math, Science, History, Tech).
Return ONLY a JSON array: [{"question":"...","options":["A...","B...","C...","D..."],"correct_answer":"A","explanation":"..."}]`;
    
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }]
      })
    });
    
    if (!res.ok) throw new Error("Failed Groq API call");
    const json = await res.json();
    const rawContent = json.choices[0].message.content;
    
    // Extract JSON array
    let clean = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) clean = arrMatch[0];
    const questions = JSON.parse(clean);
    
    await supabase.from("daily_challenges").insert({
      challenge_date: dateStr,
      questions: questions,
      topic: "Daily General Knowledge"
    });
  } catch (err) {
    console.error("Daily challenge generation failed", err);
  }
}

async function dispatchPushNotifications(supabase: any) {
  // Stub for Web Push notifications using VAPID
  // We'd query users who have notifications.streak = true and haven't logged a study session today
  console.log("Push notifications cron running");
}

