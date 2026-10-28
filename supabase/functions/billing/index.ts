// amivo: Premium billing for the app. Deploy with JWT verification off; it checks the
// signed-in account itself. Needs the STRIPE_* secrets (see PREMIUM_SETUP.md).
// GET    -> { ready }  (whether Premium can be bought yet)
// POST   { action: "status" }                    -> the account's Premium row, or null
// POST   { action: "checkout", plan }            -> { url } of a Stripe Checkout page
// POST   { action: "portal" } / { action: "cancel" } -> { url } of the Stripe billing portal
import { createClient } from "npm:@supabase/supabase-js@2";
import { priceFor, stripe, stripeReady, type Plan } from "../_shared/stripe.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://www.amivo.ca,https://amivo.ca,https://benkavin.github.io,https://bentamana.github.io").split(",").map((s) => s.trim());
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.amivo.ca").replace(/\/$/, "");
const TRIAL_DAYS = Number(Deno.env.get("TRIAL_DAYS") ?? "7");
const PLANS: Plan[] = ["monthly", "yearly", "lifetime"];

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

async function userFrom(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error || !data?.user ? null : data.user;
}

const ready = () => stripeReady() && PLANS.every((p) => !!priceFor(p));

// Premium counts while it's active or trialing, or forever for lifetime.
const isActive = (row: any) => !!row && ["active", "trialing"].includes(row.status);

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return json({ ready: ready(), trialDays: TRIAL_DAYS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const user = await userFrom(req);
  if (!user) return json({ error: "Sign up first" }, 401);

  const { data: row, error } = await db.from("premium").select("*").eq("user_id", user.id).maybeSingle();
  if (error) { console.error(error); return json({ error: "Database error" }, 500); }

  if (body?.action === "status") {
    if (!row) return json({ premium: null });
    const { stripe_customer_id: _c, stripe_subscription_id: _s, ...visible } = row;
    return json({ premium: visible });
  }

  if (!ready()) return json({ error: "Billing isn't set up yet" }, 503);

  // Send people back to the site they came from (custom domain or GitHub Pages).
  const origin = req.headers.get("origin") ?? "";
  const site = ALLOWED_ORIGINS.includes(origin) ? origin : SITE_URL;

  try {
    if (body?.action === "checkout") {
      const plan = body.plan as Plan;
      if (!PLANS.includes(plan)) return json({ error: "Unknown plan" }, 400);
      if (isActive(row) && (row.plan === "lifetime" || plan !== "lifetime")) {
        return json({ error: "You already have Premium" }, 409);
      }
      const common = {
        line_items: [{ price: priceFor(plan)!, quantity: 1 }],
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan },
        allow_promotion_codes: true,
        success_url: `${site}/?premium=success#premium`,
        cancel_url: `${site}/#premium`,
        ...(row?.stripe_customer_id ? { customer: row.stripe_customer_id } : (user.email ? { customer_email: user.email } : {})),
      };
      const session = plan === "lifetime"
        ? await stripe.checkout.sessions.create({
          ...common,
          mode: "payment",
          ...(row?.stripe_customer_id ? {} : { customer_creation: "always" }),
          payment_intent_data: { metadata: { user_id: user.id, plan } },
        })
        : await stripe.checkout.sessions.create({
          ...common,
          mode: "subscription",
          subscription_data: {
            metadata: { user_id: user.id },
            // One free trial per account.
            ...(row?.had_trial || TRIAL_DAYS <= 0 ? {} : {
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
            }),
          },
        });
      return json({ url: session.url });
    }

    if (body?.action === "portal" || body?.action === "cancel") {
      if (!row?.stripe_customer_id) return json({ error: "No billing account yet" }, 404);
      const canCancel = body.action === "cancel" && row.stripe_subscription_id && isActive(row) && row.plan !== "lifetime";
      const portal = await stripe.billingPortal.sessions.create({
        customer: row.stripe_customer_id,
        return_url: `${site}/#premium`,
        // "cancel" opens straight on the cancel screen: one tap to confirm.
        ...(canCancel ? {
          flow_data: {
            type: "subscription_cancel",
            subscription_cancel: { subscription: row.stripe_subscription_id },
            after_completion: { type: "redirect", redirect: { return_url: `${site}/?premium=updated#premium` } },
          },
        } : {}),
      } as any);
      return json({ url: portal.url });
    }
  } catch (e: any) {
    console.error(e?.message ?? e);
    return json({ error: "Billing error" }, 502);
  }

  return json({ error: "Unknown action" }, 400);
});
