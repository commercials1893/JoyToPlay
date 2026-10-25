// Data webu vkládá Worker přímo do stránky (videa, písničky, klíč Turnstile).
const SITE = JSON.parse(document.getElementById("site-data")?.textContent || "null");

// Kolik interpretů ve zpěvníku je vidět bez rozbalení.
const TOP_ARTISTS = 6;

const LEVELS = ["", "Úplný začátek", "Lehké", "Střední", "Těžší", "Náročné"];

const lvl = (n) => Array.from({ length: 5 }, (_, i) => `<i${i < n ? ' class="on"' : ""}></i>`).join("");

const esc = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function thumbHTML(video) {
  return `
      <a class="thumb" href="https://www.youtube.com/watch?v=${esc(video.id)}" data-play="${esc(video.id)}" aria-label="Přehrát ${esc(video.song)}">
        <img src="https://i.ytimg.com/vi/${esc(video.id)}/hqdefault.jpg" alt="" loading="lazy">
        <span class="play">Přehrát na YouTube</span>
      </a>`;
}

function cardHTML(video) {
  return `
    <article class="video-card" data-cats="${esc(video.categories.join(" "))}" data-top="${video.top}">${thumbHTML(video)}
      <div class="card-body">
        <h3><a href="/video/${esc(video.slug)}">${esc(video.song)}</a></h3>
        <p class="by">${esc(video.channel)}</p>
        <div class="facts">
          <span><span class="lvl" aria-hidden="true">${lvl(video.difficulty)}</span>Obtížnost <b>${video.difficulty}/5 · ${LEVELS[video.difficulty]}</b></span>
          <span>Čas <b>${esc(video.time)}</b></span>
        </div>
        <p class="comment"><strong>${esc(video.title)}</strong><span>${esc(video.comment)}</span></p>
      </div>
    </article>
  `;
}

// Nejnovější nahoře: podle data přidání, starší videa bez data podle pořadí v seznamu.
function newestFirst(videos) {
  return videos
    .map((video, index) => ({ video, index }))
    .sort((a, b) => (b.video.added || "").localeCompare(a.video.added || "") || b.index - a.index)
    .map(({ video }) => video);
}

// Rychlý výběr písničky v právě vybrané sekci: písmena a po kliknutí na některé štítky písniček od něj.
// Klik na písničku ukáže jen její video, druhý klik vrátí celou sekci. Krátké sekce se obejdou bez písmen.
const LETTERS_FROM = 10;

function renderPicks(videos, filter, shown, picked, letter) {
  const lettersRoot = document.getElementById("song-letters");
  const root = document.getElementById("song-picks");
  const initial = (video) => plain(video.song)[0].toUpperCase();
  const sorted = [...shown].sort((a, b) => a.song.localeCompare(b.song, "cs"));
  const useLetters = sorted.length > LETTERS_FROM;
  const letters = [...new Set(sorted.map(initial))];
  const current = letters.includes(letter) ? letter : null;

  lettersRoot.hidden = !useLetters;
  lettersRoot.replaceChildren(
    ...letters.map((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = value === current ? "is-on" : "";
      button.textContent = value;
      button.addEventListener("click", () => render(videos, filter, null, value === current ? null : value));
      return button;
    }),
  );
  root.hidden = sorted.length < 2 || (useLetters && !current);
  root.replaceChildren(
    ...sorted
      .filter((video) => !useLetters || initial(video) === current)
      .map((video) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.setAttribute("aria-pressed", String(video.id === picked));
        chip.textContent = video.song;
        chip.addEventListener("click", () => render(videos, filter, video.id === picked ? null : video.id, current));
        return chip;
      }),
  );
}

// Videa se ukazují po deseti, další přidá tlačítko pod nimi. Změna sekce začíná zase od začátku.
const PAGE_SIZE = 10;
let shown = { filter: null, limit: PAGE_SIZE, last: null };

function render(videos, filter, picked = null, letter = null) {
  const root = document.getElementById("videos");
  const more = document.getElementById("videos-more");
  if (filter !== shown.filter) shown = { filter, limit: PAGE_SIZE };
  shown.last = [videos, filter, picked, letter];
  const source = filter === "latest" ? newestFirst(videos) : videos;
  const filtered = source.filter((video) => {
    if (filter === "all" || filter === "latest") return true;
    if (filter === "top") return video.top;
    return video.categories.includes(filter);
  });
  renderPicks(videos, filter, filtered, picked, letter);
  const cards = picked ? filtered.filter((video) => video.id === picked) : filtered.slice(0, shown.limit);
  const rest = picked ? 0 : filtered.length - cards.length;
  more.hidden = rest <= 0;
  more.textContent = `Zobrazit další (${rest})`;
  root.innerHTML = cards.length
    ? cards.map(cardHTML).join("")
    : `<p class="empty">V téhle sekci zatím nic není. TJ sem přidá jen to, co opravdu stojí za čas.</p>`;
}

