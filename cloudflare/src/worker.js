// Joy To Play: veřejný web, formulář tipů a /admin. Statické soubory (CSS, JS, obrázky) jdou z public/ přes ASSETS.
import { loadSite, loadVideo, loadSong, loadSitemap } from "./data.js";
import { homePage, songbookPage, chordsPage, channelsPage, aboutPage, recommendPage, videoPage, songPage, notFoundPage, sitemap } from "./pages.js";
import { handleAdmin } from "./admin.js";

// Testovací tajný klíč Cloudflare k testovacímu site key 1x000…AA (projde vždy).
const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET = "1x0000000000000000000000000000000AA";

function respond(body, { status = 200, type = "text/html; charset=utf-8", cache = "public, max-age=60", headers = {} } = {}) {
  return new Response(body, { status, headers: { "Content-Type": type, "Cache-Control": cache, ...headers } });
}

async function verifyTurnstile(token, ip, env) {
  const secret = env.TURNSTILE_SECRET || (env.TURNSTILE_SITE_KEY === TEST_SITE_KEY ? TEST_SECRET : "");
  if (!secret || !token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

async function handleTip(request, env) {
  const fail = (error, status = 400) => Response.json({ ok: false, error }, { status });
  let data;
  try {
    data = await request.json();
  } catch {
    return fail("bad-request");
  }
  // Skryté pole vyplní jen robot: tváříme se, že je vše v pořádku, a nic neukládáme.
  if (data._gotcha) return Response.json({ ok: true });
  const url = String(data.url || "").trim();
  const why = String(data.why || "").trim();
  if (!/^https?:\/\/\S+$/i.test(url) || url.length > 500 || !why || why.length > 1000) return fail("invalid");
  if (!(await verifyTurnstile(data.token, request.headers.get("CF-Connecting-IP"), env))) return fail("captcha", 403);
  await env.DB.prepare("INSERT INTO tips (url, why) VALUES (?, ?)").bind(url, why).run();
  return Response.json({ ok: true });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/admin" || path.startsWith("/admin/")) return handleAdmin(request, env, path);
  if (path === "/api/tip") return request.method === "POST" ? handleTip(request, env) : respond("", { status: 405 });
  if (request.method !== "GET" && request.method !== "HEAD") return respond("", { status: 405 });

  if (path === "/") return respond(homePage(await loadSite(env.DB), env));
  if (path === "/zpevnik") return respond(songbookPage(await loadSite(env.DB), env));
  if (path === "/akordy") return respond(chordsPage(env));
  if (path === "/kanaly") return respond(channelsPage(await loadSite(env.DB), env));
  if (path === "/o-mne") return respond(aboutPage(env));
  if (path === "/doporuc") return respond(recommendPage(env));
  if (path === "/sitemap.xml") return respond(sitemap(await loadSitemap(env.DB), env), { type: "application/xml; charset=utf-8", cache: "public, max-age=3600" });

  let match = path.match(/^\/video\/([a-z0-9-]+)$/);
  if (match) {
    const data = await loadVideo(env.DB, match[1]);
    if (data) return respond(videoPage(data, env));
  }
  match = path.match(/^\/pisen\/([a-z0-9-]+)$/);
  if (match) {
    const data = await loadSong(env.DB, match[1]);
    if (data) return respond(songPage(data, env));
  }

  // Ostatní cesty zkusí statické soubory, jinak 404. Systémové soubory (_worker.js, .assetsignore) se neukazují.
  const asset = /^\/[._]/.test(path) ? null : await env.ASSETS.fetch(request);
  if (asset && asset.status !== 404) return asset;
  return respond(notFoundPage(env), { status: 404, cache: "no-store" });
}

export default {
  async fetch(request, env) {
    const response = await route(request, env);
    // Zkušební adresy (workers.dev, pages.dev) nemají jít do vyhledávačů, ostrá je jen SITE_URL.
    if (new URL(request.url).host !== new URL(env.SITE_URL).host) {
      const copy = new Response(response.body, response);
      copy.headers.set("X-Robots-Tag", "noindex");
      return copy;
    }
    return response;
  },
};
