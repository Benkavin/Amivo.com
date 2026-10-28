// Notification (VAPID) keys are created once inside Supabase and kept in the private
// app_secrets table, so the private key never leaves your project.
import webpush from "npm:web-push@3.6.7";

type Db = { from: (t: string) => any };

async function read(db: Db, names: string[]): Promise<Record<string, string>> {
  const { data, error } = await db.from("app_secrets").select("name,value").in("name", names);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: { name: string; value: string }) => [r.name, r.value]));
}

export async function getVapidKeys(db: Db): Promise<{ publicKey: string; privateKey: string }> {
  let s = await read(db, ["vapid_public", "vapid_private"]);
  if (!s.vapid_public || !s.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    // If two requests race, the first insert wins and both read it back.
    await db.from("app_secrets").upsert(
      [{ name: "vapid_public", value: k.publicKey }, { name: "vapid_private", value: k.privateKey }],
      { onConflict: "name", ignoreDuplicates: true },
    );
    s = await read(db, ["vapid_public", "vapid_private"]);
  }
  return { publicKey: s.vapid_public, privateKey: s.vapid_private };
}

export async function getSecret(db: Db, name: string): Promise<string | undefined> {
  return (await read(db, [name]))[name];
}
