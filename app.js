const CATEGORIES = {
  all: "Všechna videa",
  latest: "Nejnovější",
  start: "Začni dnes",
  three: "3 akordy a hotovo",
  fingerstyle: "Fingerstyle",
  cash: "Johnny Cash",
  kryl: "Karel Kryl",
  top: "Top objevy",
};

const FALLBACK_VIDEOS = [];

// Adresa formuláře z Formspree (https://formspree.io/f/…). Prázdná = sekce „Doporuč video" se skryje.
const FORMSPREE_URL = "https://formspree.io/f/xnpjvlyj";

const LEVELS = ["", "Úplný začátek", "Lehké", "Střední", "Těžší", "Náročné"];

const bars = (n) => Array.from({ length: 5 }, (_, i) => `<i${i < n ? ' class="on"' : ""}></i>`).join("");

function youtubeId(url, id) {
  if (id) return id;
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return "";
  }
}

// Barvy dlaždic reelů: [tmavé pozadí, světlý akcent pro kytaru a popisek].
const REEL_PALETTES = [
  ["#2c1245", "#c58bff"], ["#40101a", "#ff8a8a"], ["#0f2247", "#7ab8ff"], ["#0f3327", "#7fe0a8"], ["#3a2a05", "#f3cf5b"],
  ["#3b1d12", "#ffa66b"], ["#062f36", "#5fd6e0"], ["#3d0f33", "#ff8fd0"], ["#1b1f3d", "#9aa5ff"], ["#2a2f10", "#cfe06a"],
];
const REEL_GUITAR = `<svg viewBox="0 0 100 160" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" transform="rotate(28 50 80)"><path d="M50 62 C30 62 24 76 28 88 C30 95 22 98 18 110 C12 130 28 152 50 152 C72 152 88 130 82 110 C78 98 70 95 72 88 C76 76 70 62 50 62 Z"/><path d="M45 62 V20 M55 62 V20"/><rect x="40" y="0" width="20" height="20" rx="4"/><circle cx="50" cy="98" r="9"/><path d="M38 130 H62"/></g></svg>`;
// Pořadí reelu v seznamu určuje barvu, aby se sousední reely nelišily jen názvem.
const reelColor = new Map();

// Facebook nedává stálou adresu náhledu, reel má místo obrázku barevnou dlaždici s kytarou.
function thumbHTML(video) {
  if (video.facebook) {
    const [dark, accent] = REEL_PALETTES[(reelColor.get(video.id) || 0) % REEL_PALETTES.length];
    return `
      <a class="thumb thumb-reel${video.song.length > 18 ? " is-long" : ""}" style="--reel-dark:${dark};--reel-accent:${accent}" href="${video.facebook}" data-reel="${video.facebook}" aria-label="Přehrát ${video.song}">
        ${REEL_GUITAR}
        <span class="reel-kind">Reel · Facebook</span>
        <span class="reel-song">${video.song}</span>
        <span class="play">Přehrát reel</span>
      </a>`;
  }
  const id = youtubeId(video.youtube, video.id);
  return `
      <a class="thumb" href="${video.youtube}" data-play="${id}" aria-label="Přehrát ${video.song}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">
        <span class="play">Přehrát na YouTube</span>
      </a>`;
}

