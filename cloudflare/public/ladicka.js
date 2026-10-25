// Ladička: mikrofon → odhad výšky tónu (YIN) → nejbližší struna standardního ladění a odchylka v centech.
// Zvuk z mikrofonu se zpracovává jen v prohlížeči, nikam se neposílá. Klik na kolíček zahraje referenční tón.
(() => {
  const root = document.getElementById("ladicka-app");
  if (!root) return;
  const $ = (id) => document.getElementById(id);

  // Standardní ladění, od nejhlubší struny. side/y: kde je kolíček na fotce hlavy LL16 (y v % výšky fotky).
  const STRINGS = [
    { name: "E", label: "E", octave: 2, midi: 40, side: "l", y: 54.7 },
    { name: "A", label: "A", octave: 2, midi: 45, side: "l", y: 37.5 },
    { name: "D", label: "D", octave: 3, midi: 50, side: "l", y: 20.3 },
    { name: "G", label: "G", octave: 3, midi: 55, side: "r", y: 19 },
    { name: "H", label: "H", octave: 3, midi: 59, side: "r", y: 36.2 },
    { name: "e", label: "e", octave: 4, midi: 64, side: "r", y: 53.8 },
  ];
  const IN_TUNE = 5;          // centů, kdy je struna naladěná
  const HOLD_MS = 600;        // jak dlouho musí vydržet v toleranci, než dostane fajfku

  let a4 = 440;
  try { a4 = Math.min(450, Math.max(430, +localStorage.getItem("jtp-a4") || 440)); } catch (_) {}
  const target = (s) => a4 * Math.pow(2, (s.midi - 69) / 12);

  // ----- zvuk -----
  let ctx = null;
  function audio() {
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = "play-and-record"; } catch (_) {}
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // Referenční tón: drnknutá struna (Karplus-Strong) přesně na cílové frekvenci.
  function pluck(freq) {
    audio();
    const sr = ctx.sampleRate, n = Math.round(sr / freq), len = Math.floor(sr * 2.5);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (let k = 0; k < 2; k++) for (let i = 1; i < n; i++) d[i] = (d[i] + d[i - 1]) / 2;
    d[n] = 0.997 * d[0];
    for (let i = n + 1; i < len; i++) d[i] = 0.997 * 0.5 * (d[i - n] + d[i - n - 1]);
    // celé číslo n tón mírně rozladí; playbackRate to dorovná na přesnou frekvenci
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b;
    src.playbackRate.value = (n * freq) / sr;
    g.gain.value = 0.35;
    src.connect(g).connect(ctx.destination);
    src.start();
  }

  // ----- odhad výšky tónu (YIN) -----
  function detect(buf, sr) {
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.008) return { f: -1, rms };
    const maxTau = Math.min(Math.floor(sr / 60), buf.length >> 1), minTau = Math.floor(sr / 1000), W = buf.length - maxTau;
    const d = new Float32Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; sum += x * x; }
      d[tau] = sum;
    }
    // normalizovaný rozdíl; první hluboké minimum je perioda základního tónu
    let run = 0;
    d[0] = 1;
    for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; d[tau] = run ? (d[tau] * tau) / run : 1; }
    let tau = -1;
    for (let t = minTau; t <= maxTau; t++) {
      if (d[t] < 0.12) { while (t + 1 <= maxTau && d[t + 1] < d[t]) t++; tau = t; break; }
    }
    if (tau < 0) return { f: -1, rms };
    // jemné dorovnání mezi vzorky (parabola přes tři body)
    const a = d[tau - 1] ?? d[tau], b = d[tau], c = d[tau + 1] ?? d[tau], den = a - 2 * b + c;
    const shift = den ? (a - c) / (2 * den) : 0;
    return { f: sr / (tau + shift), rms };
  }

  // ----- obrazovka -----
  const pegs = $("lt-pegs");
  pegs.innerHTML = STRINGS.map((s, i) => `<button class="lt-peg lt-${s.side}" type="button" data-i="${i}" style="top:${s.y}%" aria-label="Struna ${s.label}, zahrát tón">${s.label}<span class="lt-ok" aria-hidden="true">✓</span></button>`).join("");

  let locked = null;          // ruční volba struny, null = automaticky
  let listening = false, stream = null, analyser = null, timer = 0;
  const tunedSince = new Map(), tuned = new Set();
  const recent = [];
  let lastHeard = 0;

  function setA4(v) {
    a4 = Math.min(450, Math.max(430, v));
    try { localStorage.setItem("jtp-a4", a4); } catch (_) {}
    $("lt-a4").textContent = `${a4} Hz`;
    tuned.clear(); tunedSince.clear();
    renderPegs(null);
  }
  function renderPegs(active) {
    pegs.querySelectorAll(".lt-peg").forEach((b, i) => {
      b.classList.toggle("is-active", i === active);
      b.classList.toggle("is-locked", i === locked);
      b.classList.toggle("is-tuned", tuned.has(i));
    });
    $("lt-auto").setAttribute("aria-pressed", locked === null);
  }
  function showReading(f) {
    const i = locked ?? STRINGS.reduce((best, s, k) => (Math.abs(Math.log2(f / target(s))) < Math.abs(Math.log2(f / target(STRINGS[best]))) ? k : best), 0);
    const s = STRINGS[i], cents = 1200 * Math.log2(f / target(s));
    const c = Math.max(-50, Math.min(50, cents)), ok = Math.abs(cents) < IN_TUNE;
    $("lt-note").textContent = s.name;
    $("lt-oct").textContent = s.octave;
    $("lt-hz").textContent = `${f.toFixed(1)} Hz · cíl ${target(s).toFixed(1)} Hz`;
    $("lt-cents").textContent = Math.abs(cents) > 50 ? `víc než půl tónu ${cents > 0 ? "vysoko" : "nízko"}` : `${cents > 0 ? "+" : ""}${Math.round(cents)} centů`;
    $("lt-needle").style.transform = `rotate(${c * 1.2}deg)`;
    root.classList.toggle("is-ok", ok);
    root.classList.toggle("is-off", !ok);
    $("lt-say").textContent = ok ? "Naladěno" : cents < 0 ? "Moc nízko, přitáhni" : "Moc vysoko, povol";
    const now = performance.now();
    if (ok) {
      if (!tunedSince.has(i)) tunedSince.set(i, now);
      if (now - tunedSince.get(i) > HOLD_MS) tuned.add(i);
    } else tunedSince.delete(i);
    renderPegs(i);
  }
  function idle(text) {
    root.classList.remove("is-ok", "is-off");
    $("lt-say").textContent = text;
  }

  const buf = new Float32Array(4096);
  // Měří se 20× za vteřinu přes časovač (requestAnimationFrame by na pozadí stál).
  function frame() {
    analyser.getFloatTimeDomainData(buf);
    const { f } = detect(buf, ctx.sampleRate);
    const now = performance.now();
    if (f > 0) {
      recent.push(f);
      if (recent.length > 5) recent.shift();
      lastHeard = now;
      const sorted = [...recent].sort((x, y) => x - y);
      showReading(sorted[sorted.length >> 1]);
    } else if (now - lastHeard > 400) {
      recent.length = 0;
      root.classList.add("is-quiet");
      if (now - lastHeard > 1500) idle(locked === null ? "Brnkni na kteroukoli strunu" : `Brnkni na strunu ${STRINGS[locked].label}`);
    }
    if (f > 0) root.classList.remove("is-quiet");
  }

  async function start() {
    audio();
    $("lt-mic").disabled = true;
    idle("Čekám na povolení mikrofonu…");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      $("lt-mic").disabled = false;
      idle("Bez mikrofonu to nepůjde. Povol ho v prohlížeči a zkus to znovu.");
      return;
    }
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    src.connect(analyser);
    listening = true;
    root.classList.add("is-on");
    $("lt-mic").disabled = false;
    $("lt-mic").textContent = "Vypnout ladičku";
    idle("Brnkni na kteroukoli strunu");
    lastHeard = performance.now();
    timer = setInterval(frame, 50);
  }
  function stop() {
    clearInterval(timer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; listening = false;
    root.classList.remove("is-on", "is-quiet");
    $("lt-mic").textContent = "Zapnout ladičku";
    $("lt-needle").style.transform = "rotate(0deg)";
    $("lt-note").textContent = "–"; $("lt-oct").textContent = ""; $("lt-cents").textContent = ""; $("lt-hz").textContent = "";
    idle("Ladička čeká. Zapni ji a povol mikrofon.");
    renderPegs(null);
  }

  $("lt-mic").onclick = () => (listening ? stop() : start());
  pegs.addEventListener("click", (e) => {
    const b = e.target.closest(".lt-peg");
    if (!b) return;
    const i = +b.dataset.i;
    pluck(target(STRINGS[i]));
    if (listening) { locked = locked === i ? null : i; recent.length = 0; }
    renderPegs(null);
  });
  $("lt-auto").onclick = () => { locked = null; renderPegs(null); };
  $("lt-down").onclick = () => setA4(a4 - 1);
  $("lt-up").onclick = () => setA4(a4 + 1);
  document.addEventListener("visibilitychange", () => { if (document.hidden && listening) stop(); });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("lt-mic").disabled = true;
    idle("Tenhle prohlížeč nepustí stránku k mikrofonu. Zkus Safari nebo Chrome.");
  }
  setA4(a4);
})();
