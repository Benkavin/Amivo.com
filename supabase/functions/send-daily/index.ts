// amivo: sends the morning message and evening reflection to each phone at its chosen time.
// Runs every 5 minutes from a database schedule. Deploy with JWT verification off;
// it checks its own secret header (stored in app_secrets) instead.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isDue, localNow, pick, pickFromMix, type Local } from "./schedule.ts";
import { getSecret, getVapidKeys } from "./keys.ts";
import bundled from "./messages.json" with { type: "json" };

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.amivo.ca").replace(/\/$/, "");
// Push services ask for a contact for the sender; the app's own address works.
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? `${SITE_URL}/`;

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Content = {
  messages: Record<string, string[]>;
  eveningPrompts: string[];
};

// Same messages.json the app uses, read from the live site so edits there apply here too.
// Falls back to the copy deployed with this function if the site can't be reached.
async function loadContent(): Promise<Content> {
  try {
    const res = await fetch(`${SITE_URL}/messages.json`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (_) { /* use the bundled copy */ }
  return bundled as Content;
}

type Row = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  category: string; // one category, or a mix like "stress,gratitude,general"
  morning_enabled: boolean;
  morning_time: string;
  evening_enabled: boolean;
  evening_time: string;
  last_morning_date: string | null;
  last_evening_date: string | null;
};

async function send(row: Row, payload: Record<string, string>): Promise<"sent" | "gone" | "failed"> {
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 3, urgency: "normal" },
    );
    return "sent";
  } catch (err: any) {
    // 404/410: the phone unsubscribed or the app was removed.
    if (err?.statusCode === 404 || err?.statusCode === 410) return "gone";
    console.error("push failed", row.id, err?.statusCode, err?.body ?? err?.message);
    return "failed";
  }
}

// New daily messages written by generate-daily; falls back to the rotation if a day is missing.
const dailyCache = new Map<string, Promise<string | undefined>>();
function daily(day: string, style: string): Promise<string | undefined> {
  const key = `${day}|${style}`;
  if (!dailyCache.has(key)) {
    dailyCache.set(key, (async () => {
      const { data } = await db.from("daily_messages").select("body").eq("day", day).eq("style", style).maybeSingle();
      return data?.body as string | undefined;
    })().catch(() => undefined));
  }
  return dailyCache.get(key)!;
}

async function handle(row: Row, content: Content, now: Date) {
  let local: Local;
  try { local = localNow(now, row.timezone); } catch { local = localNow(now, "UTC"); }

  const jobs: Array<{ kind: "morning" | "evening"; payload: Record<string, string> }> = [];

  if (isDue(row.morning_enabled, row.morning_time, row.last_morning_date, local)) {
    const today = pickFromMix(content.messages, row.category ?? "general", local.date);
    const body = (await daily(local.date, today.style)) ?? today.body;
    jobs.push({
      kind: "morning",
      payload: { title: "Good morning", body, tag: "amivo-morning", url: "./" },
    });
  }
  if (isDue(row.evening_enabled, row.evening_time, row.last_evening_date, local)) {
    jobs.push({
      kind: "evening",
      payload: {
        title: "Time to reflect",
        body: (await daily(local.date, "evening")) ?? pick(content.eveningPrompts, local.date),
        tag: "amivo-evening",
        url: "./#journal",
      },
    });
  }

  const results: string[] = [];
  for (const job of jobs) {
    const result = await send(row, job.payload);
    results.push(`${job.kind}:${result}`);
    if (result === "gone") {
      await db.from("push_subscriptions").delete().eq("id", row.id);
      break;
    }
    if (result === "sent") {
      const column = job.kind === "morning" ? "last_morning_date" : "last_evening_date";
      await db.from("push_subscriptions").update({ [column]: local.date }).eq("id", row.id);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  const cronSecret = await getSecret(db, "cron_secret").catch(() => undefined);
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const keys = await getVapidKeys(db);
    webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
  } catch (e) {
    console.error(e);
    return new Response("Keys unavailable", { status: 500 });
  }

  const now = new Date();
  dailyCache.clear();
  const content = await loadContent();

  const tally = { checked: 0, sent: 0, removed: 0, failed: 0 };
  const PAGE = 500;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("push_subscriptions")
      .select("*")
      .or("morning_enabled.eq.true,evening_enabled.eq.true")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(error);
      return new Response("Database error", { status: 500 });
    }
    if (!data?.length) break;

    // Send in small batches so one slow push service doesn't hold everything up.
    for (let i = 0; i < data.length; i += 25) {
      const batch = await Promise.all(data.slice(i, i + 25).map((row) => handle(row as Row, content, now)));
      for (const results of batch) {
        tally.checked++;
        for (const r of results) {
          if (r.endsWith(":sent")) tally.sent++;
          else if (r.endsWith(":gone")) tally.removed++;
          else if (r.endsWith(":failed")) tally.failed++;
        }
      }
    }
    if (data.length < PAGE) break;
  }

  return new Response(JSON.stringify(tally), { headers: { "Content-Type": "application/json" } });
});
