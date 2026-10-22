// amivo: keeps public.premium in step with Stripe, and sends the trial-ending reminder.
// Deploy with JWT verification off; Stripe's signature (STRIPE_WEBHOOK_SECRET) is checked instead.
// Events to send: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted, customer.subscription.trial_will_end.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import { cryptoProvider, stripe, subscriptionColumns } from "../_shared/stripe.ts";
import { getVapidKeys } from "../subscribe/keys.ts";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.amivo.ca").replace(/\/$/, "");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? `${SITE_URL}/`;

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function rowFor(userId: string) {
  const { data } = await db.from("premium").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

// The amivo account behind a subscription: from its metadata, or by the Stripe customer.
async function userForSubscription(sub: any): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const { data } = await db.from("premium").select("user_id").eq("stripe_customer_id", customer).maybeSingle();
  return data?.user_id ?? null;
}

async function save(userId: string, columns: Record<string, unknown>) {
  const { error } = await db.from("premium").upsert(
    { user_id: userId, ...columns, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function saveSubscription(userId: string, subscriptionId: string) {
  // Always read the latest copy, since Stripe can deliver events out of order.
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const existing = await rowFor(userId);
  // A lifetime purchase outranks any subscription.
  if (existing?.plan === "lifetime" && existing.status === "active") return;
  await save(userId, { ...subscriptionColumns(sub), had_trial: !!existing?.had_trial || !!sub.trial_end });
}

async function saveLifetime(userId: string, session: any) {
  const existing = await rowFor(userId);
  await save(userId, {
    plan: "lifetime",
    status: "active",
    trial_end: null,
    current_period_end: null,
    cancel_at_period_end: false,
    had_trial: !!existing?.had_trial,
    stripe_customer_id: session.customer ?? existing?.stripe_customer_id ?? null,
    stripe_subscription_id: null,
  });
  // Upgrading from monthly or yearly: stop the old subscription so they aren't charged twice.
  if (existing?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(existing.status)) {
    await stripe.subscriptions.cancel(existing.stripe_subscription_id).catch((e: any) => console.error(e?.message));
  }
}

// Reminds every phone on the account a few days before the free trial turns into a charge.
async function remindTrialEnding(userId: string, sub: any) {
  if (sub.cancel_at_period_end || sub.status !== "trialing" || !sub.trial_end) return;
  const { data: phones } = await db.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!phones?.length) return;
  const keys = await getVapidKeys(db);
  webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
  for (const p of phones) {
    let when: string;
    try {
      when = new Date(sub.trial_end * 1000).toLocaleDateString("en-CA", { timeZone: p.timezone || "UTC", weekday: "long", month: "long", day: "numeric" });
    } catch { when = new Date(sub.trial_end * 1000).toDateString(); }
    const payload = {
      title: "Your free trial ends soon",
      body: `Your amivo Premium trial ends on ${when}. Not for you? Cancel in one tap and you won't be charged.`,
      tag: "amivo-trial",
      url: "./#premium",
    };
    await webpush.sendNotification({ endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 })
      .catch((e: any) => console.error("trial reminder failed", p.id, e?.statusCode));
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("Not configured", { status: 503 });

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), req.headers.get("stripe-signature") ?? "", secret, undefined, cryptoProvider,
    );
  } catch (e: any) {
    console.error("bad signature", e?.message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    const obj = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = obj.client_reference_id ?? obj.metadata?.user_id;
        if (!userId) break;
        if (obj.mode === "payment" && obj.payment_status === "paid") await saveLifetime(userId, obj);
        if (obj.mode === "subscription" && obj.subscription) {
          // Link the customer first, so later subscription events can find the account.
          await saveSubscription(userId, typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const userId = await userForSubscription(obj);
        if (userId) await saveSubscription(userId, obj.id);
        break;
      }
      case "customer.subscription.trial_will_end": {
        const userId = await userForSubscription(obj);
        if (userId) await remindTrialEnding(userId, obj);
        break;
      }
    }
  } catch (e: any) {
    console.error(event.type, e?.message ?? e);
    // A 500 makes Stripe retry later.
    return new Response("Error", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
