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
3. **No Mac needed**: the Store release workflow builds and signs both apps on GitHub. You add a few secrets once (below).
4. **Contact email**: make sure support@amivo.ca receives mail. It's the contact on the privacy policy and goes in both store listings.
5. **Store listing**: short and full description, screenshots (iPhone 6.9" and Android phone), a 1024×500 Play
   feature graphic, category (Health & Fitness or Lifestyle), and the content rating and data safety questionnaires.

## Building the store versions (no Mac needed)

The **Store release** workflow (Actions tab → Store release → Run workflow) builds both apps on GitHub's machines.
Enter the version people will see (for example `1.0.0`); the build number goes up by itself on every run.
It needs these repository secrets (Settings → Secrets and variables → Actions → New repository secret):

| Secret | Where it comes from |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Your upload key file, base64-encoded (see below) |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password you chose |
| `ANDROID_KEY_ALIAS` | `upload` (the alias used below) |
| `ANDROID_KEY_PASSWORD` | The key password you chose (keytool may use the keystore password for both) |
| `APPLE_TEAM_ID` | developer.apple.com → Account → Membership details → Team ID |
| `APPSTORE_API_KEY_ID` | App Store Connect → Users and Access → Integrations → App Store Connect API → your key's Key ID |
| `APPSTORE_API_ISSUER_ID` | The Issuer ID shown above the keys on that same page |
| `APPSTORE_API_PRIVATE_KEY` | The whole text of the `.p8` file you download when creating the key |

### Android upload key (once)

Open Google Cloud Shell (shell.cloud.google.com, free, in the browser) or any computer with Java, and run:

```bash
keytool -genkeypair -v -keystore amivo-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 amivo-upload.jks > amivo-upload.b64   # paste this file's text into ANDROID_KEYSTORE_BASE64
```

Download `amivo-upload.jks` and keep it with its passwords somewhere safe (a password manager). Google re-signs the
app with its own key (Play App Signing), so if the upload key is ever lost, Play support can reset it.

### Releasing Android

1. Play Console → **Create app**: name `amivo: Daily Encouragement`, app, free. Accept the declarations.
2. Run **Store release** with platform `android`, then download the `.aab` from the run's Artifacts.
3. Testing → **Closed testing** → create a track, add at least 12 testers (an email list), upload the `.aab`, and
   roll it out. Keep it running 14 days, then apply for production access from the Dashboard.
4. Meanwhile fill **Main store listing**, **App content** (privacy policy, ads: no, data safety, content rating,
   target audience 13+) and **Store settings** using the store listings doc.

### Releasing iOS

1. developer.apple.com → Identifiers: make sure `ca.amivo.app` exists (the sign-in thread may already have added it
   with Sign in with Apple; that's fine).
2. App Store Connect → Users and Access → Integrations → **App Store Connect API** → generate a key with **Admin**
   access (cloud signing needs it). Download the `.p8` (only possible once) and add the Apple secrets above.
3. App Store Connect → Apps → **+ New App**: iOS, name `amivo: Daily Encouragement`, language English (Canada or U.S.),
   bundle ID `ca.amivo.app`, SKU `amivo-ios`.
4. Run **Store release** with platform `ios`. About 15 minutes after it finishes, the build appears in TestFlight.
   Answer the export compliance question if asked (the app uses no non-exempt encryption).
5. Fill the listing, privacy label ("Data Not Collected"), age rating and review notes from the store listings doc,
   add screenshots, pick the build, then **Add for Review**.

## What the apps include (v1)

- **Every feature is free in the apps.** Premium is sold on the website with Stripe, but Apple and Google require their
  own billing for digital subscriptions inside apps, so the apps unlock everything (`isPremium()` is true there) and
  never mention Premium, prices or Stripe. Store billing (for example with RevenueCat) can come in an update.
- **No ads in the apps.** AdSense isn't allowed in native apps. If the free plan gets ads in the apps later, use AdMob,
  and on iOS show Apple's tracking prompt (App Tracking Transparency) and update the privacy labels.
- **No sign-in in the apps.** Accounts (email, username, Google, Apple) are website-only. That keeps the apps clear of
  two store rules: an app that creates accounts must let people delete them inside the app, and an iOS app that offers
  Google sign-in must also offer Sign in with Apple. Google also blocks its sign-in page inside app web views, so sign-in
  in the apps would need native sign-in plugins.
- **Journal export** goes to the phone's share sheet (Save to Files, Mail, and so on), because downloads don't work in apps.

## Store rules to keep in mind

- **Thin wrappers (Apple 4.2).** Apple rejects apps that are just a website in a frame. Local notifications,
  the native share sheet and full offline use are what make amivo a real app; mention them in the review notes.
- **Privacy answers.** The apps collect nothing: App Store privacy label "Data Not Collected", and on Google Play's data
  safety form, no data collected or shared.
- **Daily messages from the server.** If the `daily` Supabase function only accepts requests from amivo.ca, the apps
  show the built-in message for each day. Adding `capacitor://localhost` and `https://localhost` to its
  `ALLOWED_ORIGINS` lets the apps show the freshly written messages too.
