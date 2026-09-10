import hashlib
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin


class ContentParser(HTMLParser):
    def __init__(self, page_url: str):
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.skip_depth = 0
        self.title_depth = 0
        self.heading = None
        self.anchor = None
        self.text_parts = []
        self.title_parts = []
        self.headings = []
        self.links = []
        self.images = []
        self.forms = []
        self.current_form = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style", "svg", "noscript", "template"}:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag == "title":
            self.title_depth += 1
        if tag in {"h1", "h2", "h3"}:
            self.heading = {"level": int(tag[1]), "parts": []}
        if tag == "a" and attrs.get("href"):
            self.anchor = {"href": urljoin(self.page_url, html.unescape(attrs["href"])), "parts": []}
        if tag == "img" and (attrs.get("src") or attrs.get("srcset")):
            self.images.append({
                "src": urljoin(self.page_url, attrs.get("src") or attrs.get("srcset", "").split()[0]),
                "alt": attrs.get("alt", ""),
                "width": attrs.get("width"),
                "height": attrs.get("height"),
            })
        if tag == "form":
            self.current_form = {"action": urljoin(self.page_url, attrs.get("action", "")), "method": attrs.get("method", "get"), "fields": []}
            self.forms.append(self.current_form)
        if self.current_form is not None and tag in {"input", "select", "textarea", "button"}:
            self.current_form["fields"].append({
                "tag": tag,
                "type": attrs.get("type"),
                "name": attrs.get("name"),
                "label": attrs.get("aria-label") or attrs.get("placeholder"),
            })

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "noscript", "template"} and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth:
            return
        if tag == "title" and self.title_depth:
            self.title_depth -= 1
        if tag in {"h1", "h2", "h3"} and self.heading:
            text = clean(" ".join(self.heading["parts"]))
            if text:
                self.headings.append({"level": self.heading["level"], "text": text})
            self.heading = None
        if tag == "a" and self.anchor:
            self.links.append({"href": self.anchor["href"], "text": clean(" ".join(self.anchor["parts"]))})
            self.anchor = None
        if tag == "form":
            self.current_form = None

    def handle_data(self, data):
        if self.skip_depth:
            return
        value = clean(data)
        if not value:
            return
        self.text_parts.append(value)
        if self.title_depth:
            self.title_parts.append(value)
        if self.heading:
            self.heading["parts"].append(value)
        if self.anchor:
            self.anchor["parts"].append(value)


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


manifest_path = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/source-capture/2026-09-10-r2/manifest.json").resolve()
output_root = Path(sys.argv[2] if len(sys.argv) > 2 else "evidence/source-content-2026-09-10").resolve()
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
capture_root = manifest_path.parent
pages = []

for record in manifest["records"]:
    if record.get("status") != 200 or not str(record.get("contentType", "")).startswith("text/html"):
        continue
    if "www.btcsd.org" not in record.get("url", ""):
        continue
    source = capture_root / Path(record["localPath"])
    raw = source.read_text(encoding="utf-8", errors="replace")
    parser = ContentParser(record["url"])
    parser.feed(raw)
    unique_text = []
    for part in parser.text_parts:
        if not unique_text or part != unique_text[-1]:
            unique_text.append(part)
    page = {
        "url": record["url"],
        "title": clean(" ".join(parser.title_parts)),
        "sourcePath": str(source),
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "headings": parser.headings,
        "text": "\n".join(unique_text),
        "links": parser.links,
        "images": parser.images,
        "forms": parser.forms,
    }
    pages.append(page)

output_root.mkdir(parents=True, exist_ok=True)
payload = {"schemaVersion": 1, "sourceManifest": str(manifest_path), "pages": pages}
(output_root / "pages.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

lines = ["# btcsd.org rendered public content capture", "", f"Pages: {len(pages)}", ""]
for page in pages:
    lines.extend([f"## {page['title'] or page['url']}", "", f"Source: {page['url']}", "", "```text", page["text"].replace("```", "'''"), "```", ""])
(output_root / "rendered-content.md").write_text("\n".join(lines), encoding="utf-8")

summary = {
    "pages": len(pages),
    "headings": sum(len(page["headings"]) for page in pages),
    "links": sum(len(page["links"]) for page in pages),
    "images": sum(len(page["images"]) for page in pages),
    "forms": sum(len(page["forms"]) for page in pages),
    "textCharacters": sum(len(page["text"]) for page in pages),
}
(output_root / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(json.dumps(summary, indent=2))
