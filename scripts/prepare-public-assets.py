import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit


def normalize_url(value: str) -> str:
    parts = urlsplit(value)
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, parts.query, ""))


def slug(value: str) -> str:
    value = unquote(value).rsplit("/", 1)[-1]
    stem = Path(value).stem
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")[:80] or "document"


manifest_path = Path(sys.argv[1] if len(sys.argv) > 1 else "evidence/source-capture/2026-09-10-r2/manifest.json").resolve()
content_path = Path(sys.argv[2] if len(sys.argv) > 2 else "evidence/source-content-2026-09-10/pages.json").resolve()
root = Path.cwd()
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
content = json.loads(content_path.read_text(encoding="utf-8"))
capture_root = manifest_path.parent
documents_root = root / "documents"
images_root = root / "assets" / "images"
data_root = root / "data"
for directory in (documents_root, images_root, data_root):
    directory.mkdir(parents=True, exist_ok=True)

link_refs = {}
for page in content["pages"]:
    for link in page.get("links", []):
        key = normalize_url(link["href"])
        info = link_refs.setdefault(key, {"titles": [], "pages": []})
        if link.get("text") and link["text"] not in info["titles"]:
            info["titles"].append(link["text"])
        if page["url"] not in info["pages"]:
            info["pages"].append(page["url"])

documents = []
title_overrides = {
    "08349b_e6b9db5719f64a00adcc772b80829831.pdf": "1967 New York Times Brooktrails Article",
}
used_names = set()
for record in manifest["records"]:
    content_type = str(record.get("contentType", "")).lower()
    if record.get("status") != 200 or not ("pdf" in content_type or "wordprocessingml" in content_type):
        continue
    refs = link_refs.get(normalize_url(record["url"]), {"titles": [], "pages": []})
    ext = ".pdf" if "pdf" in content_type else ".docx"
    base_name = slug(record["url"])
    public_name = f"{base_name}{ext}"
    if public_name in used_names:
        public_name = f"{base_name}-{record['sha256'][:8]}{ext}"
    used_names.add(public_name)
    source = capture_root / Path(record["localPath"])
    shutil.copy2(source, documents_root / public_name)
    title = title_overrides.get(Path(unquote(urlsplit(record["url"]).path)).name)
    title = title or next((t for t in refs["titles"] if len(t) > 3 and t.lower() not in {"click here", "here"}), None)
    documents.append({
        "title": title or Path(unquote(urlsplit(record["url"]).path)).stem.replace("_", " ").replace("+", " ").strip(),
        "file": f"documents/{public_name}",
        "sourceUrl": record["url"],
        "contentType": record["contentType"],
        "bytes": record["bytes"],
        "sha256": record["sha256"],
        "referencedFrom": refs["pages"],
    })

documents.sort(key=lambda item: item["title"].lower())
(data_root / "documents.json").write_text(json.dumps({"documents": documents}, indent=2), encoding="utf-8")

route_destinations = {
    "": "index.html",
    "site-map": "resources/index.html",
    "contact": "contact/index.html",
    "the-essence-of-brooktrails": "history/index.html",
    "copy-of-development-review-process-1": "history/index.html",
    "historical-photo-album": "history/index.html",
    "events": "government/index.html",
    "administration": "government/index.html",
    "township-ordinances": "government/index.html",
    "copy-of-township-ordinances": "government/index.html",
    "enterprise-systems": "government/index.html",
    "employment": "government/index.html",
    "township-board": "government/index.html",
    "brd-mtg-07222025": "government/index.html",
    "btcsd-brd-mtg-07082025-vid": "government/index.html",
    "brooktrails-fire-department": "fire/index.html",
    "about-brooktrails-fire-department": "fire/index.html",
    "fire-department-links": "fire/index.html",
    "emergency-services": "fire/index.html",
    "water-sewer": "water/index.html",
    "application-for-sewer-lateral-inspe": "water/index.html",
    "brooktrails-water-sewer-system": "water/index.html",
    "water-conservation-links": "water/index.html",
    "recreation-greenbelt-conservation-c": "parks/index.html",
    "brooktrails-redwood-park": "parks/index.html",
    "map-of-redwood-park": "parks/index.html",
    "ordinance-63": "parks/index.html",
    "planning-design": "planning/index.html",
    "development-review-process": "planning/index.html",
    "copy-of-development-review-process": "planning/index.html",
}
routes = []
for page in content["pages"]:
    source_path = urlsplit(page["url"]).path.strip("/")
    routes.append({
        "sourceUrl": page["url"],
        "sourceRoute": source_path or "/",
        "sourceTitle": page["title"],
        "destination": route_destinations.get(source_path, "resources/index.html"),
        "disposition": "retained-and-consolidated" if source_path else "retained-and-redesigned",
        "textCharacters": len(page.get("text", "")),
        "headings": len(page.get("headings", [])),
        "links": len(page.get("links", [])),
        "images": len(page.get("images", [])),
    })
(data_root / "source-routes.json").write_text(json.dumps({"routes": sorted(routes, key=lambda x: x["sourceRoute"])}, indent=2), encoding="utf-8")

image_specs = {
    "lake_emily-8d57a535220c.jpg": "lake-emily.jpg",
    "lake_ada_rose-eff0ac755f36.jpg": "lake-ada-rose.jpg",
    "Board-Pic-2025_edited-a9cb2cdb2164.jpg": "board-of-directors-2025.jpg",
    "logo-32317ace3a21.png": "brooktrails-fire-badge.png",
    "wildfirehist-cfbd35ed1968.jpg": "wildfire-history.jpg",
    "news-3f75ab68b174.jpg": "redwood-park-history.jpg",
    "DDRanch01-5834649d24d8.jpg": "diamond-d-ranch-history.jpg",
    "tanks-f55d6d3915c8.jpg": "water-system-map.jpg",
}
media_root = capture_root / "assets" / "static.wixstatic.com"
for source_name, public_name in image_specs.items():
    shutil.copy2(media_root / source_name, images_root / public_name)

summary = {
    "documentsPublished": len(documents),
    "routesMapped": len(routes),
    "imagesPrepared": len(image_specs),
}
print(json.dumps(summary, indent=2))
