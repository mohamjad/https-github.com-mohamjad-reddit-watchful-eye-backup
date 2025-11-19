// Deno Edge Function - Scan Status Endpoint
// Returns the status of a scan job for frontend polling
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const createResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
};

serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response("", { 
      status: 200,
      headers: CORS_HEADERS
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return createResponse({ error: "Missing jobId" }, 400);
    }

    const { data: job, error } = await supabaseClient
      .from("scan_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id) // RLS ensures user can only see their own jobs
      .single();

    if (error || !job) {
      return createResponse({ error: "Job not found" }, 404);
    }

    return createResponse(job);

  } catch (error: any) {
    console.error("Scan Status Error:", error);
    return createResponse({ 
      error: error.message || "Internal server error" 
    }, 500);
  }
});





