// /admin: správa dat webu (videa, písničky, kategorie, sekce, kanály, tipy). Texty webu zůstávají v kódu.
import { isLoggedIn, loginConfigured, checkPassword, sessionCookie, logoutCookie } from "./session.js";
import { esc, slugify, youtubeId } from "./util.js";

const now = () => new Date().toISOString().slice(0, 19);
const DIFFICULTY = [[1, "1 · Úplný začátek"], [2, "2 · Lehké"], [3, "3 · Střední"], [4, "4 · Těžší"], [5, "5 · Náročné"]];

// Popis seznamů: tabulka, pole formuláře a jak vypadá řádek v přehledu.
const ENTITIES = {
  videa: {
    table: "videos", title: "Videa", one: "video",
    list: `SELECT v.*, (SELECT group_concat(c.label, ', ') FROM video_categories vc JOIN categories c ON c.id = vc.category_id
             WHERE vc.video_id = v.id) AS cats FROM videos v ORDER BY COALESCE(v.added, '') DESC, v.sort DESC`,
    row: (v) => [v.song, `${v.channel} · ${v.cats || "bez kategorie"}${v.top ? " · top" : ""}`, v.status === "hidden" ? "skryté" : ""],
    view: (v) => v.status === "published" && `/video/${v.slug}`,
    fields: [
      { name: "youtube_id", label: "Odkaz na YouTube", type: "youtube", required: true },
      { name: "song", label: "Písnička", type: "text", required: true },
      { name: "artist", label: "Interpret", type: "text", nullable: true },
      { name: "channel", label: "Kanál (autor videa)", type: "text", required: true },
      { name: "title", label: "Nadpis komentáře", type: "text", required: true, hint: "Tučný řádek nad komentářem, např. „Tři akordy a úsměv“." },
      { name: "comment", label: "Komentář TJ", type: "textarea", required: true },
      { name: "difficulty", label: "Obtížnost", type: "select", numeric: true, options: async () => DIFFICULTY, default: 2 },
      { name: "time", label: "Čas", type: "text", required: true, default: "1 večer", hint: "Např. 20 minut, 1 večer, 3 večery, 1 týden." },
      { name: "chords", label: "Akordy", type: "text", nullable: true, hint: "Akordy, které video používá, oddělené mezerou, česky (H místo B). Např. G D Em C. Ukážou se na kartě." },
      { name: "barre", label: "Barré", type: "select", numeric: true, empty: "neuvedeno", options: async () => [["0", "ne"], ["1", "ano"]] },
      { name: "capo", label: "Kapodastr", type: "select", numeric: true, empty: "neuvedeno", options: async () => [["0", "bez kapodastru"], ...[1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), `${n}. pražec`])] },
      { name: "lang", label: "Jazyk návodu", type: "select", empty: "neuvedeno", options: async () => [["cs", "česky"], ["en", "anglicky"]] },
      { name: "categories", label: "Kategorie", type: "categories" },
      { name: "top", label: "Top objev", type: "checkbox" },
      { name: "status", label: "Stav", type: "select", options: async () => [["published", "Na webu"], ["hidden", "Skryté"]], default: "published" },
      { name: "added", label: "Přidáno", type: "text", nullable: true, hint: "Datum pro řazení v „Nejnovějších“ (RRRR-MM-DDTHH:MM:SS). U nového videa se vyplní samo." },
      { name: "slug", label: "Adresa stránky", type: "slug", from: "song", prefix: "/video/" },
    ],
  },
  pisne: {
    table: "songs", title: "Písničky", one: "písničku",
    list: "SELECT s.*, v.song AS video_song FROM songs s LEFT JOIN videos v ON v.id = s.video_id ORDER BY s.artist, s.song",
    row: (s) => [s.song, `${s.artist}${s.note ? ` · ${s.note}` : ""}`, s.video_song ? "má video" : ""],
    view: (s) => `/pisen/${s.slug}`,
    fields: [
      { name: "artist", label: "Interpret", type: "text", required: true },
      { name: "song", label: "Písnička", type: "text", required: true },
      { name: "chords_url", label: "Odkaz na akordy", type: "url", required: true },
      { name: "note", label: "Poznámka", type: "text", hint: "Např. ukulele, tabulatura. Většinou prázdné." },
      { name: "video_id", label: "Video na webu", type: "select", numeric: true, empty: "— bez videa —",
        options: async (db) => (await db.prepare("SELECT id, song, channel FROM videos ORDER BY song").all()).results.map((v) => [v.id, `${v.song} (${v.channel})`]) },
      { name: "slug", label: "Adresa stránky", type: "slug", from: ["artist", "song"], prefix: "/pisen/" },
    ],
  },
  kategorie: {
    table: "categories", title: "Kategorie", one: "kategorii",
    list: "SELECT c.*, (SELECT count(*) FROM video_categories vc WHERE vc.category_id = c.id) AS n FROM categories c ORDER BY sort, id",
    row: (c) => [c.label, `klíč ${c.key} · ${c.n} videí`, ""],
    fields: [
      { name: "label", label: "Název na záložce", type: "text", required: true },
      { name: "key", label: "Klíč", type: "slug", from: "label", hint: "Krátký kód bez mezer a diakritiky, používá se v odkazech. Po změně zkontroluj sekce." },
      { name: "sort", label: "Pořadí", type: "number", default: 100 },
    ],
  },
  sekce: {
    table: "sections", title: "Sekce", one: "sekci",
    list: "SELECT * FROM sections ORDER BY sort, id",
    row: (s) => [s.title, s.text, `filtr ${s.filter}`],
    fields: [
      { name: "title", label: "Nadpis dlaždice", type: "text", required: true },
      { name: "text", label: "Text", type: "textarea", required: true },
      { name: "filter", label: "Vede na", type: "select",
        options: async (db) => [
          ...(await db.prepare("SELECT key, label FROM categories ORDER BY sort").all()).results.map((c) => [c.key, `Kategorie: ${c.label}`]),
          ["top", "Top objevy"], ["latest", "Nejnovější"], ["all", "Všechna videa"],
        ] },
      { name: "sort", label: "Pořadí", type: "number", default: 100 },
    ],
  },
  kanaly: {
    table: "channels", title: "Kanály", one: "kanál",
    list: "SELECT * FROM channels ORDER BY sort, id",
    row: (c) => [c.name, c.text, ""],
    fields: [
      { name: "name", label: "Název", type: "text", required: true },
      { name: "url", label: "Odkaz", type: "url", required: true },
      { name: "text", label: "Popis", type: "textarea", required: true },
      { name: "sort", label: "Pořadí", type: "number", default: 100 },
    ],
  },
};

