/**
 * Cloudflare Pages Function Proxy for NVIDIA NIM
 * Bypasses browser CORS restrictions by forwarding requests server-to-server.
 * Reads NVIDIA_API_KEY from Cloudflare Pages secrets or Authorization header.
 */

interface Env {
  NVIDIA_API_KEY?: string;
  VITE_NVIDIA_API_KEY?: string;
  [key: string]: any;
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    let authHeader = request.headers.get("Authorization") || "";
    const serverKey = env?.NVIDIA_API_KEY || env?.VITE_NVIDIA_API_KEY;
    if ((!authHeader || authHeader === "Bearer " || authHeader === "Bearer undefined") && serverKey) {
      authHeader = `Bearer ${serverKey.trim()}`;
    }

    const body = await request.text();

    const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body,
    });

    const responseText = await nvidiaResponse.text();

    return new Response(responseText, {
      status: nvidiaResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err?.message || "Internal NVIDIA proxy error" },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
