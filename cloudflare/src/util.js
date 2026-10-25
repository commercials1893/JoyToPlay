// Drobnosti sdílené webem, adminem i převodním skriptem.

export const plain = (text) => String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const slugify = (text) =>
  plain(text).replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "polozka";

export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// YouTube ID z běžných tvarů odkazu (watch?v=, youtu.be, shorts, embed, live).
export function youtubeId(url) {
  if (/^[\w-]{11}$/.test(String(url).trim())) return String(url).trim();
  try {
    const u = new URL(String(url).trim());
    const host = u.hostname.replace(/^(www|m)\./, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") || "";
      const parts = u.pathname.split("/").filter(Boolean);
      if (!id && ["shorts", "embed", "live"].includes(parts[0])) id = parts[1] || "";
    }
    return /^[\w-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}
