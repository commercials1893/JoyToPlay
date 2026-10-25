// HTML veřejného webu. Texty webu jsou tady v kódu, data (videa, písničky, sekce, kanály) jdou z D1.
import { esc } from "./util.js";

const ASSET_V = "38";
const LEVELS = ["", "Úplný začátek", "Lehké", "Střední", "Těžší", "Náročné"];
const TONES = ["var(--a)", "var(--b)", "var(--c)"];
const DEFAULT_TITLE = "Joy To Play — Nauč se málo. Zahraj hodně.";
const DEFAULT_DESC = "Kytara jen tak pro radost. Nejsem kytarová škola, jen sdílím videa, podle kterých se dá zahrát něco, co je snadné a hezky to zní.";

const lvl = (n) => Array.from({ length: 5 }, (_, i) => `<i${i < n ? ' class="on"' : ""}></i>`).join("");
const ytUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

// Data pro skript v prohlížeči; "<" se escapuje, aby text nemohl ukončit <script>.
const json = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

function nav(home, path) {
  const links = [
    [home ? "#videa" : "/#videa", "Videa"], ["/zpevnik", "Zpěvník"], ["/akordy", "Akordy"], ["/ladicka", "Ladička"],
    [home ? "#sekce" : "/#sekce", "Sekce"], ["/kanaly", "Kanály"], ["/o-mne", "O mně"], ["/doporuc", "Doporuč"],
  ];
  return `
  <nav class="topnav" aria-label="Navigace">
    <div class="in">
      <b>
        <a class="logo" href="${home ? "#top" : "/"}">
          <svg class="logo-pick" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 4 C81 4 95 21 91 42 C87 65 67 89 50 96 C33 89 13 65 9 42 C5 21 19 4 50 4 Z"/>
            <text transform="rotate(-7 50 46)" text-anchor="middle"><tspan x="50" y="40">Karel</tspan><tspan x="50" y="64">Kryl</tspan></text>
          </svg>
          <span>Joy To Play</span>
        </a>
      </b>
      <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16"/><path d="M4 16h16"/></svg>
      </button>
      <div class="nav-links" id="nav-links">
        ${links.map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
      </div>
    </div>
  </nav>`;
}

