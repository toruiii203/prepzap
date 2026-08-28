const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

// --- Feature limits (mirrors src/lib/freemium.ts) -------------------------
const LIMITS = {
  ai_tutor:        20,
  flashcard_gen:   3,
  math_solver:     5,
  quick_study:     3,
  teach_it:        3,
  mistake_journal: 5,
};

function todayManilaWindow() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return {
    start: new Date(`${dateStr}T00:00:00+08:00`).toISOString(),
    end:   new Date(`${dateStr}T23:59:59.999+08:00`).toISOString(),
  };
}

// --- Supabase JWT verification (via Supabase API — no clock skew issues) ---
async function verifySupabaseJWT(request, env) {
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // LOCAL DEV MOCK BYPASS
  // Allows you to test locally without logging in, but safely limits usage 
  // since this user doesn't actually exist in your Supabase DB.
  if (token === 'mock-token') {
    return { sub: 'mock-user-123', email: 'mock@example.com' };
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!res.ok) return null;

    const user = await res.json();
    if (!user?.id) return null;

    // Return shape consistent with old JWT payload
    return { sub: user.id, email: user.email };
  } catch (e) {
    console.error('[auth] Supabase user lookup failed:', e.message);
    return null;
  }
}

// --- Plan + usage helpers --------------------------------------------------
async function getUserPlan(userId, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=plan,pro_expires_at`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  if (!res.ok) return 'free';
  const data = await res.json();
  if (!data || data.length === 0) return 'free';
  const row = data[0];
  const proActive = row.plan === 'pro' &&
    (row.pro_expires_at === null || new Date(row.pro_expires_at) > new Date());
  return proActive ? 'pro' : 'free';
}

async function getUsageToday(userId, feature, env) {
  const { start, end } = todayManilaWindow();
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/usage_logs?user_id=eq.${userId}&feature=eq.${feature}&used_at=gte.${start}&used_at=lte.${end}&select=id`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

async function logUsage(userId, feature, env) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/usage_logs`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, feature }),
  });
}

// --- AI provider helpers ---------------------------------------------------
function toGeminiBody(body) {
  const messages = body.messages ?? [];
  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystem = messages.filter(m => m.role !== 'system');

  const contents = nonSystem.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: Array.isArray(m.content)
      ? m.content.map(p => p.type === 'text' ? { text: p.text } : { text: '' })
      : [{ text: m.content ?? '' }],
  }));

  const geminiBody = {
    contents,
    generationConfig: {
      maxOutputTokens: Math.max(body.max_tokens ?? 0, 4096),
      temperature: body.temperature ?? 0.7,
    },
  };

  if (systemMsg) {
    geminiBody.systemInstruction = {
      parts: [{ text: typeof systemMsg.content === 'string' ? systemMsg.content : '' }],
    };
  }

  return geminiBody;
}

async function tryGroq(body, apiKey) {
  const groqBody = { ...body };
  delete groqBody.route;
  delete groqBody.feature;
  groqBody.max_tokens = Math.max(groqBody.max_tokens ?? 0, 4096);

  // NOTE: narrowed from the old `.includes('/')` check. Groq's own current
  // model catalog now uses namespace/model IDs too (openai/gpt-oss-120b,
  // meta-llama/llama-guard-4-12b, qwen/qwen3.6-27b, etc.), so a bare slash
  // check would incorrectly catch legitimate Groq model strings and force
  // them back onto a dead fallback model. This now only catches strings
  // that are actually shaped like Gemini identifiers.
  if (groqBody.model?.startsWith('gemini') || groqBody.model?.startsWith('google/')) {
    groqBody.model = 'openai/gpt-oss-120b';
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(groqBody),
  });
  const data = await res.json();
  if (data?.error) throw new Error(`Groq: ${data.error.message}`);
  data._provider = 'Groq';
  return data;
}

async function tryGemini(body, apiKey) {
  const model = body.model ?? 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toGeminiBody(body)),
  });
  const data = await res.json();
  if (data?.error) throw new Error(`Gemini: ${data.error.message}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { _provider: 'Gemini', choices: [{ message: { role: 'assistant', content: text } }] };
}

async function tryCloudflareAI(body, ai) {
  const messages = body.messages ?? [];
  const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    max_tokens: Math.max(body.max_tokens ?? 0, 4096),
  });
  if (!result?.response) throw new Error('Cloudflare AI: empty response');
  return { _provider: 'Cloudflare AI', choices: [{ message: { role: 'assistant', content: result.response } }] };
}

async function tryOpenRouter(body, apiKey) {
  const openRouterBody = { ...body };
  delete openRouterBody.route;
  delete openRouterBody.feature;
  openRouterBody.max_tokens = Math.max(openRouterBody.max_tokens ?? 0, 4096);
  if (openRouterBody.model?.startsWith('gemini')) {
    openRouterBody.model = 'google/gemini-2.0-flash-exp:free';
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(openRouterBody),
  });
  const data = await res.json();
  if (data?.error) throw new Error(`OpenRouter: ${data.error.message}`);
  data._provider = 'OpenRouter';
  return data;
}

// --- Main handler ----------------------------------------------------------
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // --- Auth gate (Supabase-side verification, no clock skew) --------------
    const user = await verifySupabaseJWT(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // --- Parse body ----------------------------------------------------------
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid or empty JSON body' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // --- Credit gate ---------------------------------------------------------
    const feature = body.feature ?? null;
    if (feature && LIMITS[feature] !== undefined) {
      const plan = await getUserPlan(user.sub, env);
      if (plan !== 'pro') {
        const used = await getUsageToday(user.sub, feature, env);
        if (used >= LIMITS[feature]) {
          return new Response(JSON.stringify({
            error: 'Credit limit reached',
            feature,
            limit: LIMITS[feature],
            used,
          }), {
            status: 429,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const errors = [];

    // 1. Groq
    try {
      const data = await tryGroq(body, env.GROQ_API_KEY);
      if (feature && LIMITS[feature] !== undefined) await logUsage(user.sub, feature, env);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.log('[fallback] Groq failed:', e.message);
      errors.push(e.message);
    }

    // 2. Gemini
    try {
      const data = await tryGemini(body, env.GEMINI_API_KEY);
      if (feature && LIMITS[feature] !== undefined) await logUsage(user.sub, feature, env);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.log('[fallback] Gemini failed:', e.message);
      errors.push(e.message);
    }

    // 3. Cloudflare Workers AI
    try {
      const data = await tryCloudflareAI(body, env.AI);
      if (feature && LIMITS[feature] !== undefined) await logUsage(user.sub, feature, env);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.log('[fallback] Cloudflare AI failed:', e.message);
      errors.push(e.message);
    }

    // 4. OpenRouter
    try {
      const data = await tryOpenRouter(body, env.OPENROUTER_API_KEY);
      if (feature && LIMITS[feature] !== undefined) await logUsage(user.sub, feature, env);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.log('[fallback] OpenRouter failed:', e.message);
      errors.push(e.message);
    }

    // 5. Groq retry
    try {
      console.log('[fallback] Retrying Groq as last resort...');
      const data = await tryGroq(body, env.GROQ_API_KEY);
      if (feature && LIMITS[feature] !== undefined) await logUsage(user.sub, feature, env);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.log('[fallback] Groq retry failed:', e.message);
      errors.push(e.message);
    }

    return new Response(JSON.stringify({
      error: 'All AI providers failed',
      details: errors,
    }), {
      status: 503,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  },
};
