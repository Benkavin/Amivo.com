# amivo Premium in the iPhone app (Apple in-app purchase)

The iPhone app sells Premium with Apple's in-app purchase, at the same prices as the website:

| Plan | Product ID (type exactly) | Type | Price | Free trial |
|---|---|---|---|---|
| Monthly | `ca.amivo.premium.monthly` | Auto-renewable subscription | CAD $4.99 / month | 1 week |
| Yearly | `ca.amivo.premium.yearly` | Auto-renewable subscription | CAD $39.99 / year | 1 week |
| Lifetime | `ca.amivo.premium.lifetime` | Non-consumable | CAD $79.99 once | none |

The app checks purchases with StoreKit 2 on the phone itself. There is no server, no account and no
RevenueCat: Apple verifies the purchase, and the app unlocks Premium when the Apple Account owns one of the
three products. "Restore purchases" and "Manage subscription" are in Settings → amivo Premium.

Free in the app: the daily message, the evening question and the journal (last 7 days), with the free
categories. Premium unlocks the same things as on the website. The app has no ads. Android keeps every
feature open until Google Play billing is added. Premium bought on amivo.ca doesn't carry over to the app,
and an App Store purchase doesn't carry over to the website.

## What you set up in App Store Connect

### 1. Paid Apps Agreement (do this first, it can take a day or two)
1. App Store Connect → **Business** (it used to be "Agreements, Tax, and Banking").
2. Under **Paid Apps**, click **View and Agree to Terms**, then accept.
3. Add your **bank account** (the account Apple pays you in CAD).
4. Fill in the **tax forms**: the U.S. form (W-8BEN for an individual in Canada) and the Canadian tax
   information (GST/HST number, if you have one).
5. Wait until the Paid Apps status says **Active**. Purchases don't work until it does, not even in testing.

### 2. Subscription group and the two subscriptions
1. **Apps** → amivo → **Monetization → Subscriptions** → **Create** a subscription group.
   Reference name: `amivo Premium`.
2. In the group, add **App Store Localization** → English (Canada) and English (U.S.):
   Subscription Group Display Name `amivo Premium`.
3. Click **+** next to Subscriptions and create:
   - Reference name `Premium Yearly`, Product ID `ca.amivo.premium.yearly`
   - Reference name `Premium Monthly`, Product ID `ca.amivo.premium.monthly`
4. For **each** subscription:
   - **Subscription Duration:** 1 Year / 1 Month.
   - **Subscription Prices:** click **Add Subscription Price**, choose **Canada** as the base country and
     pick CAD **39.99** / **4.99**. Let Apple set the other countries automatically.
   - **Introductory Offers:** click **+** → all countries → **Free** → duration **1 Week**.
   - **App Store Localization:** English (Canada) and English (U.S.)
     - Display name: `Premium Yearly` / `Premium Monthly`
     - Description: `Every category, favourites, faith series and your own times.`
   - **Review Information:** upload a screenshot of the Premium screen in the app (Settings → amivo Premium)
     and, in Review Notes, write: `Shown in Settings > amivo Premium. Unlocks every category, favourites,
     past messages, custom times, faith series, the weekly recap and journal passcode/export.`
5. Back on the group page, set the **levels**: Yearly at level 1, Monthly at level 2. (Same level is also
   fine; it only affects upgrades and downgrades.)

### 3. The Lifetime purchase
1. **Monetization → In-App Purchases** → **+** → **Non-Consumable**.
2. Reference name `Premium Lifetime`, Product ID `ca.amivo.premium.lifetime`.
3. **Price Schedule:** base country **Canada**, CAD **79.99**.
4. **App Store Localization:** Display name `Premium Lifetime`, description
   `Pay once and keep amivo Premium for good.`
5. **Review Information:** the same screenshot and notes as above.

All three should now say **Ready to Submit**. If one says "Missing Metadata", it's usually the screenshot or
a localization.

### 4. Terms of Use link (Apple requires it for subscriptions)
On the app's version page, add this line at the end of the **Description**:

```
Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://www.amivo.ca/privacy.html
```

The app already shows both links, the prices and the renewal terms next to the plans.

### 5. A new build with in-app purchase
1. Merge the pull request that adds in-app purchase.
2. GitHub → **Actions** → **Store release** → **Run workflow**, platform **ios**, version `1.0.0` if 1.0.0 is
   not yet approved, otherwise `1.0.1`.
3. When the build has finished processing, test it in **TestFlight**. Purchases in TestFlight are free test
   purchases with your own Apple ID, and subscriptions renew every few minutes so you can see renewals and
   expiry. Try: buy Yearly, check everything unlocks, delete and reinstall the app, tap **Restore purchases**.

### 6. Submit the products with the app
Apple only reviews your first in-app purchases together with an app version.
1. On the version page (1.0.0 or 1.0.1), under **Build**, choose the new build.
2. Scroll to **In-App Purchases and Subscriptions**, click **+** (or **Select In-App Purchases or
   Subscriptions**) and tick all three products.
3. Update **App Review Information → Notes** (replace the old line that said every feature is free):

```
amivo needs no sign-in. The free app includes the daily message, the evening question and the journal.
amivo Premium is sold with Apple in-app purchase in Settings > amivo Premium: Premium Monthly
(ca.amivo.premium.monthly) and Premium Yearly (ca.amivo.premium.yearly), each with a 1-week free trial,
and Premium Lifetime (ca.amivo.premium.lifetime), a non-consumable. "Restore purchases" is on the same
screen. Premium unlocks every category, favourites and past messages (Saved tab), custom notification times,
the Advent/Lent/Ramadan series, the weekly recap, and the journal passcode and PDF export. Purchases are
verified on the device with StoreKit 2; no account or server is involved.
```

4. **App Privacy** can stay "Data Not Collected": purchases go through Apple and nothing about them is sent
   to amivo's servers.
5. **Save**, then **Add for Review** / **Submit for Review**.

If Apple asks for a new screen recording, include buying a plan (in the review sandbox it's free) and
tapping Restore purchases.