function layout({ title = DEFAULT_TITLE, description = DEFAULT_DESC, path = "/", site, body, home = false, extraHead = "" }) {
  const url = `${site}${path}`;
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="cs_CZ">
  <meta property="og:site_name" content="Joy To Play">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  ${extraHead || `<meta property="og:image" content="${site}/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">`}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Caveat:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v=${ASSET_V}">
</head>
<body>${nav(home, path)}
${body}
  <script data-goatcounter="https://doc1893.goatcounter.com/count"
          async src="https://gc.zgo.at/count.js"></script>
  <script src="/app.js?v=${ASSET_V}"></script>
</body>
</html>`;
}

const footer = `<footer>Joy To Play · Nauč se málo. Zahraj hodně. · Videa vybírám ručně. TJ</footer>`;

function thumb(v, eager = false) {
  return `<a class="thumb" href="${ytUrl(v.youtube_id)}" data-play="${esc(v.youtube_id)}" aria-label="Přehrát video ${esc(v.song)} tady na stránce">
        <img src="https://i.ytimg.com/vi/${esc(v.youtube_id)}/hqdefault.jpg" alt=""${eager ? "" : ' loading="lazy"'}>
        <span class="play">▶︎ Přehrát</span>
      </a>`;
}

// Odhad času u videa počítá se základními otevřenými akordy; věta stojí u katalogu i na detailu.
const TIME_NOTE = `Čas u videa platí, pokud už zvládáš základní otevřené akordy G, C, D, Em a Am. Vyzkoušet si je můžeš v <a href="/akordy">Akordech</a>.`;

// Akordy z videa (po schválení dat 2026-10-25); každý vede na hmatník v Akordech. Barré a kapodastr jen když je to potřeba.
function chordLine(v) {
  if (!v.chords) return "";
  const list = v.chords.split(/\s+/).filter(Boolean);
  return `<div class="chordline"><span>Akordy</span>${list.map((c) => `<a href="/akordy?akord=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}${v.barre ? `<i>barré</i>` : ""}${v.capo ? `<i>kapodastr ${v.capo}. pražec</i>` : ""}</div>`;
}

function facts(v) {
  return `${chordLine(v)}<div class="facts">
          <span><span class="lvl" aria-hidden="true">${lvl(v.difficulty)}</span>Obtížnost <b>${v.difficulty}/5 · ${LEVELS[v.difficulty]}</b></span>
          <span>Čas <b>${esc(v.time)}</b></span>
        </div>`;
}

// Dvě akce na kartě: návod (detail videa na webu) a video na YouTube v nové kartě.
function actions(v) {
  return `<div class="card-actions">
          <a class="btn btn-primary" href="/video/${esc(v.slug)}">Návod</a>
          <a class="btn btn-quiet" href="${ytUrl(v.youtube_id)}" target="_blank" rel="noreferrer">Přehrát na YouTube</a>
        </div>`;
}

// Karta videa jako na úvodní stránce (tam ji kreslí app.js), tady pro „Podobná videa“.
function card(v) {
  return `
    <article class="video-card">${thumb(v)}
      <div class="card-body">
        <h3><a href="/video/${esc(v.slug)}">${esc(v.song)}</a></h3>
        <p class="by">${esc(v.channel)}</p>
        ${facts(v)}
        <p class="comment"><strong>${esc(v.title)}</strong><span>${esc(v.comment)}</span></p>
        ${actions(v)}
      </div>
    </article>`;
}

export function homePage(data, env) {
  const tabs = [
    ["latest", "Nejnovější"], ["all", "Vše"],
    ...data.categories.map((c) => [c.key, c.label]),
    ["top", "Top objevy"],
  ];
  const clientData = {
    videos: data.videos.map((v) => ({
      id: v.youtube_id, slug: v.slug, title: v.title, song: v.song, artist: v.artist, channel: v.channel,
      difficulty: v.difficulty, time: v.time, categories: v.categories, top: !!v.top, comment: v.comment, added: v.added,
      chords: v.chords || "", barre: !!v.barre, capo: v.capo || 0,
    })),
  };
  const body = `
  <div class="wrap" id="top">
    <header class="hero-banner">
      <div class="hero-panel">
        <div class="hero-text">
          <div class="eyebrow">Kytara jen tak pro radost</div>
          <h1>Joy To Play</h1>
          <p class="motto">Nauč se málo. Zahraj hodně.</p>
          <p class="intro">Nejsem kytarová škola. Jen sdílím videa, podle kterých se dá zahrát něco, co je celkem snadné a hezky to zní. Pro lidi, kteří mají práci, rodinu a na kytaru pár volných večerů.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#katalog" data-jump="start">Začni dnes</a>
            <a class="btn btn-quiet" href="/o-mne">O mně</a>
          </div>
        </div>
        <img class="hero-guitar" src="/assets/kytara-ll16.jpg" alt="Yamaha LL16, akustická kytara Joy To Play">
      </div>
    </header>

    <section id="proc">
      <div class="sec-head">
        <h2>Nemusíš hledat dvě hodiny na YouTube</h2>
        <p class="lead">Už jsem to prošel za tebe. Nechal jsem jen to, co zní neuvěřitelně dobře a přitom je to snadné.</p>
      </div>
      <div class="tracks">
        <article class="track" style="--tc:var(--a)">
          <h3>Jde to zahrát</h3>
          <p>Písničky, které zvládneš po práci. Žádné závody v rychlosti.</p>
        </article>
        <article class="track" style="--tc:var(--b)">
          <h3>Málo, ale dobře</h3>
          <p>Pár videí, kde to někdo vysvětlí tak, že to pochopíš.</p>
        </article>
        <article class="track" style="--tc:var(--c)">
          <h3>Pár slov ode mě</h3>
          <p>U každého videa napíšu, proč mě baví a co od něj čekat.</p>
        </article>
      </div>
    </section>

    <section id="katalog">
      <div class="sec-head">
        <h2 id="videa">Doporučená videa</h2>
        <p class="lead">Žádné stovky videí. Jen ta, ke kterým se sám vracím.</p>
      </div>
      <div class="controls">
        <div class="tabs" role="tablist">
          ${tabs.map(([key, label], i) => `<button class="tab" role="tab" aria-selected="${i === 0}" data-filter="${esc(key)}" type="button">${esc(label)}</button>`).join("\n          ")}
        </div>
        <input class="song-search" id="video-search" type="search" placeholder="Hledat písničku nebo interpreta" aria-label="Hledat ve videích">
        <p class="time-note">${TIME_NOTE}</p>
      </div>
      <div id="videos" class="videos"></div>
      <noscript><ul>${data.videos.map((v) => `<li><a href="/video/${esc(v.slug)}">${esc(v.song)}</a></li>`).join("")}</ul></noscript>
      <button class="btn btn-quiet" id="videos-more" type="button" hidden></button>
    </section>

    <section id="sekce">
      <div class="sec-head">
        <h2>Kam se vydat</h2>
        <p class="lead">Vyber si podle nálady. Nikam se nespěchá.</p>
      </div>
      <div class="tracks">
        ${data.sections.map((s, i) => `<a class="track" style="--tc:${TONES[i % 3]}" href="#katalog" data-jump="${esc(s.filter)}">
          <h3>${esc(s.title)} <i>${String(i + 1).padStart(2, "0")}</i></h3>
          <p>${esc(s.text)}</p>
        </a>`).join("\n        ")}
      </div>
    </section>

    ${footer}
  </div>
  <script type="application/json" id="site-data">${json(clientData)}</script>`;
  return layout({ site: env.SITE_URL, body, home: true });
}

// Samostatné stránky (zpěvník, akordy, kanály, o mně, doporuč). Úvod zůstává jen pro videa.
function page(env, { path, title, description, body, data }) {
  return layout({
    site: env.SITE_URL, path, title: `${title} · Joy To Play`, description,
    body: `
  <div class="wrap" id="top">
${body}
    ${footer}
  </div>${data ? `
  <script type="application/json" id="site-data">${json(data)}</script>` : ""}`,
  });
}

export function songbookPage(data, env) {
  return page(env, {
    path: "/zpevnik", title: "Zpěvník",
    description: "Písničky, které TJ hraje nejradši, s odkazy na akordy. Pro kytaru jen tak pro radost.",
    data: { songs: data.songs.map((s) => ({ slug: s.slug, artist: s.artist, song: s.song, url: s.chords_url, note: s.note, video: s.video_slug })) },
    body: `
    <section id="zpevnik" class="page" hidden>
      <div class="sec-head">
        <h1>Můj zpěvník</h1>
        <p class="lead">Písničky, které hraju nejradši. Akordy jsou na Ultimate Guitar, stačí kliknout.</p>
      </div>
      <div class="controls">
        <input class="song-search" id="song-search" type="search" placeholder="Hledat písničku nebo interpreta" aria-label="Hledat ve zpěvníku">
        <div class="artist-chips" id="song-chips"></div>
      </div>
      <div class="songs" id="songs"></div>
    </section>`,
  });
}

export function chordsPage(env) {
  return page(env, {
    path: "/akordy", title: "Akordy na kytaru",
    description: "Interaktivní hmatník: kam dát prsty, jak akord zní a jak přejít z akordu na akord. A doprovod, se kterým si zahraješ.",
    body: `
    <section id="akordy" class="page">
      <div class="sec-head">
        <div class="eyebrow">Akordy</div>
        <h1>Polož prsty. Brnkni.</h1>
        <p class="lead">Klikni na akord a uvidíš, kam dát prsty. Pak přejeď přes struny a uslyšíš, jak má znít.</p>
      </div>
      <div id="akordy-app">
        <article class="tile aa-stage">
          <div class="aa-head">
            <div>
              <div class="aa-name" id="aa-name">G</div>
              <div class="aa-full" id="aa-full"></div>
            </div>
            <div class="aa-actions">
              <button class="btn btn-primary" id="aa-strum" type="button">▶︎ Brnkni</button>
              <button class="btn btn-quiet" id="aa-arp" type="button">Po strunách</button>
            </div>
          </div>
          <div class="aa-board" id="aa-board" role="img" aria-label="Hmatník"></div>
          <p class="aa-hint">Přejeď prstem nebo myší přes struny. Každá zahraje svůj tón.</p>
          <div class="aa-move" id="aa-move" hidden></div>
        </article>
        <div class="aa-picker" id="aa-picker"></div>
      </div>
      <div class="cc" id="doprovod">
        <div class="sec-head">
          <div class="eyebrow">Hraj s doprovodem</div>
          <h3 class="cc-title">Čtyři akordy. Spousta písniček.</h3>
          <p class="lead">Vyber si postup, pusť doprovod a hraj s ním. Ukáže ti, co přijde, ještě než to přijde.</p>
        </div>
        <div class="cc-progs" id="cc-progs"></div>
        <article class="tile cc-player">
          <div class="cc-now">
            <div class="cc-beats" id="cc-beats" aria-hidden="true"></div>
            <div class="cc-cur" id="cc-cur"><div class="name" id="cc-name"></div><div id="cc-box"></div></div>
            <div class="cc-next" id="cc-next"><small>Další</small><div class="name" id="cc-nname"></div><div id="cc-nbox"></div></div>
          </div>
          <div class="cc-time" id="cc-time"><div class="cc-head" id="cc-head"></div></div>
          <div class="cc-strokes" id="cc-strokes" aria-hidden="true"></div>
          <div class="cc-ctrl">
            <button class="cc-play" id="cc-play" type="button" aria-label="Hrát">▶︎</button>
            <div class="cc-tempo"><label for="cc-bpm">Tempo <b id="cc-bpmv">72 BPM</b></label><input id="cc-bpm" type="range" min="50" max="140" step="2" value="72"></div>
            <div class="tabs cc-rh" id="cc-rh" aria-label="Rytmus"></div>
            <label class="cc-opt"><input type="checkbox" id="cc-up"> Každé kolo o kousek rychleji</label>
          </div>
          <p class="cc-stat" id="cc-stat" aria-live="polite">Zmáčkni ▶︎. Nejdřív odpočítám čtyři doby.</p>
          <div class="cc-count" id="cc-count" aria-hidden="true"></div>
        </article>
      </div>
      <noscript><p class="lead" style="margin-inline:auto;text-align:center">Hmatník potřebuje zapnutý JavaScript.</p></noscript>
      <script src="/akordy.js?v=${ASSET_V}" defer></script>
    </section>`,
  });
}

export function channelsPage(data, env) {
  return page(env, {
    path: "/kanaly", title: "Doporučené kanály",
    description: "Kytarové kanály na YouTube, ke kterým se vyplatí vracet.",
    body: `
    <section id="kanaly" class="page">
      <div class="sec-head">
        <h1>Doporučené kanály</h1>
        <p class="lead">Když už jsi na YouTube, k těmhle lidem se vyplatí vracet.</p>
      </div>
      <div class="channels">
        ${data.channels.map((c) => `<a class="channel-card" href="${esc(c.url)}" target="_blank" rel="noreferrer">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.text)}</p>
        </a>`).join("\n        ")}
      </div>
      <p class="thanks">Díky všem, kdo ta videa točí. Je za nimi spousta práce a moc si jí vážím. Když ti některé pomůže, dej autorovi lajk nebo odběr.</p>
    </section>`,
  });
}

