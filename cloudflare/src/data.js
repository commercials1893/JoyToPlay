// Čtení dat webu z D1. Veřejný web vidí jen publikovaná videa.

export async function loadSite(db) {
  const [videos, links, categories, songs, sections, channels] = await db.batch([
    db.prepare("SELECT * FROM videos WHERE status = 'published' ORDER BY sort, id"),
    db.prepare("SELECT vc.video_id, c.key FROM video_categories vc JOIN categories c ON c.id = vc.category_id ORDER BY c.sort"),
    db.prepare("SELECT * FROM categories ORDER BY sort, id"),
    db.prepare("SELECT s.*, v.slug AS video_slug FROM songs s LEFT JOIN videos v ON v.id = s.video_id AND v.status = 'published'"),
    db.prepare("SELECT * FROM sections ORDER BY sort, id"),
    db.prepare("SELECT * FROM channels ORDER BY sort, id"),
  ]);
  const cats = new Map();
  for (const { video_id, key } of links.results) cats.set(video_id, [...(cats.get(video_id) || []), key]);
  return {
    videos: videos.results.map((v) => ({ ...v, categories: cats.get(v.id) || [] })),
    categories: categories.results,
    songs: songs.results,
    sections: sections.results,
    channels: channels.results,
  };
}

export async function loadVideo(db, slug) {
  const video = await db.prepare("SELECT * FROM videos WHERE slug = ? AND status = 'published'").bind(slug).first();
  if (!video) return null;
  const [cats, songs, related] = await db.batch([
    db.prepare("SELECT c.key, c.label FROM video_categories vc JOIN categories c ON c.id = vc.category_id WHERE vc.video_id = ? ORDER BY c.sort").bind(video.id),
    db.prepare("SELECT * FROM songs WHERE video_id = ? ORDER BY song").bind(video.id),
    // Podobná videa: nejdřív ze stejné kategorie, pak nejnovější.
    db.prepare(`SELECT v.*, (SELECT count(*) FROM video_categories a JOIN video_categories b ON a.category_id = b.category_id
                 WHERE a.video_id = v.id AND b.video_id = ?1) AS shared
               FROM videos v WHERE v.status = 'published' AND v.id != ?1
               ORDER BY shared DESC, COALESCE(v.added, '') DESC, v.sort DESC LIMIT 2`).bind(video.id),
  ]);
  return { video, categories: cats.results, songs: songs.results, related: related.results };
}

export async function loadSong(db, slug) {
  const song = await db.prepare("SELECT * FROM songs WHERE slug = ?").bind(slug).first();
  if (!song) return null;
  const [video, others] = await db.batch([
    db.prepare("SELECT * FROM videos WHERE id = ? AND status = 'published'").bind(song.video_id),
    db.prepare("SELECT slug, song FROM songs WHERE artist = ? AND id != ? ORDER BY song").bind(song.artist, song.id),
  ]);
  return { song, video: video.results[0] || null, others: others.results };
}

export async function loadSitemap(db) {
  const [videos, songs] = await db.batch([
    db.prepare("SELECT slug, added FROM videos WHERE status = 'published' ORDER BY id"),
    db.prepare("SELECT slug FROM songs ORDER BY id"),
  ]);
  return { videos: videos.results, songs: songs.results };
}
