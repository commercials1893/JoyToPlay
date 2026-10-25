# Joy To Play na Cloudflare (Workers + D1)

Nová verze webu kytara.tomasjindra.cz: stránky vykresluje Worker z databáze D1, statické soubory jsou v `public/`.
Dnešní statický web v kořeni repa (index.html, app.js, videos.json…) běží dál na GitHub Pages, dokud se nepřepne doména.

## Co kde je

- `src/worker.js` směrování: `/` (úvod a videa), `/zpevnik`, `/akordy`, `/ladicka`, `/kanaly`, `/o-mne`, `/doporuc`, `/video/<slug>`, `/pisen/<slug>`, `/sitemap.xml`, `/api/tip`, `/admin`. Staré odkazy `/#zpevnik`, `/#tj` apod. přesměruje app.js.
- `src/pages.js` HTML webu. Texty webu (úvod, O mně, …) jsou tady.
- `src/data.js` dotazy do D1, `src/admin.js` správa, `src/session.js` přihlášení do správy heslem
- `public/` CSS, skript pro prohlížeč, obrázky (styles.css je kopie z kořene + blok „Cloudflare verze“ na konci)
- `public/ladicka.js` stránka /ladicka: mikrofon → odhad tónu (YIN) → struna standardního ladění a odchylka v centech, referenční tóny, volba ladicího A (430–450 Hz). Fotka hlavy LL16 je `public/assets/ll16-hlava.jpg`.
- `public/akordy.js` stránka /akordy: hmatník s prstoklady, zvuk přes Web Audio (bez nahrávek), přechody mezi akordy a pod tím „Hraj s doprovodem“ (postupy, rytmus, tempo). Styly jsou v blocích „Akordy“ na konci styles.css. Prototypy dalších návrhů jsou v `../navrhy-akordy/`.
- `migrations/` schéma D1, `scripts/convert.mjs` převod videos.json a pisnicky.json do `data/seed.sql` (jednorázově, hotovo 2026-10-25)

## Příkazy

Wrangler je nainstalovaný jen v této složce (`npm install`). Token se čte ze souboru, nikdy ho nevypisuj:

```bash
export CLOUDFLARE_API_TOKEN="$(cat ~/.config/joytoplay/cloudflare-token)"
npm run dev             # sestaví a spustí místní web (režim Pages) na http://127.0.0.1:8788; heslo do místního adminu je v .dev.vars
npm run deploy:worker   # nasazení zkušebního Workeru na https://joytoplay.commercials1893.workers.dev
npx wrangler d1 export joytoplay --remote --output zaloha.sql   # záloha databáze
```

Místní databáze: `npx wrangler d1 migrations apply joytoplay --local` a `npx wrangler d1 execute joytoplay --local --file data/seed.sql`.

## Nastavení, které ještě chybí

- **Turnstile**: widget „Joy To Play formulář“ (2026-10-25), site key ve `wrangler.jsonc`, tajný klíč je secret `TURNSTILE_SECRET` (nastavuje Tomáš v dashboardu). Až se přidá adresa Pages, doplnit ji do widgetu.
- **Heslo do správy**: tajný klíč Workeru `ADMIN_PASSWORD` (dashboard → Workers & Pages → joytoplay → Settings → Variables and secrets → Add, typ Secret).
  Bez něj `/admin/login` hlásí, že heslo chybí. Přihlášení platí 30 dní, změna hesla odhlásí všechna zařízení. Po 5 špatných pokusech z jedné adresy se přihlášení na 15 minut zablokuje (tabulka `login_attempts`).
  Cloudflare Access se nepoužívá: i tarif Zero Trust Free chce platební kartu a na doméně mimo DNS Cloudflare by admin nešel (rozhodnutí 2026-10-25).
- **Cloudflare Pages (ostrý web)**: projekt napojený na GitHub repo commercials1893/JoyToPlay, větev `main`, kořenová složka `cloudflare`,
  build `npm run build`, výstup `public`. Vazby (D1, proměnné) bere z `wrangler.jsonc`, secrets `ADMIN_PASSWORD` a `TURNSTILE_SECRET` jsou v nastavení projektu.
  Pages se nasadí samo po každém pushnutí na main. Doména kytara.tomasjindra.cz se napojí CNAME ve Wedosu na `<projekt>.pages.dev`.
