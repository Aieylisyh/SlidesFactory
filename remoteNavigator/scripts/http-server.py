#!/usr/bin/env python3
"""
Static HTTP server with /remoteNavigator/r/{ROOM} route for WeChat-safe QR links.
WeChat often strips ?query and #hash; path-based room codes survive scanning.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
REMOTE_DIR = ROOT / "remoteNavigator"
REMOTE_HTML = REMOTE_DIR / "remote.html"
ROOM_PATH_RES = [
    re.compile(r"^/r/([A-Za-z0-9]{4,8})/?$"),
    re.compile(r"^/remoteNavigator/r/([A-Za-z0-9]{4,8})/?$"),
]
SUMMERSCHOOL_ROOM_RE = re.compile(r"^/summerschool/r/([A-Za-z0-9]{4,8})/?$")
REMOTE_PROFILES = {
    "default": "deck-nav.json",
    "summerschool": "deck-nav-summerschool.json",
}


class DeckHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

    def end_headers(self) -> None:
        path = unquote(self.path.split("?", 1)[0])
        if path.endswith((".html", ".json", ".js", ".css")) or "/remoteNavigator/r/" in path:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_GET(self) -> None:
        path = unquote(self.path.split("?", 1)[0])
        ss_match = SUMMERSCHOOL_ROOM_RE.match(path)
        if ss_match:
            self.serve_remote_with_room(ss_match.group(1).upper(), REMOTE_PROFILES["summerschool"])
            return
        for pattern in ROOM_PATH_RES:
            match = pattern.match(path)
            if match:
                self.serve_remote_with_room(match.group(1).upper(), REMOTE_PROFILES["default"])
                return
        super().do_GET()

    def serve_remote_with_room(self, room: str, nav_file: str = "deck-nav.json") -> None:
        if not REMOTE_HTML.is_file():
            self.send_error(404, "remote.html not found")
            return

        html = REMOTE_HTML.read_text(encoding="utf-8")
        inject = (
            '<base href="/remoteNavigator/">'
            '<script>window.__REMOTE_ROOM="' + room + '";'
            'window.__REMOTE_NAV="' + nav_file + '";</script>'
        )
        if "<head>" in html:
            html = html.replace("<head>", "<head>" + inject, 1)
        else:
            html = inject + html

        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Deck static server with remote room routes")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bind", default="0.0.0.0")
    args = parser.parse_args()

    os.chdir(ROOT)
    server = ThreadingHTTPServer((args.bind, args.port), DeckHTTPRequestHandler)
    print("[http-server] root: %s" % ROOT, flush=True)
    print("[http-server] listening on http://%s:%s" % (args.bind, args.port), flush=True)
    print("[http-server] remote room URL: /r/{ROOM}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[http-server] stopped", flush=True)


if __name__ == "__main__":
    main()
