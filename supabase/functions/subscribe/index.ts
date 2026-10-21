// amivo: save or remove a phone's notification schedule.
// Called by the app. Deploy with JWT verification off (it is a public endpoint).
// GET returns the public notification key; POST saves or removes a schedule.
// Saving a schedule needs a signed-in account (the app sends its access token).
import { createClient } from "npm:@supabase/supabase-js@2";
import { getVapidKeys } from "./keys.ts";

// Sites allowed to call this function (your custom domain and the GitHub Pages address).
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://www.amivo.ca,https://amivo.ca,https://benkavin.github.io,https://bentamana.github.io").split(",").map((s) => s.trim());
const CATEGORIES = ["general", "affirmation", "gratitude", "christian", "islamic", "spiritual"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
  };
}

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

function validEndpoint(e: unknown): e is string {
  return typeof e === "string" && e.startsWith("https://") && e.length < 1000;
}

// The signed-in account behind the request, or null.
async function userFrom(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error || !data?.user ? null : data.user.id;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // The app asks for the public key before subscribing a phone.
  if (req.method === "GET") {
    try { return json({ publicKey: (await getVapidKeys(db)).publicKey }); }
    catch (e) { console.error(e); return json({ error: "Keys unavailable" }, 500); }
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (body?.action === "unsubscribe") {
    if (!validEndpoint(body.endpoint)) return json({ error: "Invalid endpoint" }, 400);
    const { error } = await db.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
    return error ? json({ error: "Could not remove" }, 500) : json({ ok: true });
  }

  if (body?.action !== "subscribe") return json({ error: "Unknown action" }, 400);

  const userId = await userFrom(req);
  if (!userId) return json({ error: "Sign up first" }, 401);

  const sub = body.subscription ?? {};
  const keys = sub.keys ?? {};
  if (!validEndpoint(sub.endpoint) || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return json({ error: "Invalid subscription" }, 400);
  }
  if (!TIME_RE.test(body.morning_time) || !TIME_RE.test(body.evening_time)) {
    return json({ error: "Invalid time" }, 400);
  }

  const row = {
    endpoint: sub.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_id: userId,
    timezone: validTimezone(body.timezone) ? body.timezone : "UTC",
    category: CATEGORIES.includes(body.category) ? body.category : "general",
    morning_enabled: body.morning_enabled !== false,
    morning_time: body.morning_time,
    evening_enabled: body.evening_enabled !== false,
    evening_time: body.evening_time,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  return error ? json({ error: "Could not save" }, 500) : json({ ok: true });
});