export function aboutPage(env) {
  return page(env, {
    path: "/o-mne", title: "O mně",
    description: "Kdo je TJ a proč Joy To Play vzniklo. Kytara jen tak pro radost.",
    body: `
    <section id="tj" class="page">
      <div class="about-grid">
        <article class="tile">
          <div class="eyebrow">O mně</div>
          <h1>Nejsem učitel ani virtuóz</h1>
          <p>Na kytaru hraju asi 30 let. S dlouhými pauzami, ale vždycky jsem se k ní vrátil.</p>
          <p>Mám práci a běžný život jako ty, takže tu najdeš jen to, co se dá zvládnout a udělá radost.</p>
          <p>Hraju na Yamahu LL16 a Epiphone Dove Studio.</p>
        </article>
        <article class="tile">
          <div class="eyebrow">Můj přístup</div>
          <div class="tone">
            <div>
              <h3>Tady neuslyšíš</h3>
              <ul class="no">
                <li>Musíš cvičit.</li>
                <li>Tohle hraješ špatně.</li>
                <li>Bez hudební teorie to nejde.</li>
              </ul>
            </div>
            <div>
              <h3>Tady uslyšíš</h3>
              <ul class="yes">
                <li>Zkus to.</li>
                <li>Užij si to.</li>
                <li>Není kam spěchat.</li>
                <li>Hraj pro radost.</li>
              </ul>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="quote">
      <div class="sec-head">
        <h2>Kytara není závod. Je to radost.</h2>
      </div>
    </section>

    <section>
      <div class="decide">
        <div class="eyebrow">Proč to dělám</div>
        <h2>Nejde mi o návštěvnost.</h2>
        <p class="lead" style="color:#A1A1A6">Stačí, když si po práci vezmeš kytaru, najdeš tu jednu věc a udělá ti radost.</p>
      </div>
    </section>`,
  });
}