const MENU = [["", "Přehled"], ["tipy", "Tipy"], ...Object.entries(ENTITIES).map(([k, e]) => [k, e.title])];

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Frame-Options": "DENY" } });
}

const redirect = (url) => new Response(null, { status: 303, headers: { Location: url } });

function shell(title, active, body) {
  return html(`<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="robots" content="noindex">
  <title>${esc(title)} · Správa Joy To Play</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css?v=26">
  <link rel="stylesheet" href="/admin.css?v=2">
</head>
<body class="admin">
  <nav class="topnav" aria-label="Správa">
    <div class="in">
      <b><a class="logo" href="/admin"><span>Správa Joy To Play</span></a></b>
      <div class="admin-links">
        ${MENU.map(([k, label]) => `<a href="/admin${k ? `/${k}` : ""}"${k === active ? ' class="is-active"' : ""}>${label}</a>`).join("")}
        <a href="/" target="_blank">Web ↗</a>
      </div>
    </div>
  </nav>
  <main class="wrap admin-main">
${body}
    <footer><form method="post" action="/admin/logout"><button class="btn btn-quiet">Odhlásit</button></form></footer>
  </main>
</body>
</html>`);
}

async function overview(db) {
  const [counts, tips] = await db.batch([
    db.prepare(`SELECT (SELECT count(*) FROM videos WHERE status = 'published') AS videos, (SELECT count(*) FROM videos WHERE status = 'hidden') AS hidden,
                (SELECT count(*) FROM songs) AS songs, (SELECT count(*) FROM tips WHERE status = 'new') AS tips`),
    db.prepare("SELECT * FROM tips WHERE status = 'new' ORDER BY created DESC LIMIT 5"),
  ]);
  const c = counts.results[0];
  return shell("Přehled", "", `
    <h1>Přehled</h1>
    <div class="admin-kpis">
      <a href="/admin/tipy"><b>${c.tips}</b><span>nových tipů</span></a>
      <a href="/admin/videa"><b>${c.videos}</b><span>videí na webu${c.hidden ? `, ${c.hidden} skrytých` : ""}</span></a>
      <a href="/admin/pisne"><b>${c.songs}</b><span>písniček ve zpěvníku</span></a>
    </div>
    <div class="admin-actions"><a class="btn btn-primary" href="/admin/videa/new">Přidat video</a><a class="btn btn-quiet" href="/admin/pisne/new">Přidat písničku</a></div>
    ${tips.results.length ? `<h2>Nové tipy</h2>${tipList(tips.results)}` : ""}`);
}

