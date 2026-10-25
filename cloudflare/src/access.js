// Přihlášení do /admin přes Cloudflare Access. Access pustí dál jen Tomáše a přidá podepsaný token (JWT);
// Worker podpis ověří sám, takže admin nejde otevřít obejitím Access (např. z jiné adresy).

let certs = { team: "", keys: null, at: 0 };

async function publicKeys(team) {
  if (certs.team === team && certs.keys && Date.now() - certs.at < 3600_000) return certs.keys;
  const res = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  const { keys } = await res.json();
  const imported = new Map();
  for (const jwk of keys) {
    imported.set(jwk.kid, await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]));
  }
  certs = { team, keys: imported, at: Date.now() };
  return imported;
}

const b64url = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function tokenFrom(request) {
  const header = request.headers.get("Cf-Access-Jwt-Assertion");
  if (header) return header;
  const cookie = request.headers.get("Cookie") || "";
  return cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] || "";
}

// Vrátí e-mail přihlášeného, nebo null. Bez nastaveného Access je admin zavřený (kromě místního vývoje).
export async function adminUser(request, env) {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return env.DEV_ADMIN === "1" ? "vyvoj@localhost" : null;
  const token = tokenFrom(request);
  const [head, body, sig] = token.split(".");
  if (!sig) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(head)));
    const claims = JSON.parse(new TextDecoder().decode(b64url(body)));
    const key = (await publicKeys(env.ACCESS_TEAM)).get(header.kid);
    if (!key) return null;
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(sig), new TextEncoder().encode(`${head}.${body}`));
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const now = Date.now() / 1000;
    if (!ok || !aud.includes(env.ACCESS_AUD) || claims.exp < now || claims.iss !== `https://${env.ACCESS_TEAM}.cloudflareaccess.com`) return null;
    return claims.email || "přihlášený";
  } catch {
    return null;
  }
}