export function recommendPage(env) {
  return page(env, {
    path: "/doporuc", title: "Doporuč video",
    description: "Pošli TJ tip na video, podle kterého se dá zahrát něco hezkého.",
    data: { turnstile: env.TURNSTILE_SITE_KEY || "" },
    body: `
    <section id="doporuc" class="page">
      <div class="sec-head">
        <div class="eyebrow">Máš tip?</div>
        <h1>Doporuč video</h1>
        <p class="lead">Našel jsi video, podle kterého to jde a hezky to zní? Pošli mi ho. Podívám se a ta nejlepší sem přidám.</p>
      </div>
      <div class="tile form-tile">
        <form class="form" id="recommend-form">
          <input name="url" type="url" required maxlength="500" placeholder="Odkaz na video na YouTube" aria-label="Odkaz na video">
          <input name="why" type="text" required maxlength="1000" placeholder="Proč to stojí za čas?">
          <input name="_gotcha" type="text" tabindex="-1" autocomplete="off" hidden>
          <div class="turnstile" id="turnstile-box"></div>
          <button class="btn btn-primary" type="submit">Poslat TJ</button>
        </form>
        <p id="recommend-note" hidden></p>
      </div>
    </section>`,
  });
}

// Budík ladičky: oblouk ±50 centů (±60°), čárky po 10 centech, zelený pruh ±5 centů.
function gauge() {
  const cx = 150, cy = 160, r = 130, pt = (deg, rr) => [cx + rr * Math.sin((deg * Math.PI) / 180), cy - rr * Math.cos((deg * Math.PI) / 180)].map((v) => v.toFixed(2));
  const arc = (from, to, rr) => { const [x1, y1] = pt(from, rr), [x2, y2] = pt(to, rr); return `M${x1} ${y1} A${rr} ${rr} 0 0 1 ${x2} ${y2}`; };
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const deg = (i - 5) * 12, [x1, y1] = pt(deg, r - (i % 5 ? 10 : 18)), [x2, y2] = pt(deg, r);
    return `<line class="lt-tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join("");
  return `<svg class="lt-gauge" viewBox="0 0 300 172" aria-hidden="true">
          <path class="lt-arc" d="${arc(-60, 60, r)}"/>
          <path class="lt-zone" d="${arc(-6, 6, r)}"/>
          ${ticks}
          <text class="lt-lbl" x="${pt(-60, r + 2)[0] - 6}" y="${+pt(-60, r)[1] + 22}">−50</text>
          <text class="lt-lbl" x="${+pt(60, r + 2)[0] + 6}" y="${+pt(60, r)[1] + 22}">+50</text>
          <g id="lt-needle" class="lt-needle"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r + 6}"/><circle cx="${cx}" cy="${cy}" r="7"/></g>
        </svg>`;
}

export function tunerPage(env) {
  return page(env, {
    path: "/ladicka", title: "Ladička na kytaru",
    description: "Online ladička na akustickou kytaru: povol mikrofon, brnkni a ručička ukáže, jestli přitáhnout, nebo povolit. Standardní ladění E A D G H e.",
    body: `
    <section id="ladicka" class="page">
      <div class="sec-head">
        <div class="eyebrow">Ladička</div>
        <h1>Nalaď se. Pak hraj.</h1>
        <p class="lead">Zapni ladičku, povol mikrofon a brnkni na strunu. Standardní ladění E A D G H e na akustiku.</p>
      </div>
      <div id="ladicka-app" class="lt">
        <article class="tile lt-stage">
          <div class="lt-read">
            ${gauge()}
            <div class="lt-big"><b id="lt-note">–</b><sub id="lt-oct"></sub></div>
            <p class="lt-say" id="lt-say" aria-live="polite">Ladička čeká. Zapni ji a povol mikrofon.</p>
            <p class="lt-hz"><span id="lt-cents"></span> <span id="lt-hz"></span></p>
            <div class="lt-ctrl">
              <button class="btn btn-primary" id="lt-mic" type="button">Zapnout ladičku</button>
              <button class="aa-chip" id="lt-auto" type="button" aria-pressed="true">Automaticky</button>
            </div>
          </div>
          <div class="lt-photo">
            <div class="lt-head">
              <img src="/assets/ll16-hlava.jpg?v=${ASSET_V}" alt="Hlava mojí kytary Yamaha LL16" width="562" height="1000">
              <div id="lt-pegs"></div>
            </div>
            <p class="lt-cap">Moje Yamaha LL16</p>
          </div>
        </article>
        <div class="lt-foot">
          <div class="lt-a4"><span>Ladicí A</span><button id="lt-down" type="button" aria-label="Snížit o 1 Hz">−</button><b id="lt-a4" class="num">440 Hz</b><button id="lt-up" type="button" aria-label="Zvýšit o 1 Hz">+</button></div>
          <p>Klik na kolíček zahraje tón struny. Se zapnutou ladičkou ji tím zamkneš na jednu strunu, „Automaticky“ to vrátí. Zvuk z mikrofonu zůstává v tvém prohlížeči a nikam se neposílá.</p>
        </div>
      </div>
      <noscript><p class="lead" style="margin-inline:auto;text-align:center">Ladička potřebuje zapnutý JavaScript.</p></noscript>
      <script src="/ladicka.js?v=${ASSET_V}" defer></script>
    </section>`,
  });
}

export function videoPage({ video: v, categories, songs, related }, env) {
  const site = env.SITE_URL;
  const body = `
  <div class="wrap" id="top">
    <section class="detail">
      <div class="sec-head">
        <div class="eyebrow">${esc(v.channel)}</div>
        <h1 class="detail-title">${esc(v.song)}</h1>
        ${v.artist ? `<p class="lead">${esc(v.artist)}</p>` : ""}
      </div>
      <article class="video-card detail-card">${thumb(v, true)}
        <div class="card-body">
          ${facts(v)}
          <p class="time-note is-left">${TIME_NOTE}</p>
          <p class="comment"><strong>${esc(v.title)}</strong><span>${esc(v.comment)}</span></p>
          <div class="detail-actions">
            ${songs.map((s) => `<a class="btn btn-primary" href="${esc(s.chords_url)}" target="_blank" rel="noreferrer">Akordy: ${esc(s.song)}</a>`).join("")}
            <a class="btn btn-quiet" href="${ytUrl(v.youtube_id)}" target="_blank" rel="noreferrer">Přehrát na YouTube</a>
          </div>
          ${categories.length ? `<div class="detail-tags">${categories.map((c) => `<a class="chip" href="/?f=${esc(c.key)}#videa">${esc(c.label)}</a>`).join("")}</div>` : ""}
        </div>
      </article>
    </section>
    ${related.length ? `<section>
      <div class="sec-head"><h2>Další videa</h2></div>
      <div class="videos">${related.map(card).join("")}</div>
      <a class="btn btn-quiet detail-back" href="/#videa">Všechna videa</a>
    </section>` : ""}
    ${footer}
  </div>`;
  return layout({
    site, body, path: `/video/${v.slug}`,
    title: `${v.song} na kytaru · Joy To Play`,
    description: `${v.title}. ${v.comment}`.slice(0, 300),
    extraHead: `<meta property="og:image" content="https://i.ytimg.com/vi/${esc(v.youtube_id)}/hqdefault.jpg">`,
  });
}

export function songPage({ song: s, video: v, others }, env) {
  const body = `
  <div class="wrap" id="top">
    <section class="detail">
      <div class="sec-head">
        <div class="eyebrow">Zpěvník</div>
        <h1 class="detail-title">${esc(s.song)}</h1>
        <p class="lead">${esc(s.artist)}${s.note ? ` · ${esc(s.note)}` : ""}</p>
      </div>
      <div class="detail-actions is-center">
        <a class="btn btn-primary" href="${esc(s.chords_url)}" target="_blank" rel="noreferrer">Akordy na Ultimate Guitar</a>
        <a class="btn btn-quiet" href="/zpevnik">Celý zpěvník</a>
      </div>
      ${v ? `<div class="videos is-single">${card(v)}</div>` : ""}
    </section>
    ${others.length ? `<section>
      <div class="sec-head"><h2>Další od ${esc(s.artist)}</h2></div>
      <div class="songs is-single"><div class="song-group"><ul>${others.map((o) => `<li><a href="/pisen/${esc(o.slug)}">${esc(o.song)}</a></li>`).join("")}</ul></div></div>
    </section>` : ""}
    ${footer}
  </div>`;
  return layout({
    site: env.SITE_URL, body, path: `/pisen/${s.slug}`,
    title: `${s.song} (${s.artist}) akordy · Joy To Play`,
    description: `Akordy k písničce ${s.song} od ${s.artist}${v ? " a video, podle kterého se dá naučit" : ""}. Ze zpěvníku Joy To Play.`,
  });
}

export function notFoundPage(env) {
  const body = `
  <div class="wrap" id="top">
    <section class="detail">
      <div class="sec-head">
        <div class="eyebrow">404</div>
        <h1 class="detail-title">Tohle tu není</h1>
        <p class="lead">Stránka možná zmizela, nebo se v odkazu něco přehodilo.</p>
      </div>
      <div class="detail-actions is-center"><a class="btn btn-primary" href="/">Na úvod</a></div>
    </section>
    ${footer}
  </div>`;
  return layout({ site: env.SITE_URL, body, title: "Stránka nenalezena · Joy To Play" });
}

export function sitemap({ videos, songs }, env) {
  const site = env.SITE_URL;
  const url = (path, lastmod) => `  <url>\n    <loc>${site}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}\n  </url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[url("/"), ...["/zpevnik", "/akordy", "/ladicka", "/kanaly", "/o-mne", "/doporuc"].map((p) => url(p)), ...videos.map((v) => url(`/video/${v.slug}`, v.added)), ...songs.map((s) => url(`/pisen/${s.slug}`))].join("\n")}
</urlset>
`;
}
