import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const dist = resolve(root, "dist");
const apiBaseUrl = String(process.env.API_BASE_URL || "").replace(/\/$/, "");
const wsBaseUrl = String(
  process.env.WS_BASE_URL || apiBaseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:")
).replace(/\/$/, "");

if (!apiBaseUrl || !/^https?:\/\//.test(apiBaseUrl)) {
  throw new Error("API_BASE_URL must be an absolute http(s) URL for the frontend build.");
}
if (!wsBaseUrl || !/^wss?:\/\//.test(wsBaseUrl)) {
  throw new Error("WS_BASE_URL must be an absolute ws(s) URL for the frontend build.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const filename of ["index.html", "styles.css", "app.js"]) {
  await cp(resolve(root, filename), resolve(dist, filename));
}
await writeFile(
  resolve(dist, "config.js"),
  `window.APP_CONFIG = ${JSON.stringify({ API_BASE_URL: apiBaseUrl, WS_BASE_URL: wsBaseUrl })};\n`,
  "utf8",
);

const html = await readFile(resolve(dist, "index.html"), "utf8");
if (!html.includes("/config.js")) throw new Error("index.html must load /config.js before /app.js");
console.log(`Built standalone frontend for ${apiBaseUrl}`);