function bindFilters(videos) {
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((el) => el.setAttribute("aria-selected", String(el === btn)));
      const filter = btn.dataset.filter;
      render(videos, filter);
      history.replaceState(null, "", `/#videa`);
      document.querySelectorAll(".topnav a").forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === "#videa");
      });
    });
  });

  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", (event) => {
      const filter = el.dataset.jump;
      const btn = document.querySelector(`[data-filter="${filter}"]`);
      if (btn) {
        event.preventDefault();
        btn.click();
        document.getElementById("katalog").scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

// Přehrávač: klik na náhled ho nahradí vloženým videem (úvod i detail videa).
function bindPlayer() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-play]");
    if (!link || link.querySelector("iframe")) return;
    event.preventDefault();
    const id = encodeURIComponent(link.dataset.play);
    link.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube video"></iframe>`;
  });
}

// Turnstile se načte, až když je formulář blízko obrazovky, ať úvod zbytečně nezdržuje.
// Sleduje se celý formulář: prázdný box widgetu je skrytý a sám by se na obrazovce nikdy „neobjevil“.
function loadTurnstile(box, sitekey) {
  let widget = null;
  const ready = new Promise((resolve) => {
    window.onTurnstileLoad = () => {
      widget = window.turnstile.render(box, { sitekey, language: "cs", appearance: "interaction-only" });
      resolve();
    };
  });
  const inject = () => {
    if (document.getElementById("turnstile-js")) return;
    const script = document.createElement("script");
    script.id = "turnstile-js";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    script.async = true;
    document.head.append(script);
  };
  new IntersectionObserver((entries, observer) => {
    if (entries.some((e) => e.isIntersecting)) {
      inject();
      observer.disconnect();
    }
  }, { rootMargin: "600px" }).observe(box.closest("form"));
  return {
    // Ověření běží na pozadí; na token počkáme nejvýš 15 sekund.
    token: async () => {
      inject();
      await ready;
      for (let i = 0; i < 60; i++) {
        const token = window.turnstile.getResponse(widget);
        if (token) return token;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return "";
    },
    reset: () => widget !== null && window.turnstile.reset(widget),
  };
}

function bindForm() {
  const form = document.getElementById("recommend-form");
  const note = document.getElementById("recommend-note");
  const captcha = loadTurnstile(document.getElementById("turnstile-box"), SITE.turnstile);
  const say = (text, ok) => {
    note.textContent = text;
    note.style.color = ok ? "var(--ok)" : "var(--risk)";
    note.hidden = false;
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector("button");
    button.disabled = true;
    // Token Turnstile platí jen na jedno odeslání, po pokusu se ověření spustí znovu.
    let sent = false;
    try {
      const token = await captcha.token();
      if (!token) {
        say("Ještě ověřuju, že nejsi robot. Když se nad tlačítkem objeví políčko, zaškrtni ho a pošli tip znovu.", false);
        return;
      }
      sent = true;
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url, why: data.why, _gotcha: data._gotcha, token }),
      });
      if (!res.ok) throw new Error("send failed");
      form.reset();
      say("Díky. Tip je u TJ, podívá se na něj.", true);
    } catch {
      say("Tip se nepodařilo odeslat. Zkus to prosím za chvíli znovu.", false);
    } finally {
      if (sent) captcha.reset();
      button.disabled = false;
    }
  });
}

const plain = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function songGroup(artist, list) {
  const group = document.createElement("div");
  group.className = "song-group";
  const title = document.createElement("h3");
  title.textContent = artist;
  const items = document.createElement("ul");
  list.forEach((song) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = song.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = song.song;
    item.append(link);
    if (song.note) {
      const note = document.createElement("span");
      note.textContent = song.note;
      item.append(note);
    }
    // Písnička, ke které je na webu video, dostane odkaz na jeho stránku.
    if (song.video) {
      const video = document.createElement("a");
      video.className = "song-video";
      video.href = `/video/${song.video}`;
      video.textContent = "video";
      item.append(video);
    }
    items.append(item);
  });
  group.append(title, items);
  return group;
}

