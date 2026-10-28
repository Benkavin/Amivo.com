# Turning on Premium and ads

The site already has Premium, pricing and ad spaces built in. Until the steps below are done,
the plan buttons show "Premium is almost ready" and no ads load. Nothing breaks in the meantime.

## Plans

| Plan | Price | Notes |
| --- | --- | --- |
| Free | $0 | Daily message, evening question, journal (last 7 days shown), standard notification times, ads |
| Premium monthly | CAD $4.99 | 7-day free trial, no ads, all Premium features |
| Premium yearly | CAD $39.99 | 7-day free trial, about 33% off monthly |
| Lifetime | CAD $79.99 | One payment, launch deal |

One free trial per account. People must sign up with their email before buying, so Premium follows them to any device.

## 1. Stripe (payments)

1. Create a Stripe account at https://dashboard.stripe.com and set the business country to Canada.
2. **Product catalogue → Add product** "amivo Premium" with three prices in CAD:
   - $4.99 recurring monthly
   - $39.99 recurring yearly
   - $79.99 one-off (lifetime)
   Copy each price id (`price_...`). Don't add a trial to the prices; the site adds the 7-day trial itself.
3. **Settings → Billing → Customer portal**: turn on "Cancel subscriptions" (cancel at end of billing period)
   and "Switch plans" between monthly and yearly. Save. This is what the "Cancel trial" and "Manage billing" buttons open.
4. **Settings → Billing → Subscriptions and emails**: turn on the reminder email before a free trial ends.
   (The app also sends a phone notification 3 days before, and shows a banner on the home screen.)
5. **Developers → Webhooks → Add endpoint**
   - URL: `https://jeyotgsaoizqdnupsbcg.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `customer.subscription.trial_will_end`
   - Copy the signing secret (`whsec_...`).

## 2. Supabase

1. Run the migration `supabase/migrations/20261021120000_premium.sql` (adds the `premium` table).
2. Add these Edge Function secrets (Project settings → Edge Functions → Secrets):
   - `STRIPE_SECRET_KEY` = `sk_live_...` (or `sk_test_...` to try it first)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME` = the three price ids
3. Deploy the functions `billing` and `stripe-webhook` with **JWT verification off**
   (`supabase functions deploy billing --no-verify-jwt`, same for `stripe-webhook`).
   They check the signed-in account and Stripe's signature themselves.

Test mode first: use `sk_test_` keys and the card `4242 4242 4242 4242`, then switch to live keys.

## 3. Google AdSense (ads on the free plan)

1. Apply at https://adsense.google.com with the site `amivo.ca`.
2. Add your publisher id to the site: in `index.html`, fill in `ADSENSE_CLIENT: "ca-pub-..."`, and uncomment the
   `google-adsense-account` meta tag near the top with the same id, so Google can verify the site.
3. Add a file `ads.txt` at the root of the repo with the line Google gives you
   (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
4. Once approved, create a **Display ad** unit and put its id in `ADSENSE_SLOT: "..."`.
5. In AdSense → Privacy & messaging, turn on the consent message for visitors from the EEA, UK and Switzerland.
   AdSense also asks for a privacy policy; `privacy.html` already covers ads, cookies and how to opt out.

The iPhone and Android apps show no ads and no Premium checkout (selling digital subscriptions in the apps needs
App Store and Google Play billing, which is a later step); app users keep choosing their own notification times.

Premium members never load the ad script. Until AdSense is set up, the ad spaces show a small "go ad-free" note instead.
