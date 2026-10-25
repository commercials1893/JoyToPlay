// Diagnostika zvuku (jen s ?zvuk=diag): ukáže stav Web Audio a umí pípnout dvěma způsoby,
// ať jde v Safari poznat, jestli mlčí Web Audio, nebo celý zvuk stránky.
(() => {
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99;max-width:340px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.85);color:#fff;font:12px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap";
  const errs = [];
  window.addEventListener("error", (e) => errs.push(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => errs.push(String(e.reason)));
  const btn = (label, fn) => Object.assign(document.createElement("button"), { textContent: label, onclick: fn, style: "margin:6px 6px 0 0;font:inherit;padding:4px 8px;border-radius:8px;border:0;cursor:pointer" });
  const out = document.createElement("div");
  box.append(out,
    btn("Pípnout (Web Audio)", () => {
      const c = window.jtpAudio && window.jtpAudio();
      const ctx = c && c.state !== "closed" ? c : new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().catch((e) => errs.push("resume: " + e));
      const o = ctx.createOscillator(), g = ctx.createGain();
      g.gain.value = 0.2; o.frequency.value = 660; o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.4);
    }),
    btn("Pípnout (HTML audio)", () => {
      const sr = 22050, n = sr * 0.4, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
      const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * 440 * i) / sr) * 8000, true);
      new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" }))).play().catch((e) => errs.push("audio: " + e));
    }));
  document.body.append(box);
  setInterval(() => {
    const c = window.jtpAudio && window.jtpAudio();
    out.textContent = [
      `AudioContext: ${c ? c.state : "zatím není"}${c ? ` · ${c.sampleRate} Hz · ${c.currentTime.toFixed(1)} s` : ""}`,
      `audioSession: ${navigator.audioSession ? navigator.audioSession.type + " / " + navigator.audioSession.state : "není"}`,
      `prohlížeč: ${navigator.userAgent.replace(/^.*\) /, "").slice(0, 60)}`,
      errs.length ? `chyby: ${errs.slice(-3).join(" | ")}` : "chyby: žádné",
    ].join("\n");
  }, 400);
})();
