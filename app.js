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

function cardHTML(video) {
  const id = youtubeId(video.youtube, video.id);
  return `
    <article class="video-card" data-cats="${video.categories.join(" ")}" data-top="${video.top}">
      <a class="thumb" href="${video.youtube}" data-play="${id}" aria-label="Přehrát ${video.song}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">
        <span class="play">Přehrát na YouTube</span>
      </a>
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

function render(videos, filter) {
  const root = document.getElementById("videos");
  const source = filter === "latest" ? newestFirst(videos) : videos;
  const filtered = source.filter((video) => {
    if (filter === "all" || filter === "latest") return true;
    if (filter === "top") return video.top;
    return video.categories.includes(filter);
  });
  root.innerHTML = filtered.length
    ? filtered.map(cardHTML).join("")
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

async function init() {
  bindNav();
  bindForm();
  const videos = await loadVideos();
  if (!videos.length) {
    document.getElementById("videos").innerHTML =
      "<p class=\"empty\">Videa se nepodařilo načíst. Otevři web přes malý lokální server, ne jen jako soubor.</p>";
    return;
  }
  render(videos, "latest");
  bindFilters(videos);
  bindPlayer();
}

init();
