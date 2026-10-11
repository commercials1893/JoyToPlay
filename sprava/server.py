"""Místní správa Joy To Play: zobrazí web a umí přidat / odebrat video ve videos.json.

Spuštění: dvojklik na "Spravovat videa.command" v hlavní složce webu.
Běží jen na tomhle počítači (127.0.0.1). Složku sprava/ na hosting nenahrávej.
"""

import datetime
import functools
import http.server
import json
import re
import sys
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

PORT = 8765
ROOT = Path(__file__).resolve().parent.parent
VIDEOS = ROOT / "videos.json"
ALLOWED_ORIGINS = {f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"}
CATEGORIES = {"start", "three", "fingerstyle", "cash", "kryl"}
ID_RE = re.compile(r"^[\w-]{11}$")


def youtube_id(url):
    parsed = urllib.parse.urlparse(url.strip())
    host = parsed.netloc.lower().replace("www.", "").replace("m.", "")
    if host == "youtu.be":
        candidate = parsed.path.strip("/").split("/")[0]
    elif host in ("youtube.com", "youtube-nocookie.com"):
        query = urllib.parse.parse_qs(parsed.query)
        if "v" in query:
            candidate = query["v"][0]
        else:
            parts = parsed.path.strip("/").split("/")
            candidate = parts[1] if len(parts) > 1 and parts[0] in ("shorts", "embed", "live") else ""
    else:
        candidate = ""
    return candidate if ID_RE.match(candidate) else ""


def read_videos():
    return json.loads(VIDEOS.read_text(encoding="utf-8"))


def write_videos(videos):
    VIDEOS.write_text(json.dumps(videos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_video(data, existing):
    """Ověří data z formuláře a vrátí (video, chyba)."""
    vid = youtube_id(str(data.get("youtube", "")))
    if not vid:
        return None, "Tohle nevypadá jako odkaz na YouTube video."
    if any(v.get("id") == vid for v in existing):
        return None, "Tohle video už v seznamu je."
    text = {k: str(data.get(k, "")).strip() for k in ("title", "song", "channel", "time", "comment")}
    missing = [k for k, v in text.items() if not v]
    if missing:
        return None, "Chybí: " + ", ".join(missing)
    try:
        difficulty = int(data.get("difficulty"))
    except (TypeError, ValueError):
        difficulty = 0
    if not 1 <= difficulty <= 5:
        return None, "Obtížnost musí být 1 až 5."
    categories = [c for c in data.get("categories", []) if c in CATEGORIES]
    top = bool(data.get("top"))
    if not categories and not top:
        return None, "Vyber aspoň jednu sekci."
    return {
        "id": vid,
        "title": text["title"],
        "song": text["song"],
        "youtube": f"https://www.youtube.com/watch?v={vid}",
        "channel": text["channel"],
        "difficulty": difficulty,
        "time": text["time"],
        "categories": categories,
        "featured": False,
        "top": top,
        "comment": text["comment"],
        "added": datetime.datetime.now().isoformat(timespec="seconds"),
    }, None


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def allowed(self):
        # Zápis jen ze stránky správy, ne z cizího webu otevřeného ve stejném prohlížeči.
        if self.headers.get("Origin") in ALLOWED_ORIGINS:
            return True
        self.send_json(403, {"error": "Zápis je povolený jen ze stránky správy."})
        return False

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/info":
            return super().do_GET()
        url = urllib.parse.parse_qs(parsed.query).get("url", [""])[0]
        vid = youtube_id(url)
        if not vid:
            return self.send_json(400, {"error": "Tohle nevypadá jako odkaz na YouTube video."})
        info = {"id": vid, "title": "", "channel": "", "exists": any(v.get("id") == vid for v in read_videos())}
        try:
            oembed = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
                f"https://www.youtube.com/watch?v={vid}", safe=""
            )
            with urllib.request.urlopen(oembed, timeout=6) as res:
                meta = json.load(res)
            info["title"] = meta.get("title", "")
            info["channel"] = meta.get("author_name", "")
        except Exception:
            pass  # bez internetu se název a kanál vyplní ručně
        self.send_json(200, info)

    def do_POST(self):
        if self.path != "/api/videos":
            return self.send_json(404, {"error": "Nenalezeno."})
        if not self.allowed():
            return
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        except ValueError:
            return self.send_json(400, {"error": "Neplatná data."})
        videos = read_videos()
        video, error = build_video(data, videos)
        if error:
            return self.send_json(400, {"error": error})
        videos.append(video)
        write_videos(videos)
        self.send_json(201, video)

    def do_DELETE(self):
        if not self.path.startswith("/api/videos/"):
            return self.send_json(404, {"error": "Nenalezeno."})
        if not self.allowed():
            return
        vid = self.path.rsplit("/", 1)[1]
        videos = read_videos()
        kept = [v for v in videos if v.get("id") != vid]
        if len(kept) == len(videos):
            return self.send_json(404, {"error": "Video v seznamu není."})
        write_videos(kept)
        self.send_json(200, {"removed": vid})


def main():
    handler = functools.partial(Handler, directory=str(ROOT))
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    except OSError:
        # Správa už běží (třeba z dřívějšího dvojkliku), stačí ji otevřít.
        print("Správa už běží, otevírám ji v prohlížeči.")
        webbrowser.open(f"http://localhost:{PORT}/sprava/")
        return
    print(f"Joy To Play běží na http://localhost:{PORT}")
    print(f"Správa videí:   http://localhost:{PORT}/sprava/")
    print("Ukončíš zavřením tohoto okna nebo Ctrl+C.")
    if "--no-open" not in sys.argv:
        webbrowser.open(f"http://localhost:{PORT}/sprava/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
