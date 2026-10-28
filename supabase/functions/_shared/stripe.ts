// Stripe client and helpers shared by the billing and stripe-webhook functions.
import Stripe from "npm:stripe@17.7.0";

export const stripeReady = () => !!Deno.env.get("STRIPE_SECRET_KEY");

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "sk_missing", {
  httpClient: Stripe.createFetchHttpClient(),
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export type Plan = "monthly" | "yearly" | "lifetime";

// Price ids from the Stripe dashboard, set as function secrets.
export function priceFor(plan: Plan): string | undefined {
  return Deno.env.get({
    monthly: "STRIPE_PRICE_MONTHLY",
    yearly: "STRIPE_PRICE_YEARLY",
    lifetime: "STRIPE_PRICE_LIFETIME",
  }[plan]);
}

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

// The columns of public.premium that come from a Stripe subscription.
export function subscriptionColumns(sub: any) {
  const item = sub.items?.data?.[0];
  // Newer Stripe API versions keep the period end on the item instead of the subscription.
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  return {
    plan: item?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
    status: sub.status,
    trial_end: iso(sub.trial_end),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: !!(sub.cancel_at_period_end || sub.cancel_at),
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
  };
}