function tipList(tips) {
  return `<ul class="admin-list">${tips.map((t) => `
      <li class="tip is-${t.status}">
        <div><a href="${esc(t.url)}" target="_blank" rel="noreferrer">${esc(t.url)}</a><p>${esc(t.why)}</p>
        <small>${esc(t.created.replace("T", " "))} · ${{ new: "nový", approved: "přidáno", rejected: "zamítnuto" }[t.status]}</small></div>
        <form method="post" action="/admin/tipy/${t.id}">
          ${t.status === "new" ? `<a class="btn btn-primary" href="/admin/videa/new?tip=${t.id}">Přidat jako video</a>
          <button class="btn btn-quiet" name="action" value="reject">Zamítnout</button>` : `<button class="btn btn-quiet" name="action" value="reopen">Vrátit mezi nové</button>`}
          <button class="btn btn-quiet is-danger" name="action" value="delete" onclick="return confirm('Smazat tip?')">Smazat</button>
        </form>
      </li>`).join("")}</ul>`;
}

async function tipsPage(db) {
  const { results } = await db.prepare("SELECT * FROM tips ORDER BY status = 'new' DESC, created DESC LIMIT 200").all();
  return shell("Tipy", "tipy", `
    <h1>Tipy od návštěvníků</h1>
    ${results.length ? tipList(results) : `<p class="empty">Zatím žádné tipy.</p>`}`);
}

async function tipAction(db, id, action) {
  if (action === "delete") await db.prepare("DELETE FROM tips WHERE id = ?").bind(id).run();
  else if (action === "reject") await db.prepare("UPDATE tips SET status = 'rejected' WHERE id = ?").bind(id).run();
  else if (action === "reopen") await db.prepare("UPDATE tips SET status = 'new', video_id = NULL WHERE id = ?").bind(id).run();
  return redirect("/admin/tipy");
}

async function listPage(db, key, flash) {
  const e = ENTITIES[key];
  const { results } = await db.prepare(e.list).all();
  return shell(e.title, key, `
    <div class="admin-head"><h1>${e.title} <small>${results.length}</small></h1><a class="btn btn-primary" href="/admin/${key}/new">Přidat ${e.one}</a></div>
    ${flash ? `<p class="alert ok">${esc(flash)}</p>` : ""}
    ${results.length > 12 ? `<input class="song-search admin-filter" type="search" placeholder="Hledat" oninput="const q=this.value.toLowerCase();document.querySelectorAll('.admin-list li').forEach(li=>li.hidden=!li.textContent.toLowerCase().includes(q))">` : ""}
    <ul class="admin-list">${results.map((r) => {
      const [main, sub, badge] = e.row(r);
      return `<li><a href="/admin/${key}/${r.id}"><b>${esc(main)}</b><span>${esc(sub)}</span></a>${badge ? `<em>${esc(badge)}</em>` : ""}</li>`;
    }).join("")}</ul>`);
}

