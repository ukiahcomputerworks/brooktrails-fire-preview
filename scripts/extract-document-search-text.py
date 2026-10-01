"""Build a compact full-text search corpus for the published district documents."""

from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader
from docx import Document


ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = json.loads((ROOT / "data" / "documents.json").read_text(encoding="utf-8"))["documents"]
SENSITIVE = {"documents/08349b-e2754931600c45e9a9121effe815729e.pdf"}
FIRE_ONLY = re.compile(r"fire|emergency services|evacuation zone", re.I)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def extract(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return normalize(" ".join(page.extract_text() or "" for page in PdfReader(path).pages))
    if path.suffix.lower() == ".docx":
        document = Document(path)
        return normalize(" ".join(paragraph.text for paragraph in document.paragraphs))
    return ""


corpus: dict[str, str] = {}
for record in DOCUMENTS:
    relative = record["file"]
    if relative in SENSITIVE or FIRE_ONLY.search(record["title"]):
        continue
    try:
        corpus[relative] = extract(ROOT / relative)
    except Exception as error:  # Keep metadata search available for unreadable/scanned files.
        print(f"Skipped full text for {relative}: {error}")
        corpus[relative] = ""

(ROOT / "data" / "document-search-text.json").write_text(
    json.dumps(corpus, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
)
print(json.dumps({"documents": len(corpus), "characters": sum(map(len, corpus.values()))}))
