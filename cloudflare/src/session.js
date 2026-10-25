// Přihlášení do /admin heslem. Heslo je tajný klíč Workeru ADMIN_PASSWORD (Cloudflare ho drží zašifrovaně, v kódu není).
// Po přihlášení dostane prohlížeč podepsanou cookie na 30 dní. Změna hesla odhlásí všechna zařízení.

const COOKIE = "jtp_admin";
const DAYS = 30;
// Omezení pokusů: z jedné adresy 5 špatných hesel za 15 minut, celkem 30 za hodinu.
const PER_IP = 5;
const PER_IP_WINDOW = 15 * 60;
const TOTAL = 30;
const TOTAL_WINDOW = 60 * 60;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

// Porovnání v konstantním čase přes HMAC obou hodnot, aby délka shody neprozradila nic o heslu.
async function same(a, b, secret) {
  const [x, y] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

const sessionKey = (env) => `session:${env.ADMIN_PASSWORD}`;

export const loginConfigured = (env) => Boolean(env.ADMIN_PASSWORD) || env.DEV_ADMIN === "1";

// True, když požadavek nese platnou cookie. Bez hesla je admin zavřený, kromě místního vývoje (.dev.vars).
export async function isLoggedIn(request, env) {
  if (!env.ADMIN_PASSWORD) return env.DEV_ADMIN === "1";
  const cookie = request.headers.get("Cookie") || "";
  const value = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1] || "";
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return same(sig, await hmac(sessionKey(env), exp), sessionKey(env));
}

export async function sessionCookie(env) {
  const exp = String(Math.floor(Date.now() / 1000) + DAYS * 86400);
  const sig = await hmac(sessionKey(env), exp);
  return `${COOKIE}=${exp}.${sig}; Path=/admin; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`;
}

export const logoutCookie = () => `${COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

// Vrátí "ok", "wrong" nebo "blocked" (moc špatných pokusů).
export async function checkPassword(password, ip, env) {
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  const counts = await db
    .prepare("SELECT sum(ip = ?1 AND at > ?2) AS mine, sum(at > ?3) AS total FROM login_attempts")
    .bind(ip, now - PER_IP_WINDOW, now - TOTAL_WINDOW)
    .first();
  if ((counts.mine || 0) >= PER_IP || (counts.total || 0) >= TOTAL) return "blocked";
  if (env.ADMIN_PASSWORD && (await same(password, env.ADMIN_PASSWORD, sessionKey(env)))) {
    await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
    return "ok";
  }
  await db.batch([
    db.prepare("INSERT INTO login_attempts (ip, at) VALUES (?, ?)").bind(ip, now),
    db.prepare("DELETE FROM login_attempts WHERE at < ?").bind(now - TOTAL_WINDOW),
  ]);
  return "wrong";
}
