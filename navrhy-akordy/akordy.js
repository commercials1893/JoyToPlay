// Společný kód návrhů sekce Akordy: tvary akordů, kreslení diagramů a zvuk kytary přes Web Audio.
// Struny se počítají od nejhlubší (E) po nejvyšší (e). -1 = nehraje, 0 = prázdná.
(function () {
  const C = [
    { id: "G", name: "G", full: "G dur", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], notes: "G · H · D", group: 1 },
    { id: "C", name: "C", full: "C dur", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], notes: "C · E · G", group: 1 },
    { id: "D", name: "D", full: "D dur", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], notes: "D · Fis · A", group: 1 },
    { id: "Em", name: "Em", full: "E moll", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], notes: "E · G · H", group: 1 },
    { id: "Am", name: "Am", full: "A moll", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], notes: "A · C · E", group: 1 },
    { id: "E", name: "E", full: "E dur", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], notes: "E · Gis · H", group: 2 },
    { id: "A", name: "A", full: "A dur", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], notes: "A · Cis · E", group: 2 },
    { id: "Dm", name: "Dm", full: "D moll", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], notes: "D · F · A", group: 2 },
    { id: "G7", name: "G7", full: "G septakord", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], notes: "G · H · D · F", group: 2 },
    { id: "D7", name: "D7", full: "D septakord", frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], notes: "D · Fis · A · C", group: 2 },
    { id: "E7", name: "E7", full: "E septakord", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], notes: "E · Gis · H · D", group: 2 },
    { id: "A7", name: "A7", full: "A septakord", frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], notes: "A · Cis · E · G", group: 2 },
    { id: "C7", name: "C7", full: "C septakord", frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], notes: "C · E · G · B", group: 3 },
    { id: "H7", name: "H7", full: "H septakord", frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], notes: "H · Dis · Fis · A", group: 3 },
    { id: "Fmaj7", name: "Fmaj7", full: "F maj7 (lehké F)", frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], notes: "F · A · C · E", group: 3 },
    { id: "F", name: "F", full: "F dur (barré)", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, notes: "F · A · C", group: 3 },
    { id: "Hm", name: "Hm", full: "H moll (barré)", frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 }, notes: "H · D · Fis", group: 3 },
  ];
  const byId = Object.fromEntries(C.map((c) => [c.id, c]));
  const GROUPS = { 1: "Začni tady", 2: "Pak tyhle", 3: "Až budeš chtít víc" };

  // Malý diagram akordu (svisle, jak bývá ve zpěvnících). Barvy jdou z CSS (currentColor, var(--accent)).
  function box(ch, opt = {}) {
    const w = 120, h = 140, x0 = 18, y0 = 30, sx = (w - 2 * x0) / 5, sy = 24, frets = 4;
    const s = [];
    s.push(`<svg class="chordbox" viewBox="0 0 ${w} ${h}" role="img" aria-label="${ch.full}">`);
    s.push(`<rect x="${x0 - 1}" y="${y0 - 4}" width="${5 * sx + 2}" height="4" rx="1.5" fill="currentColor"/>`);
    for (let f = 1; f <= frets; f++) s.push(`<line x1="${x0}" x2="${x0 + 5 * sx}" y1="${y0 + f * sy}" y2="${y0 + f * sy}" stroke="currentColor" stroke-opacity=".25"/>`);
    for (let i = 0; i < 6; i++) s.push(`<line x1="${x0 + i * sx}" x2="${x0 + i * sx}" y1="${y0}" y2="${y0 + frets * sy}" stroke="currentColor" stroke-opacity=".55" stroke-width="${1.6 - i * 0.15}"/>`);
    ch.frets.forEach((f, i) => {
      const x = x0 + i * sx;
      if (f === -1) s.push(`<text x="${x}" y="${y0 - 10}" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".5">×</text>`);
      if (f === 0) s.push(`<circle cx="${x}" cy="${y0 - 14}" r="3.6" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.3"/>`);
    });
    if (ch.barre) {
      const b = ch.barre;
      s.push(`<rect x="${x0 + b.from * sx - 8}" y="${y0 + (b.fret - 0.5) * sy - 8}" width="${(b.to - b.from) * sx + 16}" height="16" rx="8" fill="var(--accent)"/>`);
    }
    ch.frets.forEach((f, i) => {
      if (f > 0 && !(ch.barre && f === ch.barre.fret && ch.fingers[i] === 1)) {
        const x = x0 + i * sx, y = y0 + (f - 0.5) * sy;
        s.push(`<circle cx="${x}" cy="${y}" r="8.5" fill="var(--accent)"/>`);
        if (opt.fingers !== false) s.push(`<text x="${x}" y="${y + 3.8}" text-anchor="middle" font-size="10.5" font-weight="600" style="fill:#fff">${ch.fingers[i]}</text>`);
      }
    });
    s.push(`</svg>`);
    return s.join("");
  }

  // ----- zvuk: Karplus-Strong (drnknutá struna), vygeneruje se jednou na každou výšku tónu -----
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  let ctx = null, master = null;
  const cache = new Map();
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const body = ctx.createBiquadFilter();
      body.type = "peaking"; body.frequency.value = 180; body.Q.value = 1.1; body.gain.value = 5;
      const top = ctx.createBiquadFilter();
      top.type = "lowpass"; top.frequency.value = 5200;
      master.connect(body).connect(top).connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function buffer(midi) {
    if (cache.has(midi)) return cache.get(midi);
    const sr = ctx.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12), n = Math.round(sr / f);
    const len = Math.floor(sr * 3), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (let k = 0; k < 2; k++) for (let i = 1; i < n; i++) d[i] = (d[i] + d[i - 1]) / 2;
    const decay = 0.9965 + Math.min(0.0025, (60 - midi) * 0.0001);
    for (let i = n; i < len; i++) d[i] = decay * 0.5 * (d[i - n] + d[i - n - 1]);
    cache.set(midi, b);
    return b;
  }
  function pluck(string, fret, when = 0, vel = 1) {
    if (fret < 0) return;
    ensure();
    const src = ctx.createBufferSource(), g = ctx.createGain(), t = Math.max(ctx.currentTime, when || ctx.currentTime);
    src.buffer = buffer(OPEN_MIDI[string] + fret);
    g.gain.setValueAtTime(0.32 * vel, t);
    g.gain.setTargetAtTime(0, t + 2.2, 0.25);
    src.connect(g).connect(master);
    src.start(t);
    src.stop(t + 3);
  }
  // dir: "down" od basu k výšce, "up" opačně (jen horní struny). Vrací [struna, za kolik sekund zazní] pro animaci.
  function strum(ch, opt = {}) {
    ensure();
    const when = opt.when || ctx.currentTime + 0.01, spread = opt.spread ?? 0.028, vel = opt.vel ?? 1;
    const order = [0, 1, 2, 3, 4, 5];
    if (opt.dir === "up") order.reverse();
    const times = [];
    let k = 0;
    for (const i of order) {
      if (ch.frets[i] < 0) continue;
      if (opt.dir === "up" && k > 3) break;
      const t = when + k * spread;
      pluck(i, ch.frets[i], t, vel * (opt.dir === "up" ? 0.7 : 1));
      times.push([i, t - ctx.currentTime]);
      k++;
    }
    return times;
  }
  function click(when, accent) {
    ensure();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = when || ctx.currentTime;
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.15, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.06);
  }

  // Přesné načasování dob: zvuk se plánuje dopředu v Web Audio, obraz dostane callback ve chvíli, kdy doba zazní.
  // onBeat(n, when) plánuje zvuk, onShow(n) kreslí. bpm se dá měnit za běhu přes vrácené setBpm.
  function loop({ bpm, onBeat, onShow }) {
    ensure();
    let next = ctx.currentTime + 0.12, n = 0, tempo = bpm, alive = true;
    const timers = new Set();
    const tick = () => {
      while (alive && next < ctx.currentTime + 0.15) {
        const beat = n, when = next;
        onBeat && onBeat(beat, when);
        const t = setTimeout(() => { timers.delete(t); alive && onShow && onShow(beat); }, Math.max(0, (when - ctx.currentTime) * 1000));
        timers.add(t);
        next += 60 / tempo;
        n++;
      }
    };
    tick();
    const iv = setInterval(tick, 25);
    return {
      stop() { alive = false; clearInterval(iv); timers.forEach(clearTimeout); },
      setBpm(b) { tempo = b; },
    };
  }

  // Přepínač motivu jen pro náhled (systém / světlý / tmavý).
  function themeToggle() {
    const b = document.querySelector("[data-theme-toggle]");
    if (!b) return;
    const order = ["auto", "light", "dark"], label = { auto: "Motiv: systém", light: "Motiv: světlý", dark: "Motiv: tmavý" };
    let i = 0;
    b.textContent = label.auto;
    b.addEventListener("click", () => {
      i = (i + 1) % 3;
      const m = order[i];
      if (m === "auto") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", m);
      b.textContent = label[m];
    });
  }
  document.addEventListener("DOMContentLoaded", themeToggle);

  window.Akordy = { CHORDS: C, byId, GROUPS, box, pluck, strum, click, ensure, loop, time: () => (ctx ? ctx.currentTime : 0) };
})();
