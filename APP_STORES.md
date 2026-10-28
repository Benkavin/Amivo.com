# Getting amivo into the App Store and Google Play

The iOS and Android apps are this same website wrapped with [Capacitor](https://capacitorjs.com).
`index.html` is still the one source of truth: change it, and both the website and the apps change.

## How it fits together

| Folder / file | What it is |
| --- | --- |
| `index.html`, `privacy.html`, `messages.json`, `icons/` | The website (served by GitHub Pages at amivo.ca). |
| `scripts/build-www.js` | Copies the site into `www/` and adds the Capacitor scripts to the app copy only. |
| `capacitor.config.json` | App id `ca.amivo.app`, name, colours, notification icon. |
| `android/`, `ios/` | The native projects you open in Android Studio and Xcode. |
| `assets/` + `scripts/make-app-icons.py` | The 1024px icon and splash; Android/iOS sizes are generated from these. |
| `.github/workflows/app-build.yml` | Builds both apps on every PR so we know they still compile. |

What's different inside the apps (all in `index.html`, behind `NATIVE`):

- **Notifications are local.** The phone schedules the next 30 days of morning and evening reminders itself,
  using the built-in year of messages. No push keys, no server, and they work offline. They top up each time
  amivo opens. Tapping the evening one opens the journal.
- **Sharing uses the phone's share sheet** with the picture attached (Instagram, Messages, Save Image, and so on).
- **No "Membership preview" and no "prototype" wording.** Apple rejects apps that look like demos or that mention
  prices you can't buy in the app.
- **Settings links to the privacy policy** (`privacy.html`, which is also live at amivo.ca/privacy.html).

## Commands

```bash
npm install
npm run sync      # copy the site into the apps after changing index.html
npm run android   # open in Android Studio
npm run ios       # open in Xcode (Mac only)
python3 scripts/make-app-icons.py && npx @capacitor/assets generate --iconBackgroundColor '#f8f6ef' --splashBackgroundColor '#f8f6ef' --splashBackgroundColorDark '#f8f6ef'
                  # only if the logo changes (then undo the extra files it writes to icons/ and manifest.webmanifest)
```

## Things only you can do

1. **Apple Developer Program**: enrol at developer.apple.com ($99 USD a year). Enrolling as an organization needs a D-U-N-S number;
   as an individual, your own name shows as the seller.
2. **Google Play Console**: sign up at play.google.com/console ($25 USD once). New personal accounts must run a
   **closed test with at least 12 testers for 14 days** before Google lets you publish to everyone, so start this early.
3. **A Mac with Xcode** to sign and upload the iOS build. No Mac? A cloud Mac service works too
   (for example Codemagic, Ionic Appflow, or a rented Mac).
4. **Contact email**: make sure support@amivo.ca receives mail. It's the contact on the privacy policy and goes in both store listings.
5. **Store listing**: short and full description, screenshots (iPhone 6.9" and Android phone), a 1024×500 Play
   feature graphic, category (Health & Fitness or Lifestyle), and the content rating and data safety questionnaires.

## Releasing Android

1. In Android Studio: **Build → Generate Signed App Bundle**, create an upload key, and **keep the key file and
   passwords somewhere safe** (losing them means you can't update the app).
2. Upload the `.aab` to a closed test track in Play Console, add testers, then promote to production when allowed.
3. Data safety form answers: no data collected or shared by the app (reflections stay on the phone; the app only
   asks the server for the day's message).
4. Bump `versionCode` and `versionName` in `android/app/build.gradle` for every new upload.

## Releasing iOS

1. In Xcode, open `ios/App/App.xcodeproj`, pick your team under **Signing & Capabilities**, and set the bundle id
   to `ca.amivo.app` (register it in your developer account).
2. **Product → Archive**, then **Distribute App → App Store Connect**.
3. In App Store Connect: create the app, fill the listing, privacy nutrition label ("Data Not Collected"),
   privacy policy URL `https://www.amivo.ca/privacy.html`, then submit for review.
4. Bump the version and build number in Xcode for every new upload.

## Store rules to keep in mind

- **Payments.** Premium (PR #3) uses Stripe. Inside the iOS app, Apple requires its own in-app purchase for digital
  subscriptions, and Google Play requires Play Billing. Stripe links and prices must not appear in the apps.
  Plan: ship v1 free, then add store billing (for example with RevenueCat) as a follow-up.
- **Ads.** AdSense isn't allowed in native apps; use Google AdMob if the free plan shows ads in the apps.
- **Thin wrappers (Apple 4.2).** Apple rejects apps that are just a website in a frame. Local notifications,
  the native share sheet and full offline use are what make amivo a real app; mention them in the review notes.
- **Accounts.** If the email sign-up (PR #2) becomes an account, both stores require a way to delete it from inside the app,
  and the privacy policy must mention the email address.
- **Daily messages from the server.** The `daily` Supabase function only accepts requests from amivo.ca, so the apps
  currently show the built-in message for each day. Adding `capacitor://localhost` and `https://localhost` to its
  `ALLOWED_ORIGINS` would let the apps show the freshly written messages too.