function cardHTML(video) {
  return `
    <article class="video-card" data-cats="${video.categories.join(" ")}" data-top="${video.top}">${thumbHTML(video)}
      <div class="card-body">
        <h3>${video.song}</h3>
        <p class="by">${video.channel}</p>
        <div class="facts">
          <span><span class="bars" aria-hidden="true">${bars(video.difficulty)}</span>Obtížnost <b>${video.difficulty}/5 · ${LEVELS[video.difficulty]}</b></span>
          <span>Čas <b>${video.time}</b></span>
        </div>
        <p class="comment"><strong>${video.title}</strong><span>${video.comment}</span></p>
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

// Rychlý výběr: štítky s písničkami z právě vybrané sekce. Klik ukáže jen to video, druhý klik vrátí celou sekci.
function renderPicks(videos, filter, shown, picked) {
  const root = document.getElementById("song-picks");
  const sorted = [...shown].sort((a, b) => a.song.localeCompare(b.song, "cs"));
  root.replaceChildren(
    ...sorted.map((video) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter" + (video.id === picked ? " is-on" : "");
      chip.textContent = video.song;
      chip.addEventListener("click", () => render(videos, filter, video.id === picked ? null : video.id));
      return chip;
    }),
  );
  root.hidden = sorted.length < 2;
}

function render(videos, filter, picked = null) {
  const root = document.getElementById("videos");
  const source = filter === "latest" ? newestFirst(videos) : videos;
  const filtered = source.filter((video) => {
    if (filter === "all" || filter === "latest") return true;
    if (filter === "top") return video.top;
    return video.categories.includes(filter);
  });
  renderPicks(videos, filter, filtered, picked);
  const cards = picked ? filtered.filter((video) => video.id === picked) : filtered;
  root.innerHTML = cards.length
    ? cards.map(cardHTML).join("")
    : `<p class="empty">V téhle sekci zatím nic není. TJ sem přidá jen to, co opravdu stojí za čas.</p>`;
}

function bindFilters(videos) {
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((el) => el.classList.remove("is-on"));
      btn.classList.add("is-on");
      const filter = btn.dataset.filter;
      render(videos, filter);
      history.replaceState(null, "", `#videa`);
      document.querySelectorAll(".nav-links a").forEach((a) => {
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

function bindPlayer() {
  document.getElementById("videos").addEventListener("click", (event) => {
    const reel = event.target.closest("[data-reel]");
    if (reel) {
      event.preventDefault();
      const href = encodeURIComponent(reel.dataset.reel);
      reel.classList.add("is-playing");
      reel.innerHTML = `<iframe src="https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=false&mute=0" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowfullscreen title="Facebook reel"></iframe>`;
      return;
    }
    const link = event.target.closest("[data-play]");
    if (!link) return;
    event.preventDefault();
    const id = link.dataset.play;
    link.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube video"></iframe>`;
  });
}

function bindNav() {
  const btn = document.querySelector(".menu-btn");
  const links = document.querySelector(".nav-links");
  btn.addEventListener("click", () => links.classList.toggle("is-open"));
  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => links.classList.remove("is-open"));
  });
}

function bindForm() {
  const section = document.getElementById("doporuc");
  const form = document.getElementById("recommend-form");
  const note = document.getElementById("recommend-note");
  if (!FORMSPREE_URL) {
    // Bez adresy formuláře by tip nikam nedošel, sekci proto neukazujeme.
    section.hidden = true;
    document.querySelector('.nav-links a[href="#doporuc"]').parentElement.hidden = true;
    return;
  }
  const say = (text, ok) => {
    note.textContent = text;
    note.style.color = ok ? "#2f6b45" : "#a1352a";
    note.hidden = false;
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      // Skryté pole vyplní jen robot; takový tip neposíláme.
      if (data._gotcha) throw new Error("spam");
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "Joy To Play: tip na video",
          video: data.url,
          proc: data.why,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      form.reset();
      say("Díky. Tip je u TJ, podívá se na něj.", true);
    } catch {
      say("Tip se nepodařilo odeslat. Zkus to prosím za chvíli znovu.", false);
    } finally {
      button.disabled = false;
    }
  });
}

async function loadVideos() {
  try {
    const res = await fetch("videos.json", { cache: "no-store" });
    if (!res.ok) throw new Error("missing json");
    return await res.json();
  } catch {
    return FALLBACK_VIDEOS;
  }
}

const plain = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
    items.append(item);
  });
  group.append(title, items);
  return group;
}

// Zpěvník: odkazy na akordy, samotné akordy na webu nejsou. Bez písniček se sekce neukáže.
async function initSongs() {
  let songs = [];
  try {
    const res = await fetch("pisnicky.json", { cache: "no-store" });
    if (res.ok) songs = await res.json();
  } catch {
    /* zpěvník je volitelný */
  }
  if (!songs.length) {
    document.querySelector('.nav-links a[href="#zpevnik"]').parentElement.hidden = true;
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
    chips.querySelectorAll(".filter").forEach((el) => el.classList.toggle("is-on", el === chip));
    if (!chip) return;
    search.value = "";
    if (chip.dataset.artist) showArtist(chip.dataset.artist);
    else showAll("");
  };
  const addChip = (label, count, artist) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter";
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
  const initial = artistChips[0] || all;
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

async function init() {
  bindNav();
  bindForm();
  initSongs();
  const videos = await loadVideos();
  if (!videos.length) {
    document.getElementById("videos").innerHTML =
      "<p class=\"empty\">Videa se nepodařilo načíst. Otevři web přes malý lokální server, ne jen jako soubor.</p>";
    return;
  }
  videos.filter((video) => video.facebook).forEach((video, index) => reelColor.set(video.id, index));
  render(videos, "latest");
  bindFilters(videos);
  bindPlayer();
}

init();
