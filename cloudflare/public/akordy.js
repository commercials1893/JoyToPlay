// Sekce Akordy: interaktivní hmatník. Klik na akord přesune prsty a akord zahraje, tažení přes struny brnká,
// u přechodu ukáže, které prsty se hýbou, a jde procvičit pod metronomem. Zvuk vzniká v prohlížeči (Web Audio), až po kliknutí.
(() => {
  const root = document.getElementById("akordy-app");
  if (!root) return;

  // Struny od nejhlubší (E) po nejvyšší (e). -1 = nehraje, 0 = prázdná. fingers: číslo prstu na struně.
  const CHORDS = [
    { id: "G", full: "G dur", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], notes: "G · H · D", group: 1 },
    { id: "C", full: "C dur", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], notes: "C · E · G", group: 1 },
    { id: "D", full: "D dur", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], notes: "D · Fis · A", group: 1 },
    { id: "Em", full: "E moll", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], notes: "E · G · H", group: 1 },
    { id: "Am", full: "A moll", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], notes: "A · C · E", group: 1 },
    { id: "E", full: "E dur", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], notes: "E · Gis · H", group: 2 },
    { id: "A", full: "A dur", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], notes: "A · Cis · E", group: 2 },
    { id: "Dm", full: "D moll", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], notes: "D · F · A", group: 2 },
    { id: "G7", full: "G septakord", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], notes: "G · H · D · F", group: 2 },
    { id: "D7", full: "D septakord", frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], notes: "D · Fis · A · C", group: 2 },
    { id: "E7", full: "E septakord", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], notes: "E · Gis · H · D", group: 2 },
    { id: "A7", full: "A septakord", frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], notes: "A · Cis · E · G", group: 2 },
    { id: "C7", full: "C septakord", frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], notes: "C · E · G · B", group: 3 },
    { id: "H7", full: "H septakord", frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], notes: "H · Dis · Fis · A", group: 3 },
    { id: "Em7", full: "E moll septakord", frets: [0, 2, 2, 0, 3, 3], fingers: [0, 1, 2, 0, 3, 4], notes: "E · G · H · D", group: 3 },
    { id: "Dsus4", full: "D sus4", frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4], notes: "D · G · A", group: 3 },
    { id: "A7sus4", full: "A7 sus4", frets: [-1, 0, 2, 0, 3, 3], fingers: [0, 0, 2, 0, 3, 4], notes: "A · D · E · G", group: 3 },
    { id: "C2", full: "C2 (Cadd9)", frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], notes: "C · D · E · G", group: 3 },
    { id: "Fmaj7", full: "F maj7 (lehké F)", frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], notes: "F · A · C · E", group: 3 },
    { id: "F", full: "F dur (barré)", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, notes: "F · A · C", group: 3 },
    { id: "Hm", full: "H moll (barré)", frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 }, notes: "H · D · Fis", group: 3 },
  ];
  const byId = Object.fromEntries(CHORDS.map((c) => [c.id, c]));
  const GROUPS = { 1: "Začni tady", 2: "Pak tyhle", 3: "Až budeš chtít víc" };

  // ----- zvuk: Karplus-Strong (drnknutá struna), každá výška tónu se vygeneruje jednou -----
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  // Režim zvuku (navigator.audioSession) jen na iPhonu a iPadu, kvůli tichému režimu. Na Macu ho Safari
  // po použití mikrofonu (Ladička) nechá v rozbitém stavu a pak nehraje vůbec nic (2026-10-25).
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let ctx = null, master = null;
  const cache = new Map();
  function audio() {
    if (!ctx) {
      // iPhone: bez tohohle Web Audio mlčí, když je zapnutý tichý režim
      try { if (IOS && navigator.audioSession) navigator.audioSession.type = "playback"; } catch (_) {}
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const body = ctx.createBiquadFilter();
      body.type = "peaking"; body.frequency.value = 180; body.Q.value = 1.1; body.gain.value = 5;
      const top = ctx.createBiquadFilter();
      top.type = "lowpass"; top.frequency.value = 5200;
      master.connect(body).connect(top).connect(ctx.destination);
    }
    // Safari po mikrofonu (Ladička) nechá zvuk ve stavu „interrupted“; obnovit je potřeba z každého stavu kromě „running“.
    if (ctx.state === "closed") { ctx = null; cache.clear(); return audio(); }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    return ctx;
  }
  function buffer(midi) {
    if (cache.has(midi)) return cache.get(midi);
    const sr = ctx.sampleRate, n = Math.round(sr / (440 * Math.pow(2, (midi - 69) / 12)));
    const len = Math.floor(sr * 3), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (let k = 0; k < 2; k++) for (let i = 1; i < n; i++) d[i] = (d[i] + d[i - 1]) / 2;
    const decay = 0.9965 + Math.min(0.0025, (60 - midi) * 0.0001);
    // d[i - n - 1] musí existovat, jinak by d[-1] (undefined) udělalo z celého zvuku NaN a nehrálo by nic
    d[n] = decay * d[0];
    for (let i = n + 1; i < len; i++) d[i] = decay * 0.5 * (d[i - n] + d[i - n - 1]);
    cache.set(midi, b);
    return b;
  }
  function pluck(string, fret, when, vel = 1) {
    if (fret < 0) return;
    audio();
    const src = ctx.createBufferSource(), g = ctx.createGain(), t = Math.max(ctx.currentTime, when || 0);
    src.buffer = buffer(OPEN_MIDI[string] + fret);
    g.gain.setValueAtTime(0.32 * vel, t);
    g.gain.setTargetAtTime(0, t + 2.2, 0.25);
    src.connect(g).connect(master);
    src.start(t);
    src.stop(t + 3);
  }
  // Brnknutí: dolů od basu, nahoru (up) jen přes čtyři vyšší struny. Vrací [struna, za kolik sekund zazní] pro animaci.
  function strum(ch, opt = {}) {
    audio();
    const when = opt.when || ctx.currentTime + 0.01, spread = opt.spread ?? 0.028, vel = opt.vel ?? 1, times = [];
    const order = opt.up ? [5, 4, 3, 2] : [0, 1, 2, 3, 4, 5];
    let k = 0;
    order.forEach((s) => {
      const fr = ch.frets[s];
      if (fr < 0) return;
      const t = when + k++ * spread;
      pluck(s, fr, t, vel);
      times.push([s, t - ctx.currentTime]);
    });
    return times;
  }
  function click(when, accent) {
    audio();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.15, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(when); o.stop(when + 0.06);
  }
  // Metronom: zvuk se plánuje dopředu v Web Audio, obraz dostane callback ve chvíli, kdy doba zazní.
  function loop({ bpm, onBeat, onShow }) {
    audio();
    let next = ctx.currentTime + 0.12, n = 0, alive = true;
    const timers = new Set();
    const tick = () => {
      while (alive && next < ctx.currentTime + 0.15) {
        const beat = n, when = next;
        onBeat(beat, when);
        const t = setTimeout(() => { timers.delete(t); if (alive) onShow(beat); }, Math.max(0, (when - ctx.currentTime) * 1000));
        timers.add(t);
        next += 60 / bpm;
        n++;
      }
    };
    tick();
    const iv = setInterval(tick, 25);
    return {
      stop() { alive = false; clearInterval(iv); timers.forEach(clearTimeout); },
      setBpm(b) { bpm = b; },
    };
  }

  // Malý diagram akordu na výšku, jak bývá ve zpěvnících.
  function box(ch, fingers = true) {
    const w = 120, h = 140, x0 = 18, y0 = 30, sx = (w - 2 * x0) / 5, sy = 24, s = [];
    s.push(`<svg class="chordbox" viewBox="0 0 ${w} ${h}" role="img" aria-label="${ch.full}">`);
    s.push(`<rect x="${x0 - 1}" y="${y0 - 4}" width="${5 * sx + 2}" height="4" rx="1.5" style="fill:currentColor"/>`);
    for (let f = 1; f <= 4; f++) s.push(`<line x1="${x0}" x2="${x0 + 5 * sx}" y1="${y0 + f * sy}" y2="${y0 + f * sy}" stroke="currentColor" stroke-opacity=".25"/>`);
    for (let i = 0; i < 6; i++) s.push(`<line x1="${x0 + i * sx}" x2="${x0 + i * sx}" y1="${y0}" y2="${y0 + 4 * sy}" stroke="currentColor" stroke-opacity=".55" stroke-width="${1.6 - i * 0.15}"/>`);
    ch.frets.forEach((f, i) => {
      const x = x0 + i * sx;
      if (f === -1) s.push(`<text x="${x}" y="${y0 - 10}" text-anchor="middle" font-size="11">×</text>`);
      if (f === 0) s.push(`<circle cx="${x}" cy="${y0 - 14}" r="3.6" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.3"/>`);
    });
    if (ch.barre) {
      const b = ch.barre;
      s.push(`<rect x="${x0 + b.from * sx - 8}" y="${y0 + (b.fret - 0.5) * sy - 8}" width="${(b.to - b.from) * sx + 16}" height="16" rx="8" style="fill:var(--accent)"/>`);
    }
    ch.frets.forEach((f, i) => {
      if (f <= 0 || (ch.barre && f === ch.barre.fret && ch.fingers[i] === 1)) return;
      const x = x0 + i * sx, y = y0 + (f - 0.5) * sy;
      s.push(`<circle cx="${x}" cy="${y}" r="8.5" style="fill:var(--accent)"/>`);
      if (fingers) s.push(`<text x="${x}" y="${y + 3.8}" text-anchor="middle" font-size="10.5" font-weight="600" style="fill:#fff">${ch.fingers[i]}</text>`);
    });
    s.push(`</svg>`);
    return s.join("");
  }

  // ----- hmatník: na šířku (počítač) nebo na výšku (mobil), stejná logika -----
  const $ = (id) => document.getElementById(id);
  const board = $("aa-board");
  const MOBILE = matchMedia("(max-width:600px)");
  let G = null, cur = null, prev = null, practice = null;

  function geometry(vertical) {
    if (!vertical) {
      const FX = [78, 196, 306, 408, 502, 588], y = (s) => 30 + (5 - s) * 38;
      return { vertical, W: 640, H: 250, R: 17, sp: 38,
        pos: (s, f) => [f === 0 ? 40 : (FX[f - 1] + FX[f]) / 2 + 6, y(s)],
        line: (s) => [78, y(s), 640, y(s)],
        fret: (k) => [FX[k], 14, FX[k], 236],
        wood: [78, 12, 562, 226], nut: [73, 12, 8, 226],
        inlay: (f) => [(FX[f - 1] + FX[f]) / 2, 125],
        barre: (b) => { const x = (FX[b.fret - 1] + FX[b.fret]) / 2 + 6, y1 = y(b.to) - 17, y2 = y(b.from) + 17; return [x - 17, y1, 34, y2 - y1]; },
        coord: (e, r) => ((e.clientY - r.top) / r.height) * 250, at: (v) => 5 - Math.round((v - 30) / 38) };
    }
    const FY = [78, 178, 268, 350, 424, 492], x = (s) => 40 + s * 52;
    return { vertical, W: 340, H: 510, R: 19, sp: 52,
      pos: (s, f) => [x(s), f === 0 ? 40 : (FY[f - 1] + FY[f]) / 2 + 6],
      line: (s) => [x(s), 78, x(s), 510],
      fret: (k) => [16, FY[k], 324, FY[k]],
      wood: [14, 78, 312, 432], nut: [14, 73, 312, 8],
      inlay: (f) => [x(2.5), (FY[f - 1] + FY[f]) / 2],
      barre: (b) => { const yy = (FY[b.fret - 1] + FY[b.fret]) / 2 + 6, x1 = x(b.from) - 19, x2 = x(b.to) + 19; return [x1, yy - 19, x2 - x1, 38]; },
      coord: (e, r) => ((e.clientX - r.left) / r.width) * 340, at: (v) => Math.round((v - 40) / 52) };
  }
  function build() {
    if (G && G.vertical === MOBILE.matches) return;
    G = geometry(MOBILE.matches);
    const svg = [`<svg viewBox="0 0 ${G.W} ${G.H}" aria-hidden="true">`];
    svg.push(`<rect class="aa-wood" x="${G.wood[0]}" y="${G.wood[1]}" width="${G.wood[2]}" height="${G.wood[3]}" rx="14"/>`);
    [3, 5].forEach((f) => { const [cx, cy] = G.inlay(f); svg.push(`<circle class="aa-inlay" cx="${cx}" cy="${cy}" r="8"/>`); });
    for (let k = 1; k <= 5; k++) { const [x1, y1, x2, y2] = G.fret(k); svg.push(`<line class="aa-fret" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`); }
    svg.push(`<rect class="aa-nut" x="${G.nut[0]}" y="${G.nut[1]}" width="${G.nut[2]}" height="${G.nut[3]}" rx="3"/>`);
    svg.push(`<rect class="aa-barre" id="aa-barre" x="0" y="0" width="0" height="0" rx="${G.R}"/>`);
    for (let s = 0; s < 6; s++) {
      const [x1, y1, x2, y2] = G.line(s), [ox, oy] = G.pos(s, 0);
      svg.push(`<g class="aa-str${G.vertical ? " v" : ""}" id="aa-str${s}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${3.4 - s * 0.42}"/></g>`);
      svg.push(`<circle class="aa-open" id="aa-open${s}" cx="${ox}" cy="${oy}" r="9"/>`);
      svg.push(`<text class="aa-mark" id="aa-mute${s}" x="${ox}" y="${oy}">×</text>`);
    }
    for (let f = 1; f <= 4; f++) svg.push(`<circle class="aa-ghost" id="aa-gh${f}" r="${G.R}" cx="0" cy="0"/>`);
    for (let f = 1; f <= 4; f++) svg.push(`<g class="aa-f off" id="aa-fi${f}" style="transform:translate(${G.W / 2}px,${G.H / 2}px)"><circle r="${G.R}"/><text>${f}</text></g>`);
    svg.push(`<g id="aa-rings"></g></svg>`);
    board.innerHTML = svg.join("");
    if (cur) show(cur, true);
  }

  // kde leží který prst; u barré dá prst 1 na konec barré blíž k basovým strunám (mobil) nebo nahoru (počítač)
  function fingerMap(ch) {
    const m = {};
    ch.frets.forEach((fr, s) => {
      const fi = ch.fingers[s];
      if (fr > 0 && fi && !m[fi]) m[fi] = { s, f: fr };
    });
    if (ch.barre) m[1] = { s: G.vertical ? ch.barre.from : ch.barre.to, f: ch.barre.fret };
    return m;
  }

  function show(ch, keepPrev) {
    if (!keepPrev) prev = cur;
    cur = ch;
    $("aa-name").textContent = ch.id;
    $("aa-full").innerHTML = `<b>${ch.full}</b> · tóny ${ch.notes}`;
    const m = fingerMap(ch), pm = prev ? fingerMap(prev) : {};
    for (let f = 1; f <= 4; f++) {
      const el = $("aa-fi" + f), p = m[f], q = pm[f];
      if (p) {
        const [x, y] = G.pos(p.s, p.f);
        el.classList.remove("off");
        el.style.transform = `translate(${x}px,${y}px)`;
        el.classList.toggle("stay", !!(q && q.s === p.s && q.f === p.f));
      } else el.classList.add("off");
      const g = $("aa-gh" + f);
      if (q) { const [x, y] = G.pos(q.s, q.f); g.setAttribute("cx", x); g.setAttribute("cy", y); }
      g.classList.toggle("on", !!(q && !(p && p.s === q.s && p.f === q.f)));
    }
    const b = $("aa-barre");
    if (ch.barre) {
      const [x, y, w, h] = G.barre(ch.barre);
      b.setAttribute("x", x); b.setAttribute("y", y); b.setAttribute("width", w); b.setAttribute("height", h);
    }
    b.classList.toggle("on", !!ch.barre);
    for (let s = 0; s < 6; s++) {
      const fr = ch.frets[s];
      $("aa-open" + s).style.opacity = fr === 0 ? 1 : 0;
      $("aa-mute" + s).style.opacity = fr === -1 ? 1 : 0;
      $("aa-str" + s).classList.toggle("muted", fr === -1);
    }
    board.setAttribute("aria-label", `Hmatník, akord ${ch.full}. Přejeď po strunách a zahraj.`);
    root.querySelectorAll(".aa-chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.id === ch.id));
    renderMove();
  }

  // ----- popis přechodu z minulého akordu -----
  function describe(a, b) {
    const ma = fingerMap(a), mb = fingerMap(b), out = [];
    let moved = 0;
    for (let f = 1; f <= 4; f++) {
      const p = ma[f], q = mb[f];
      if (!p && !q) continue;
      let t, stay = false;
      if (!p) { t = "přiložíš navíc"; moved++; }
      else if (!q) t = "zvedneš";
      else if (p.s === q.s && p.f === q.f) { t = "zůstává na místě, je to tvoje kotva"; stay = true; }
      else if (p.s === q.s) { const d = Math.abs(p.f - q.f); t = `sjede po stejné struně o ${d} ${d === 1 ? "pražec" : "pražce"}`; moved++; }
      else if (p.f === q.f) { const d = Math.abs(p.s - q.s); t = `přeskočí ${d === 1 ? "na vedlejší strunu" : `o ${d} struny`}`; moved++; }
      else { t = "se přesune jinam"; moved++; }
      out.push({ f, t, stay });
    }
    return { out, verdict: moved <= 1 ? "Pohodový přechod" : moved === 2 ? "Chce trochu cviku" : "Přehazuješ celou ruku" };
  }
  function renderMove() {
    const box = $("aa-move");
    if (!prev || prev.id === cur.id) { box.hidden = true; return; }
    const { out, verdict } = describe(prev, cur);
    box.hidden = false;
    box.innerHTML = `<div class="pair">${prev.id} → ${cur.id}</div>
      <div><h3>${verdict}</h3>
        <ul>${out.map((o) => `<li class="${o.stay ? "stay" : ""}"><i>${o.f}</i>${o.f}. prst ${o.t}</li>`).join("")}</ul>
        <button class="btn btn-quiet" id="aa-practice" type="button">${practice ? "■ Stop" : `Procvič ${prev.id} ⇄ ${cur.id} pod metronomem`}</button><span class="aa-count" id="aa-count" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      </div>`;
    $("aa-practice").onclick = togglePractice;
  }
  function stopPractice() { if (practice) { practice.stop(); practice = null; } }
  function togglePractice() {
    if (practice) { stopPractice(); renderMove(); return; }
    ccStop();
    const pair = [prev, cur];
    practice = loop({
      bpm: 72,
      onBeat: (n, when) => strum(pair[Math.floor(n / 4) % 2], { when, vel: n % 4 === 0 ? 1 : 0.55, spread: 0.02 }),
      onShow: (n) => {
        const ch = pair[Math.floor(n / 4) % 2];
        if (n % 4 === 0 && ch !== cur) show(ch);
        document.querySelectorAll("#aa-count i").forEach((d, i) => d.classList.toggle("on", i === n % 4));
        ch.frets.forEach((fr, s) => fr >= 0 && vib(s, s * 0.02));
      },
    });
    $("aa-practice").textContent = "■ Stop";
  }

  // ----- animace strun -----
  function vib(s, delay = 0) {
    setTimeout(() => {
      const g = $("aa-str" + s);
      g.classList.remove("vib"); void g.getBBox(); g.classList.add("vib");
      clearTimeout(g._t); g._t = setTimeout(() => g.classList.remove("vib"), 720);
      const fr = cur.frets[s];
      if (fr < 0) return;
      const [x, y] = G.pos(s, fr), r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      r.setAttribute("class", "aa-ring"); r.setAttribute("r", 14); r.setAttribute("cx", x); r.setAttribute("cy", y);
      $("aa-rings").appendChild(r);
      setTimeout(() => r.remove(), 750);
    }, delay * 1000);
  }
  const strumNow = () => strum(cur).forEach(([s, t]) => vib(s, t));
  $("aa-strum").onclick = strumNow;
  $("aa-arp").onclick = () => {
    const t0 = audio().currentTime + 0.02, seq = [0, 1, 2, 3, 4, 5].filter((s) => cur.frets[s] >= 0);
    [...seq, ...seq.slice(0, -1).reverse()].forEach((s, k) => { pluck(s, cur.frets[s], t0 + k * 0.18); vib(s, k * 0.18); });
  };

  // tažení přes struny = brnknutí
  let down = false, last = -1;
  const stringAt = (e) => {
    const v = G.coord(e, board.getBoundingClientRect()), s = G.at(v);
    if (s < 0 || s > 5) return -1;
    const [x, y] = G.pos(s, 1);
    return Math.abs(v - (G.vertical ? x : y)) < G.sp * 0.45 ? s : -1;
  };
  const hit = (s) => { if (s < 0 || s === last) return; last = s; if (cur.frets[s] >= 0) { pluck(s, cur.frets[s]); vib(s); } };
  board.addEventListener("pointerdown", (e) => { down = true; last = -1; try { board.setPointerCapture(e.pointerId); } catch (_) {} hit(stringAt(e)); });
  board.addEventListener("pointermove", (e) => { if (down) hit(stringAt(e)); });
  board.addEventListener("pointerup", () => { down = false; last = -1; });
  board.addEventListener("pointercancel", () => { down = false; last = -1; });

  // ----- výběr akordů -----
  const picker = $("aa-picker");
  picker.innerHTML = Object.entries(GROUPS).map(([g, label]) => `<div class="aa-group"><div class="eyebrow">${label}</div><div>${CHORDS.filter((c) => c.group == g).map((c) => `<button class="aa-chip" type="button" data-id="${c.id}" aria-pressed="false" aria-label="${c.full}">${c.id}</button>`).join("")}</div></div>`).join("");
  picker.addEventListener("click", (e) => {
    const b = e.target.closest(".aa-chip");
    if (!b || b.dataset.id === cur.id) return;
    stopPractice();
    audio();   // zvuk se musí odemknout přímo v kliknutí, brnknutí přijde až po animaci
    show(byId[b.dataset.id]);
    setTimeout(strumNow, 380);
    // na mobilu je výběr akordů nad hmatníkem, takže hmatník po kliknutí doscrolluju do výhledu
    if (matchMedia("(max-width:600px)").matches) {
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.querySelector(".aa-stage").scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    }
  });

  // ----- Hraj s doprovodem: postup čtyř akordů, rytmus a tempo; web hraje a ukazuje, co přijde -----
  const PROGS = [
    { chords: ["G", "D", "Em", "C"], hint: "Táborák i rádio. Třeba Country Roads." },
    { chords: ["C", "Am", "Dm", "G7"], hint: "Padesátky. Blue Moon a spol." },
    { chords: ["Am", "Fmaj7", "C", "G"], hint: "Smutnější a s lehkým F." },
    { chords: ["E", "A", "H7", "A"], hint: "Country a Johnny Cash." },
    { chords: ["D", "A", "Hm", "G"], hint: "Až zvládneš barré. U2." },
  ];
  // osminy v taktu: D dolů, U nahoru, d lehce dolů, . pauza
  const RH = [
    { id: "down", label: "Dolů", p: "D.D.D.D." },
    { id: "camp", label: "Táborák", p: "D.DU.UDU" },
    { id: "waltz", label: "Valčík", p: "D.d.d." },
  ];
  let prog = PROGS[0], rh = RH[1], bpm = 72, tempo = 72, player = null;

  $("cc-progs").innerHTML = PROGS.map((p, i) => `<button class="cc-prog" type="button" data-i="${i}" aria-pressed="${i === 0}"><b>${p.chords.join(" · ")}</b><span>${p.hint}</span></button>`).join("");
  $("cc-rh").innerHTML = RH.map((r) => `<button class="tab" type="button" data-rh="${r.id}" aria-pressed="${r === rh}">${r.label}</button>`).join("");

  function ccChord(i, pop) {
    const ch = byId[prog.chords[i % 4]], nx = byId[prog.chords[(i + 1) % 4]];
    $("cc-name").textContent = ch.id; $("cc-box").innerHTML = box(ch);
    $("cc-nname").textContent = nx.id; $("cc-nbox").innerHTML = box(nx, false);
    if (pop) { const c = $("cc-cur"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
    document.querySelectorAll(".cc-bar").forEach((b, k) => b.classList.toggle("on", k === i % 4));
  }
  function ccDraw() {
    $("cc-beats").innerHTML = "<i></i>".repeat(rh.p.length / 2);
    $("cc-strokes").innerHTML = [...rh.p].map((s) => `<i class="${s === "." ? "rest" : ""}">${s === "U" ? "↑" : s === "." ? "·" : "↓"}</i>`).join("");
    $("cc-time").innerHTML = `<div class="cc-head" id="cc-head"></div>` + prog.chords.map((c) => `<div class="cc-bar">${c}</div>`).join("");
    ccChord(0, false);
  }
  function ccStop() {
    if (!player) return;
    player.stop();
    player = null;
    $("cc-play").textContent = "▶︎"; $("cc-play").setAttribute("aria-label", "Hrát");
    document.querySelectorAll("#cc-beats i, #cc-strokes i").forEach((x) => x.classList.remove("on"));
    $("cc-next").classList.remove("soon");
    $("cc-head").style.transition = "none"; $("cc-head").style.left = "0";
    $("cc-stat").textContent = "Zmáčkni ▶︎. Nejdřív odpočítám čtyři doby.";
  }
  function ccStart() {
    if (practice) { stopPractice(); renderMove(); }
    const L = rh.p.length;
    tempo = bpm;
    player = loop({
      bpm: bpm * 2,
      onBeat(n, when) {
        const bar = Math.floor(n / L) - 1, k = n % L, s = rh.p[k];   // takt -1 = odpočítávání
        if (bar < 0) { if (k % 2 === 0) click(when, k === 0); return; }
        if (k === 0 && bar > 0 && bar % 4 === 0 && $("cc-up").checked) { tempo = Math.min(160, tempo + 4); player.setBpm(tempo * 2); }
        const ch = byId[prog.chords[bar % 4]];
        if (s === "D") strum(ch, { when, vel: k === 0 ? 1 : 0.75, spread: 0.022 });
        if (s === "d") strum(ch, { when, vel: 0.45, spread: 0.018 });
        if (s === "U") strum(ch, { when, up: true, vel: 0.45, spread: 0.018 });
      },
      onShow(n) {
        const bar = Math.floor(n / L) - 1, k = n % L;
        if (bar < 0) {
          if (k % 2 === 0) { const c = $("cc-count"); c.textContent = k / 2 + 1; c.classList.remove("on"); void c.offsetWidth; c.classList.add("on"); }
          return;
        }
        if (k === 0) {
          ccChord(bar % 4, true);
          $("cc-stat").innerHTML = `Kolo <b>${Math.floor(bar / 4) + 1}</b> · <b>${tempo} BPM</b>${$("cc-up").checked ? " · zrychluju" : ""}`;
        }
        document.querySelectorAll("#cc-beats i").forEach((x, j) => x.classList.toggle("on", k % 2 === 0 && j === k / 2));
        document.querySelectorAll("#cc-strokes i").forEach((x, j) => x.classList.toggle("on", j === k && rh.p[k] !== "."));
        $("cc-next").classList.toggle("soon", k >= L - 2);
        const head = $("cc-head");
        if (bar % 4 === 0 && k === 0) { head.style.transition = "none"; head.style.left = "0"; void head.offsetWidth; }
        head.style.transition = `left ${30 / tempo}s linear`;
        head.style.left = `calc(${(((bar % 4) + (k + 1) / L) / 4) * 100}% - 2px)`;
      },
    });
    $("cc-play").textContent = "■"; $("cc-play").setAttribute("aria-label", "Zastavit");
    $("cc-stat").textContent = "Raz, dva, tři, čtyři…";
  }
  const restart = () => { const was = !!player; ccStop(); ccDraw(); if (was) ccStart(); };
  $("cc-play").onclick = () => (player ? ccStop() : ccStart());
  $("cc-bpm").oninput = (e) => { bpm = +e.target.value; $("cc-bpmv").textContent = `${bpm} BPM`; tempo = bpm; if (player) player.setBpm(tempo * 2); };
  $("cc-progs").addEventListener("click", (e) => {
    const b = e.target.closest(".cc-prog"); if (!b) return;
    prog = PROGS[+b.dataset.i];
    document.querySelectorAll(".cc-prog").forEach((x) => x.setAttribute("aria-pressed", x === b));
    restart();
  });
  $("cc-rh").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rh]"); if (!b) return;
    rh = RH.find((r) => r.id === b.dataset.rh);
    document.querySelectorAll("#cc-rh [data-rh]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    restart();
  });
  ccDraw();

  // Diagnostika zvuku pro ladění v Safari: /akordy?zvuk=diag
  window.jtpAudio = () => ctx;
  if (/[?&]zvuk=diag/.test(location.search)) document.head.append(Object.assign(document.createElement("script"), { src: "/zvuk-diag.js" }));

  build();
  // Odkaz z karty videa: /akordy?akord=Em otevře rovnou ten akord.
  const wanted = byId[new URLSearchParams(location.search).get("akord")];
  show(wanted || byId.G);
  MOBILE.addEventListener("change", build);
})();
