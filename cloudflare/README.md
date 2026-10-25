# Joy To Play na Cloudflare (Workers + D1)

Nová verze webu kytara.tomasjindra.cz: stránky vykresluje Worker z databáze D1, statické soubory jsou v `public/`.
Dnešní statický web v kořeni repa (index.html, app.js, videos.json…) běží dál na GitHub Pages, dokud se nepřepne doména.

## Co kde je

- `src/worker.js` směrování: `/`, `/video/<slug>`, `/pisen/<slug>`, `/sitemap.xml`, `/api/tip`, `/admin`
- `src/pages.js` HTML webu. Texty webu (úvod, O mně, …) jsou tady.
- `src/data.js` dotazy do D1, `src/admin.js` správa, `src/session.js` přihlášení do správy heslem
- `public/` CSS, skript pro prohlížeč, obrázky (styles.css je kopie z kořene + blok „Cloudflare verze“ na konci)
- `migrations/` schéma D1, `scripts/convert.mjs` převod videos.json a pisnicky.json do `data/seed.sql` (jednorázově, hotovo 2026-10-25)

## Příkazy

Wrangler je nainstalovaný jen v této složce (`npm install`). Token se čte ze souboru, nikdy ho nevypisuj:

```bash
export CLOUDFLARE_API_TOKEN="$(cat ~/.config/joytoplay/cloudflare-token)"
npx wrangler dev        # místní web na http://127.0.0.1:8787; heslo do místního adminu je v .dev.vars (ADMIN_PASSWORD)
npx wrangler deploy     # nasazení na https://joytoplay.commercials1893.workers.dev
npx wrangler d1 export joytoplay --remote --output zaloha.sql   # záloha databáze
```

Místní databáze: `npx wrangler d1 migrations apply joytoplay --local` a `npx wrangler d1 execute joytoplay --local --file data/seed.sql`.

## Nastavení, které ještě chybí

- **Turnstile**: teď je v `wrangler.jsonc` testovací klíč (projde vždy). Ostrý widget pro `kytara.tomasjindra.cz` a zkušební adresu,
  site key do `TURNSTILE_SITE_KEY`, tajný klíč přes `npx wrangler secret put TURNSTILE_SECRET`.
- **Heslo do správy**: tajný klíč Workeru `ADMIN_PASSWORD` (dashboard → Workers & Pages → joytoplay → Settings → Variables and secrets → Add, typ Secret).
  Bez něj `/admin/login` hlásí, že heslo chybí. Přihlášení platí 30 dní, změna hesla odhlásí všechna zařízení. Po 5 špatných pokusech z jedné adresy se přihlášení na 15 minut zablokuje (tabulka `login_attempts`).
  Cloudflare Access se nepoužívá: i tarif Zero Trust Free chce platební kartu a na doméně mimo DNS Cloudflare by admin nešel (rozhodnutí 2026-10-25).
- **Vlastní doména**: Worker Custom Domain potřebuje doménu v DNS Cloudflare, DNS ale zůstává ve Wedosu.
  Proto se pro kytara.tomasjindra.cz použije Cloudflare Pages (CNAME na `<projekt>.pages.dev` jde z cizího DNS).
  Kód je na to připravený: `src/worker.js` používá jen `env.ASSETS` a `env.DB`, což funguje v Pages jako `_worker.js` stejně.