async function field(f, value, db, extra) {
  const id = `f-${f.name}`;
  const req = f.required ? " required" : "";
  const hint = f.hint ? `<small>${esc(f.hint)}</small>` : "";
  let input;
  switch (f.type) {
    case "textarea":
      input = `<textarea id="${id}" name="${f.name}" rows="4"${req}>${esc(value)}</textarea>`;
      break;
    case "number":
      input = `<input id="${id}" name="${f.name}" type="number" value="${esc(value)}"${req}>`;
      break;
    case "url":
      input = `<input id="${id}" name="${f.name}" type="url" value="${esc(value)}"${req}>`;
      break;
    case "youtube":
      input = `<input id="${id}" name="${f.name}" type="text" value="${value ? `https://www.youtube.com/watch?v=${esc(value)}` : esc(extra.youtubeRaw || "")}" placeholder="https://www.youtube.com/watch?v=…"${req}>`;
      break;
    case "checkbox":
      return `<label class="admin-check"><input type="checkbox" name="${f.name}" value="1"${value ? " checked" : ""}> ${esc(f.label)}</label>`;
    case "select": {
      const opts = await f.options(db);
      input = `<select id="${id}" name="${f.name}"${req}>${f.empty ? `<option value="">${esc(f.empty)}</option>` : ""}${opts
        .map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
      break;
    }
    case "categories": {
      const cats = (await db.prepare("SELECT id, label FROM categories ORDER BY sort").all()).results;
      const on = new Set((value || []).map(String));
      return `<fieldset class="admin-field"><legend>${esc(f.label)}</legend><div class="admin-cats">${cats
        .map((c) => `<label class="admin-check"><input type="checkbox" name="categories" value="${c.id}"${on.has(String(c.id)) ? " checked" : ""}> ${esc(c.label)}</label>`).join("")}</div></fieldset>`;
    }
    case "slug":
      input = `<input id="${id}" name="${f.name}" type="text" value="${esc(value)}" pattern="[a-z0-9-]*" placeholder="vyplní se samo">`;
      return `<div class="admin-field"><label for="${id}">${esc(f.label)}</label>${input}<small>${esc(f.hint || `${f.prefix}… Prázdné = vytvoří se z názvu. Po změně přestanou fungovat staré odkazy.`)}</small></div>`;
    default:
      input = `<input id="${id}" name="${f.name}" type="text" value="${esc(value)}"${req}>`;
  }
  return `<div class="admin-field"><label for="${id}">${esc(f.label)}</label>${input}${hint}</div>`;
}

async function formPage(db, key, id, { values = null, error = "", tip = null } = {}) {
  const e = ENTITIES[key];
  let row = values;
  if (!row && id) {
    row = await db.prepare(`SELECT * FROM ${e.table} WHERE id = ?`).bind(id).first();
    if (!row) return html("Nenalezeno", 404);
    if (key === "videa") row.categories = (await db.prepare("SELECT category_id FROM video_categories WHERE video_id = ?").bind(id).all()).results.map((r) => r.category_id);
  }
  if (!row) row = Object.fromEntries(e.fields.map((f) => [f.name, f.default ?? (f.type === "categories" ? [] : "")]));
  const extra = {};
  if (tip && !values) extra.youtubeRaw = tip.url;
  const fields = (await Promise.all(e.fields.map((f) => field(f, row[f.name], db, extra)))).join("\n");
  const view = id && e.view && e.view(row);
  return shell(`${id ? "Upravit" : "Přidat"} ${e.one}`, key, `
    <div class="admin-head"><h1>${id ? esc(row[e.fields[1]?.name] || row[e.fields[0].name]) : `Přidat ${e.one}`}</h1>${view ? `<a class="btn btn-quiet" href="${esc(view)}" target="_blank">Zobrazit na webu ↗</a>` : ""}</div>
    ${tip ? `<p class="alert ok">Tip od návštěvníka: „${esc(tip.why)}“</p>` : ""}
    ${error ? `<p class="alert">${esc(error)}</p>` : ""}
    <form class="tile admin-form" method="post" action="/admin/${key}/${id || "new"}">
      ${tip ? `<input type="hidden" name="tip" value="${tip.id}">` : ""}
      ${fields}
      <div class="admin-actions">
        <button class="btn btn-primary" name="action" value="save">Uložit</button>
        <a class="btn btn-quiet" href="/admin/${key}">Zpět</a>
        ${id ? `<button class="btn btn-quiet is-danger" name="action" value="delete" formnovalidate onclick="return confirm('Opravdu smazat? Nejde to vrátit.')">Smazat</button>` : ""}
      </div>
    </form>`);
}

async function uniqueSlug(db, table, column, base, id) {
  let slug = base, n = 2;
  while (await db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ? AND id != ?`).bind(slug, id || 0).first()) slug = `${base}-${n++}`;
  return slug;
}

