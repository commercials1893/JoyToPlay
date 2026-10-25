-- Joy To Play: data webu. Texty webu (úvod, O mně) zůstávají v kódu.

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,          -- použije se ve filtru (#videa, data-filter)
  label TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE videos (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,               -- nadpis komentáře TJ
  song TEXT NOT NULL,
  artist TEXT,
  youtube_id TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  time TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  top INTEGER NOT NULL DEFAULT 0,
  added TEXT,                        -- ISO datum přidání; starší videa bez data
  sort INTEGER NOT NULL DEFAULT 0,   -- pořadí ze starého videos.json
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden'))
);

CREATE TABLE video_categories (
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, category_id)
);

CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  artist TEXT NOT NULL,
  song TEXT NOT NULL,
  chords_url TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL
);

CREATE TABLE tips (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  why TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected')),
  video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL
);

-- Dlaždice v sekci „Kam se vydat“. filter = klíč kategorie, nebo 'top' / 'latest' / 'all'.
CREATE TABLE sections (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  filter TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE channels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX videos_status ON videos(status);
CREATE INDEX songs_video ON songs(video_id);
CREATE INDEX tips_status ON tips(status);
