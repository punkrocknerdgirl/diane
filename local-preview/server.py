#!/usr/bin/env python3
"""Dependency-free, localhost-only preview server for the Diane review UI."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
APPS_SCRIPT = ROOT / "apps-script"
INDEX = APPS_SCRIPT / "Index.html"
STYLES = APPS_SCRIPT / "Stylesheet.html"
PREVIEW_SCRIPT = Path(__file__).resolve().with_name("preview.js")
STYLE_DIRECTIVE = "<?!= include('Stylesheet'); ?>"
SCRIPT_DIRECTIVE = "<?!= include('JavaScript'); ?>"


def assemble_page():
    index = INDEX.read_text(encoding="utf-8")
    styles = STYLES.read_text(encoding="utf-8")
    preview_name = PREVIEW_SCRIPT.name
    style_count = index.count(STYLE_DIRECTIVE)
    script_count = index.count(SCRIPT_DIRECTIVE)
    if style_count != 1 or script_count != 1:
        raise RuntimeError(
            "Refusing to serve: expected exactly one Stylesheet include and one "
            "JavaScript include in apps-script/Index.html "
            f"(found Stylesheet={style_count}, JavaScript={script_count})."
        )
    if not styles.lstrip().startswith("<style"):
        raise RuntimeError("Refusing to serve: apps-script/Stylesheet.html is not a stylesheet fragment.")
    page = index.replace(STYLE_DIRECTIVE, styles, 1).replace(
        SCRIPT_DIRECTIVE, f'<script src="/preview.js"></script>', 1
    )
    if SCRIPT_DIRECTIVE in page or "JavaScript.html" in page:
        raise RuntimeError("Refusing to serve: production JavaScript include remains unresolved.")
    return page.encode("utf-8")


class PreviewHandler(BaseHTTPRequestHandler):
    def _send(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            try:
                self._send(200, assemble_page(), "text/html; charset=utf-8")
            except (OSError, RuntimeError) as exc:
                self._send(500, f"Local preview refused to serve the page: {exc}\n".encode(), "text/plain; charset=utf-8")
            return
        if path == "/preview.js":
            try:
                self._send(200, PREVIEW_SCRIPT.read_bytes(), "text/javascript; charset=utf-8")
            except OSError as exc:
                self._send(500, f"Local preview script unavailable: {exc}\n".encode(), "text/plain; charset=utf-8")
            return
        self._send(404, b"Not found\n", "text/plain; charset=utf-8")

    def log_message(self, fmt, *args):
        print(f"[local-preview] {self.address_string()} - {fmt % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), PreviewHandler)
    print("Diane local preview: http://127.0.0.1:8000/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