// Zpěvník: odkazy na akordy, samotné akordy na webu nejsou. Bez písniček se sekce neukáže.
function initSongs(songs) {
  if (!songs.length) {
    document.querySelector('.topnav a[href="/zpevnik"]').hidden = true;
    return;
  }
  const root = document.getElementById("songs");
  const chips = document.getElementById("song-chips");
  const search = document.getElementById("song-search");
  document.getElementById("zpevnik").hidden = false;

  const groups = new Map();
  songs
    .sort((a, b) => a.artist.localeCompare(b.artist, "cs") || a.song.localeCompare(b.song, "cs"))
    .forEach((song) => groups.set(song.artist, [...(groups.get(song.artist) || []), song]));

  // Všichni interpreti pod sebou; při hledání jen ti, u kterých něco sedí.
  const showAll = (query) => {
    const needle = plain(query.trim());
    const found = [...groups]
      .map(([artist, list]) => [artist, list.filter((song) => !needle || plain(`${artist} ${song.song}`).includes(needle))])
      .filter(([, list]) => list.length);
    root.className = "songs";
    root.replaceChildren(...found.map(([artist, list]) => songGroup(artist, list)));
    if (!found.length) root.innerHTML = `<p class="empty">Tuhle písničku ve zpěvníku nemám.</p>`;
  };
  const showArtist = (artist) => {
    root.className = "songs is-single";
    root.replaceChildren(songGroup(artist, groups.get(artist)));
  };

  let selected = null;
  const select = (chip) => {
    selected = chip;
    chips.querySelectorAll(".chip").forEach((el) => el.setAttribute("aria-pressed", String(el === chip)));
    if (!chip) return;
    search.value = "";
    if (chip.dataset.artist) showArtist(chip.dataset.artist);
    else showAll("");
  };
  const addChip = (label, count, artist) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("aria-pressed", "false");
    chip.textContent = label;
    if (artist) chip.dataset.artist = artist;
    const number = document.createElement("span");
    number.className = "count";
    number.textContent = count;
    chip.append(number);
    chip.addEventListener("click", () => select(chip));
    chips.append(chip);
    return chip;
  };

  const all = addChip("Vše", songs.length);
  const byCount = [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "cs"));
  const artistChips = byCount.map(([artist, list]) => addChip(artist, list.length, artist));

  // Na první pohled jen nejčastější interpreti, ostatní schová tlačítko.
  const rest = artistChips.slice(TOP_ARTISTS);
  if (rest.length) {
    rest.forEach((chip) => (chip.hidden = true));
    const more = document.createElement("button");
    more.type = "button";
    more.className = "chip chip-more";
    more.textContent = `Všichni interpreti (${artistChips.length})`;
    more.addEventListener("click", () => {
      rest.forEach((chip) => (chip.hidden = false));
      more.remove();
    });
    chips.append(more);
  }

  const initial = all;
  select(initial);

  // Hledání jde přes celý zpěvník; po smazání se vrátí naposledy vybraný interpret.
  let beforeSearch = initial;
  search.addEventListener("input", () => {
    if (search.value.trim()) {
      if (selected) beforeSearch = selected;
      const query = search.value;
      select(null);
      search.value = query;
      showAll(query);
    } else {
      select(beforeSearch);
    }
  });
}

// Mobilní menu: na úzké obrazovce jsou odkazy schované pod tlačítkem.
function bindNav() {
  const nav = document.querySelector(".topnav");
  const toggle = document.getElementById("nav-toggle");
  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  document.getElementById("nav-links").addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
}

// Zpěvník, akordy, kanály, o mně a doporučení mají od 2026-10-25 vlastní stránky; staré odkazy /#zpevnik apod. vedou tam.
const MOVED = { zpevnik: "/zpevnik", akordy: "/akordy", kanaly: "/kanaly", tj: "/o-mne", doporuc: "/doporuc" };

function redirectMoved() {
  const moved = location.pathname === "/" && MOVED[location.hash.slice(1)];
  if (moved) location.replace(moved);
  return !!moved;
}

function init() {
  if (redirectMoved()) return;
  window.addEventListener("hashchange", redirectMoved);
  bindNav();
  bindPlayer();
  // Každá stránka dostane jen svoje data: úvod videa, zpěvník písničky, doporučení klíč Turnstile. Detail videa a písničky nic.
  if (!SITE) return;
  if (document.getElementById("recommend-form")) bindForm();
  if (SITE.songs) initSongs(SITE.songs);
  if (!SITE.videos) return;
  const videos = SITE.videos;
  bindFilters(videos);
  // Odkaz z detailu videa (/?f=three#videa) otevře rovnou danou sekci.
  const start = new URLSearchParams(location.search).get("f");
  const tab = start && document.querySelector(`[data-filter="${CSS.escape(start)}"]`);
  if (tab) tab.click();
  else render(videos, "latest");
  document.getElementById("videos-more").addEventListener("click", () => {
    shown.limit += PAGE_SIZE;
    render(...shown.last);
  });
}

init();
