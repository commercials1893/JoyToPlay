# Návrhy sekce Akordy (2026-10-25)

Tři klikací prototypy, ze kterých si Tomáš vybere. Nejsou součástí webu: leží mimo `cloudflare/`, takže se nenasazují.

- `a-hmatnik.html` Hmatník: prsty se přesunou na hmatník, přes struny se dá přejet a zahrát, popis přechodu mezi akordy a procvičení pod metronomem.
- `b-odemkni.html` Odemkni písničky: vybereš akordy, které znáš, a vidíš, co ze zpěvníku zahraješ a který akord se vyplatí jako další. Akordy u 20 písniček jsou jen orientační ukázka.
- `c-doprovod.html` Hraj s doprovodem: postup čtyř akordů, rytmus a tempo, web hraje a ukazuje další akord.
- `akordy.js` společné tvary akordů, diagramy a zvuk (Web Audio, Karplus-Strong, bez nahrávek). `snimky/` snímky z ověření.

Spuštění: z kořene repa `python3 -m http.server 8791` a otevřít http://localhost:8791/navrhy-akordy/ (styly se berou z `cloudflare/public/styles.css`).
