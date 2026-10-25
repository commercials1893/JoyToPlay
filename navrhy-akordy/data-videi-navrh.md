# Návrh: akordy a další údaje u videí (ke schválení)

Stav 2026-10-25. Nic z toho není v D1. Zapíše se až po schválení Tomášem.
Akordy jsou v české notaci (H = B). „ověřeno“ = údaj je přímo ve zdroji; „neověřeno“ = standardní verze písně, video se může lišit.

| # | Video | Akordy | Barré | Kapodastr | Jazyk | Interpret (chybí v D1) | Zdroj, stav |
|---|---|---|---|---|---|---|---|
| 1 | For What It's Worth (Andy Guitar) | Em, A | ne | žádný | en | Buffalo Springfield | neověřeno: popis akordy neuvádí |
| 2 | Když jsem já sloužil (Michaela Medek) | — | — | — | cs | — | **Pozor:** video ylS3SMfsa9g je na YouTube „Lekce kytary – ladění kytary“, podle popisu bez písničky. Potřeba rozhodnout: jiné video, nebo přejmenovat na „Ladění kytary“ |
| 3 | Three Little Birds (Andy Guitar) | A, D, E | ne | žádný | en | Bob Marley | ověřeno: popis videa |
| 4 | Bad Moon Rising (Relax and Learn) | D, A, G | ne | žádný | en | Creedence Clearwater Revival | interpret z popisu; akordy neověřeno |
| 5 | Ring of Fire (Andy Guitar) | G, C, D | ne | žádný | en | (je) | ověřeno: andyguitar.co.uk, název „3 Chord“ |
| 6 | Folsom Prison Blues (Andy Guitar) | E, A7, H7 | ne | žádný | en | (je) | ověřeno: popis videa |
| 7 | 5 písní na 3 akordy (Andy Guitar) | A, D, E, G, C, H7, F, Hm | ano: F (Jackson), Hm (Girl from the North Country) | neuvedeno | en | Johnny Cash | akordy ověřeno: andyguitar.co.uk; zda je barré ve videu zjednodušené, neověřeno |
| 8 | Základní vzory pravé ruky (Relax and Learn) | — (cvičení, ne písnička) | ne | žádný | en | — | popis videa |
| 9 | Lásko! (Michaela Medek) | Am, Dm, E7, C, G7, G | ne | žádný | cs | Karel Kryl | ověřeno: michaelamedek.com, verze A moll (web nabízí i E moll) |
| 10 | Síla starejch vín (Michaela Medek) | G, D, Em, C | ne | žádný | cs | Škwor | ověřeno: michaelamedek.com, akordy u lekce C, D, Emi, G |
| 11 | November Rain (Andy Guitar) | C, Dm, F, G, Am, Em | pravděpodobně F | žádný | en | Guns N' Roses | neověřeno; popis: originál je o půl tónu níž |
| 12 | Sovy v mazutu (Kytary.cz) | 3 akordy (které, neověřeno) | ne | neuvedeno | cs | Tři sestry | popis: „tříakordovky“, interpret z popisu |
| 13 | Knockin' on Heaven's Door (Kytary.cz) | G, D, Am, C | ne | žádný | cs | Bob Dylan | interpret z popisu; akordy neověřeno |
| 14 | Jasná zpráva (Kytary.cz) | neuvedeno | — | — | cs | Olympic | interpret z popisu; akordy doplnit z videa |
| 15 | Slzy tvý mámy (Kytary.cz) | neuvedeno | — | — | cs | Olympic | interpret z popisu; akordy doplnit z videa |
| 16 | Muchomůrky bílé (Kytary.cz) | mj. F6 | neověřeno | — | cs | (je, Garáž) | obsah videa „Vychytávka F6“; ostatní akordy doplnit z videa |
| 17 | Friday I'm in Love (Stellar Guitarist) | D, G, A, Hm, Em | Hm, pokud ho video nezjednoduší | neuvedeno | en | The Cure | neověřeno: popis jen „beginner friendly chords“ |
| 18 | Redemption Song (Marty Music) | G, Em, C, Am, D | ne | žádný | en | Bob Marley | neověřeno |
| 19 | Take Me Home, Country Roads (Relax and Learn) | G, D, Em, C | ne | neověřeno (originál je v A) | en | (je) | neověřeno |
| 20 | 4 písně na akustiku (Relax and Learn) | více písní | — | — | en | různí (Pink Floyd, John Lennon, Steve Miller Band, Chris Stapleton) | písně z obsahu videa; akordy neověřeno |
| 21 | Jolene (Relax and Learn) | Am, C, G | ne | neověřeno | en | (je) | popis: „just 3 chords“; které tři, neověřeno |

## Kategorie pro videa bez kategorie

V D1 je bez kategorie 5 videí (ne 10, jak uvádí recenze): 15, 16, 17, 18, 20. Stávající kategorie: Začni dnes, 3 akordy, Fingerstyle, Johnny Cash, Karel Kryl.

- Nová kategorie **Česká klasika**: 15 Slzy tvý mámy, 16 Muchomůrky bílé (a volitelně 9, 10, 12, 13, 14).
- Nová kategorie **Světové klasiky**: 17 Friday I'm in Love, 18 Redemption Song, 20 4 písně na akustiku (a volitelně 19, 21).
- Alternativa bez nových kategorií: 18 a 21 do „3 akordy“ jen pokud se potvrdí akordy.

## Co bude potřeba v D1 (po schválení)

Nové sloupce ve `videos`: `chords` (text, např. „G C D“), `barre` (0/1), `capo` (číslo pražce nebo NULL), `lang` („cs“/„en“), doplnit `artist`. Pole v adminu. Migrace a zápis jen se souhlasem.
