// Převod starých JSON souborů webu do SQL pro D1: node scripts/convert.mjs > data/seed.sql
// Facebook reely se nepřevádějí (nový web umí jen YouTube).
import { readFileSync } from "node:fs";
import { slugify } from "../src/util.js";

const videos = JSON.parse(readFileSync(new URL("../../videos.json", import.meta.url)));
const songs = JSON.parse(readFileSync(new URL("../../pisnicky.json", import.meta.url)));

const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`);
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(", ")}) VALUES (${Object.values(row).map(q).join(", ")});`;
const plain = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const unique = (base, used) => {
  let slug = base, n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  used.add(slug);
  return slug;
};

const out = [];
const categories = [
  ["start", "Začni dnes"], ["three", "3 akordy"], ["fingerstyle", "Fingerstyle"],
  ["cash", "Johnny Cash"], ["kryl", "Karel Kryl"],
];
const catId = new Map(categories.map(([key], i) => [key, i + 1]));
categories.forEach(([key, label], i) => out.push(insert("categories", { id: i + 1, key, label, sort: (i + 1) * 10 })));

const youtube = videos.filter((v) => v.youtube);
const artistOf = new Map(songs.map((s) => [plain(s.song), s.artist]));
const videoSlugs = new Set();
const videoBySong = new Map();
youtube.forEach((v, i) => {
  const id = i + 1;
  const artist = artistOf.get(plain(v.song)) ?? null;
  videoBySong.set(plain(v.song), id);
  out.push(insert("videos", {
    id, slug: unique(slugify(v.song), videoSlugs), title: v.title, song: v.song, artist,
    youtube_id: v.id, channel: v.channel, difficulty: v.difficulty, time: v.time, comment: v.comment,
    featured: v.featured ? 1 : 0, top: v.top ? 1 : 0, added: v.added ?? null, sort: id, status: "published",
  }));
  v.categories.forEach((key) => out.push(insert("video_categories", { video_id: id, category_id: catId.get(key) })));
});

const songSlugs = new Set();
songs.forEach((s, i) => out.push(insert("songs", {
  id: i + 1, slug: unique(slugify(`${s.artist} ${s.song}`), songSlugs), artist: s.artist, song: s.song,
  chords_url: s.url, note: s.note || "", video_id: videoBySong.get(plain(s.song)) ?? null,
})));

[
  ["Začni dnes", "Dnes se něco naučíš. Dnes si něco zahraješ.", "start"],
  ["3 akordy a hotovo", "Tři akordy, a už to zní jako písnička. Nejmíň dřiny, nejvíc radosti.", "three"],
  ["Fingerstyle, co se dá zvládnout", "Vybrnkávání bez akrobacie. Věci, které opravdu použiješ.", "fingerstyle"],
  ["Johnny Cash", "Pár akordů a rytmus, který táhne. Na Cashovi se učí skvěle.", "cash"],
  ["Karel Kryl", "U Kryla začínala spousta z nás. Kytara a hlas, víc není potřeba.", "kryl"],
  ["Top objevy", "Pár videí, u kterých jsem si řekl: tohle musím ukázat dál.", "top"],
].forEach(([title, text, filter], i) => out.push(insert("sections", { id: i + 1, title, text, filter, sort: (i + 1) * 10 })));

[
  ["Andy Guitar", "https://www.youtube.com/@andyguitar", "Ideální pro začátečníky. Klid, pořádek, písničky hned."],
  ["Relax and Learn Guitar", "https://www.youtube.com/@relaxandlearnguitar", "Nádherné fingerstyle aranže. Bez honění se za rychlostí."],
  ["Kytary.cz", "https://www.youtube.com/@kytarycz", "Český základ. Nástroje, rady, srozumitelný jazyk."],
  ["Michaela Medek", "https://www.youtube.com/@michaelamedek", "České návody a příjemný přístup. Kryl, písničky, klid."],
].forEach(([name, url, text], i) => out.push(insert("channels", { id: i + 1, name, url, text, sort: (i + 1) * 10 })));

console.log(out.join("\n"));
console.error(`videí: ${youtube.length} (vynecháno reelů: ${videos.length - youtube.length}), písniček: ${songs.length}`);