async function save(db, key, id, form) {
  const e = ENTITIES[key];
  if (form.get("action") === "delete" && id) {
    await db.prepare(`DELETE FROM ${e.table} WHERE id = ?`).bind(id).run();
    return redirect(`/admin/${key}?ok=${encodeURIComponent("Smazáno.")}`);
  }
  const cols = {};
  const values = {};
  let categories = [];
  let error = "";
  for (const f of e.fields) {
    const raw = String(form.get(f.name) ?? "").trim();
    values[f.name] = raw;
    if (f.type === "categories") {
      categories = form.getAll("categories").map(Number).filter(Boolean);
      values.categories = categories;
      continue;
    }
    if (f.type === "checkbox") {
      cols[f.name] = raw ? 1 : 0;
      continue;
    }
    if (f.required && !raw) error ||= `Vyplň pole „${f.label}“.`;
    switch (f.type) {
      case "youtube":
        cols[f.name] = values[f.name] = youtubeId(raw);
        if (raw && !cols[f.name]) error ||= "Tohle nevypadá jako odkaz na YouTube video.";
        break;
      case "number":
        cols[f.name] = raw === "" ? (f.default ?? null) : Number(raw);
        break;
      case "select":
        cols[f.name] = raw === "" ? null : f.numeric ? Number(raw) : raw;
        break;
      case "url":
        if (raw && !/^https?:\/\//i.test(raw)) error ||= `Pole „${f.label}“ má být odkaz (https://…).`;
        cols[f.name] = raw;
        break;
      case "slug":
        cols[f.name] = slugify(raw || [f.from].flat().map((n) => form.get(n) || "").join(" "));
        break;
      default:
        cols[f.name] = raw === "" && f.nullable ? null : raw;
    }
  }
  const tipId = Number(form.get("tip")) || null;
  const tip = tipId ? await db.prepare("SELECT * FROM tips WHERE id = ?").bind(tipId).first() : null;
  if (key === "videa" && cols.youtube_id && !error) {
    const dup = await db.prepare("SELECT song FROM videos WHERE youtube_id = ? AND id != ?").bind(cols.youtube_id, id || 0).first();
    if (dup) error = `Tohle video už na webu je (${dup.song}).`;
  }
  if (error) return formPage(db, key, id, { values, error, tip });

  const slugField = e.fields.find((f) => f.type === "slug");
  if (slugField) cols[slugField.name] = await uniqueSlug(db, e.table, slugField.name, cols[slugField.name], id);
  if (key === "videa" && !cols.added) cols.added = id ? null : now();
  if (key === "videa" && !id) cols.sort = ((await db.prepare("SELECT max(sort) AS m FROM videos").first()).m || 0) + 1;

  const names = Object.keys(cols);
  let rowId = id;
  if (id) {
    await db.prepare(`UPDATE ${e.table} SET ${names.map((n) => `${n} = ?`).join(", ")} WHERE id = ?`).bind(...names.map((n) => cols[n]), id).run();
  } else {
    const res = await db.prepare(`INSERT INTO ${e.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`).bind(...names.map((n) => cols[n])).run();
    rowId = res.meta.last_row_id;
  }
  if (key === "videa") {
    await db.batch([
      db.prepare("DELETE FROM video_categories WHERE video_id = ?").bind(rowId),
      ...categories.map((c) => db.prepare("INSERT INTO video_categories (video_id, category_id) VALUES (?, ?)").bind(rowId, c)),
      ...(tip ? [db.prepare("UPDATE tips SET status = 'approved', video_id = ? WHERE id = ?").bind(rowId, tip.id)] : []),
    ]);
  }
  return redirect(`/admin/${key}?ok=${encodeURIComponent("Uloženo.")}`);
}

function loginPage(message = "", status = 200) {
  return html(`<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="robots" content="noindex">
  <title>Přihlášení · Správa Joy To Play</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css?v=26">
  <link rel="stylesheet" href="/admin.css?v=2">
</head>
<body class="admin">
  <main class="wrap admin-main admin-login">
    <h1>Správa Joy To Play</h1>
    ${message ? `<p class="alert">${esc(message)}</p>` : ""}
    <form class="tile admin-form" method="post" action="/admin/login">
      <div class="admin-field"><label for="f-password">Heslo</label>
        <input id="f-password" name="password" type="password" autocomplete="current-password" required autofocus></div>
      <div class="admin-actions"><button class="btn btn-primary">Přihlásit</button></div>
    </form>
  </main>
</body>
</html>`, status);
}

export async function handleAdmin(request, env, path) {
  const url = new URL(request.url);
  // Formuláře správy smí odeslat jen stránka správy (ochrana proti podvrženému odeslání z cizího webu).
  if (request.method === "POST" && request.headers.get("Origin") !== url.origin) return html("Neplatný původ požadavku.", 403);

  if (path === "/admin/login") {
    if (!loginConfigured(env)) return loginPage("Správa ještě nemá nastavené heslo (tajný klíč ADMIN_PASSWORD).", 503);
    if (request.method !== "POST") return loginPage();
    const form = await request.formData();
    const result = await checkPassword(String(form.get("password") || ""), request.headers.get("CF-Connecting-IP") || "?", env);
    if (result === "ok") return new Response(null, { status: 303, headers: { Location: "/admin", "Set-Cookie": await sessionCookie(env) } });
    if (result === "blocked") return loginPage("Moc špatných pokusů. Zkus to znovu za 15 minut.", 429);
    return loginPage("Špatné heslo.", 401);
  }
  if (path === "/admin/logout" && request.method === "POST") {
    return new Response(null, { status: 303, headers: { Location: "/admin/login", "Set-Cookie": logoutCookie() } });
  }
  if (!(await isLoggedIn(request, env))) {
    return request.method === "GET" ? redirect("/admin/login") : html("Nejsi přihlášený.", 401);
  }
  const db = env.DB;
  const [, , key = "", sub = ""] = path.split("/");
  const id = /^\d+$/.test(sub) ? Number(sub) : null;

  if (request.method === "POST") {
    const form = await request.formData();
    if (key === "tipy" && id) return tipAction(db, id, form.get("action"));
    if (ENTITIES[key] && (id || sub === "new")) return save(db, key, id, form);
    return html("Nenalezeno", 404);
  }

  if (!key) return overview(db);
  if (key === "tipy") return tipsPage(db);
  if (!ENTITIES[key]) return html("Nenalezeno", 404);
  if (!sub) return listPage(db, key, url.searchParams.get("ok"));
  if (sub === "new") {
    const tipId = Number(url.searchParams.get("tip")) || null;
    const tip = key === "videa" && tipId ? await db.prepare("SELECT * FROM tips WHERE id = ?").bind(tipId).first() : null;
    return formPage(db, key, null, { tip });
  }
  if (id) return formPage(db, key, id);
  return html("Nenalezeno", 404);
}
