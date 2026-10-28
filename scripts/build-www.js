// Copies the website into www/, the folder Capacitor bundles into the iOS and Android apps.
// The site itself stays at the repo root so GitHub Pages keeps serving it unchanged.
// Only the app copy of index.html gets the Capacitor scripts, so the website never loads them.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");
const FILES = ["index.html", "privacy.html", "messages.json", "manifest.webmanifest", "og-image.png"];
const DIRS = ["icons"];
const NATIVE_SCRIPTS = {
  "capacitor.js": "@capacitor/core/dist/capacitor.js",
  "local-notifications.js": "@capacitor/local-notifications/dist/plugin.js",
  "filesystem.js": "@capacitor/filesystem/dist/plugin.js",
  "share.js": "@capacitor/share/dist/plugin.js"
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "native"), { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });

const tags = [];
for (const [name, src] of Object.entries(NATIVE_SCRIPTS)) {
  const code = fs.readFileSync(require.resolve(src), "utf8").replace(/\/\/# sourceMappingURL=.*$/m, "");
  fs.writeFileSync(path.join(out, "native", name), code);
  tags.push(`<script src="native/${name}"></script>`);
}

const indexPath = path.join(out, "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const marker = "<script>\n/* ---------- Setup";
if (!html.includes(marker)) throw new Error("Couldn't find where to add the Capacitor scripts in index.html");
fs.writeFileSync(indexPath, html.replace(marker, tags.join("\n") + "\n" + marker));
console.log("Copied the site into www/ with the app scripts");
