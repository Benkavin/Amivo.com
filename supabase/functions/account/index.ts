// amivo: usernames and passwords for accounts. Deploy with JWT verification off; it checks the
// signed-in account itself where it needs one. Emails behind a username never leave this function.
// POST { action: "check", username }                 -> { available }
// POST { action: "signup", email, username, password, redirect_to } -> { session } or { confirm: true }
// POST { action: "login", login, password }          -> { session, username }  (login is a username or email)
// POST { action: "recover", login, redirect_to }     -> { ok }  (emails a reset link)
// POST { action: "me" }      (signed in)             -> { username }
// POST { action: "claim", username } (signed in)     -> { username }
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://www.amivo.ca,https://amivo.ca,https://benkavin.github.io,https://bentamana.github.io").split(",").map((s) => s.trim());
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.amivo.ca").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// The public key the website uses too (safe to share), in case the anon key isn't set.
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_vMETCEvzLSi47fasv92olw_IxP8KLm9";
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED = ["admin", "amivo", "support", "help", "root", "staff", "official"];
// A username held by an account that never confirmed its email is freed after a day.
const UNCONFIRMED_HOLD_MS = 24 * 60 * 60 * 1000;

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
  };
}

const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function userFrom(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error || !data?.user ? null : data.user;
}

// Calls Supabase Auth the same way the website does, so it sends the usual emails.
async function auth(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// Only send people back to one of our own sites.
function redirectFor(value: unknown): string {
  try {
    const u = new URL(String(value));
    if (ALLOWED_ORIGINS.includes(u.origin)) return u.origin + u.pathname;
  } catch { /* fall through */ }
  return SITE_URL + "/";
}

const clean = (u: unknown) => typeof u === "string" ? u.trim().toLowerCase() : "";
const validUsername = (u: string) => USERNAME_RE.test(u) && !RESERVED.includes(u);

async function profileFor(username: string) {
  const { data, error } = await db.from("profiles").select("user_id,username").eq("username", username).maybeSingle();
  if (error) throw error;
  return data;
}

// True when the username is free, freeing it first if an unconfirmed account has held it too long.
async function isAvailable(username: string): Promise<boolean> {
  const row = await profileFor(username);
  if (!row) return true;
  const { data } = await db.auth.admin.getUserById(row.user_id);
  const u = data?.user;
  if (u && !u.email_confirmed_at && Date.now() - new Date(u.created_at).getTime() > UNCONFIRMED_HOLD_MS) {
    await db.from("profiles").delete().eq("user_id", row.user_id);
    return true;
  }
  return false;
}

async function emailForLogin(login: string): Promise<string | null> {
  if (login.includes("@")) return login;
  const row = await profileFor(login);
  if (!row) return null;
  const { data } = await db.auth.admin.getUserById(row.user_id);
  return data?.user?.email ?? null;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  try {
    switch (body?.action) {
      case "check": {
        const username = clean(body.username);
        if (!validUsername(username)) return json({ available: false, reason: "invalid" });
        return json({ available: await isAvailable(username) });
      }

      case "signup": {
        const email = clean(body.email), username = clean(body.username);
        const password = typeof body.password === "string" ? body.password : "";
        if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);
        if (!validUsername(username)) return json({ error: "invalid_username" }, 400);
        if (password.length < 8 || password.length > 72) return json({ error: "weak_password" }, 400);
        if (!(await isAvailable(username))) return json({ error: "username_taken" }, 409);

        const r = await auth(`signup?redirect_to=${encodeURIComponent(redirectFor(body.redirect_to))}`, { email, password });
        if (r.status === 422 && /already/i.test(r.data?.msg ?? "")) return json({ error: "email_taken" }, 409);
        if (r.status === 429) return json({ error: "rate_limited" }, 429);
        if (r.status >= 400) { console.error(r.data); return json({ error: r.data?.error_code ?? "signup_failed" }, 400); }

        const user = r.data.user ?? r.data;
        // Supabase hides whether an email is already registered by returning a user with no identities.
        if (!user?.id || (Array.isArray(user.identities) && user.identities.length === 0)) {
          return json({ error: "email_taken" }, 409);
        }
        // Upsert, so someone who signs up again before confirming can pick a different username.
        const { error } = await db.from("profiles").upsert({ user_id: user.id, username }, { onConflict: "user_id" });
        if (error) {
          if (error.code === "23505") return json({ error: "username_taken" }, 409);
          throw error;
        }
        return r.data.access_token ? json({ session: r.data, username }) : json({ confirm: true });
      }

      case "login": {
        const login = clean(body.login);
        const password = typeof body.password === "string" ? body.password : "";
        if (!login || !password) return json({ error: "invalid_credentials" }, 400);
        const email = await emailForLogin(login);
        if (!email) return json({ error: "invalid_credentials" }, 400);
        const r = await auth("token?grant_type=password", { email, password });
        if (r.status === 429) return json({ error: "rate_limited" }, 429);
        if (r.status >= 400) {
          const code = r.data?.error_code === "email_not_confirmed" ? "email_not_confirmed" : "invalid_credentials";
          return json({ error: code }, 400);
        }
        const { data: p } = await db.from("profiles").select("username").eq("user_id", r.data.user.id).maybeSingle();
        return json({ session: r.data, username: p?.username ?? null });
      }

      case "recover": {
        const email = await emailForLogin(clean(body.login));
        // Same answer whether or not the account exists.
        if (email) {
          const r = await auth(`recover?redirect_to=${encodeURIComponent(redirectFor(body.redirect_to))}`, { email });
          if (r.status === 429) return json({ error: "rate_limited" }, 429);
        }
        return json({ ok: true });
      }

      case "me":
      case "claim": {
        const user = await userFrom(req);
        if (!user) return json({ error: "Sign up first" }, 401);
        if (body.action === "me") {
          const { data } = await db.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
          return json({ username: data?.username ?? null });
        }
        const username = clean(body.username);
        if (!validUsername(username)) return json({ error: "invalid_username" }, 400);
        const held = await profileFor(username);
        if (held && held.user_id !== user.id && !(await isAvailable(username))) return json({ error: "username_taken" }, 409);
        const { error } = await db.from("profiles").upsert({ user_id: user.id, username }, { onConflict: "user_id" });
        if (error) {
          if (error.code === "23505") return json({ error: "username_taken" }, 409);
          throw error;
        }
        return json({ username });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server_error" }, 500);
  }
});
