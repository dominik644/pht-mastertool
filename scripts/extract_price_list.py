#!/usr/bin/env python3
"""Extract PHT Preisliste 2026 products from PDF into JSON."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import pdfplumber

PDF_PATH = Path(
    r"c:\Users\Dominik Weller\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm"
    r"\LocalState\sessions\8BC0618318386C8D023BDAF329B68C7AB892F9F3"
    r"\transfers\2026-24\2. PHT_Preisliste_2026_AT-DE.pdf"
)
OUT_JSON = Path(__file__).resolve().parent.parent / "src" / "data" / "priceList2026.json"

ARTICLE_PREFIX = re.compile(r"^[A-Z]{2}\.[A-Z0-9]{2}\.")
PRODUCT_LINE = re.compile(
    r"^([A-Z]{2}\.[A-Z0-9]{2}\.[0-9A-Z.\-]+)\s+(.+?)\s+([\d.]+,\d{2})\s*€\s*$"
)
TOC_LINE = re.compile(r"^(.+?)\s+(\d{1,2})\s*$")
SKIP_LINE = re.compile(
    r"^(Artikelnummer|Ausführungen|Preis|Checkliste|Datenblatt|Zeichnungen|Waschplätze|"
    r"Technische Daten|Übersicht|Sortiment|Inhaltsverzeichnis|Inhalt|Farben|VPE)$"
)


def parse_price(s: str) -> float:
    return float(s.replace(".", "").replace(",", "."))


def slugify(text: str) -> str:
    t = text.lower()
    t = re.sub(r"[^a-z0-9äöüß]+", "-", t)
    return t.strip("-")[:60]


def extract_keywords(name: str, category: str, group: str) -> list[str]:
    blob = f"{name} {category} {group}".lower()
    tokens = re.findall(r"[a-zäöüß]{3,}|[a-z]{2}\d+", blob)
    # product family codes
    codes = re.findall(r"\b(ewg|dzw|sanicare|combi|ekw|ezd|hdt|hst|hfs|ndr|san)\b", blob, re.I)
    seen: set[str] = set()
    kws: list[str] = []
    for t in tokens + [c.lower() for c in codes]:
        if t not in seen and t not in ("mit", "und", "für", "typ", "der", "die", "das"):
            seen.add(t)
            kws.append(t)
    return kws[:14]


def build_page_category_map(pdf) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for page_idx in range(min(3, len(pdf.pages))):
        text = pdf.pages[page_idx].extract_text() or ""
        for line in text.split("\n"):
            line = line.strip()
            m = TOC_LINE.match(line)
            if not m:
                continue
            title, page_num = m.group(1).strip(), int(m.group(2))
            if page_num < 4 or len(title) < 4:
                continue
            if title in ("Sortiment", "Inhaltsverzeichnis", "Inhalt"):
                continue
            mapping[page_num] = title
    return mapping


def category_for_page(page_num: int, page_map: dict[int, str]) -> str:
    cat = "Sonstiges"
    for p in sorted(page_map):
        if p <= page_num:
            cat = page_map[p]
    return cat


def is_group_header(line: str) -> bool:
    if len(line) < 12 or len(line) > 120:
        return False
    if ARTICLE_PREFIX.match(line):
        return False
    if line.startswith("▪") or line.startswith("Typ "):
        return False
    if SKIP_LINE.match(line):
        return False
    if re.match(r"^[A-Z]{2,5}-\d", line):
        return False
    keywords = (
        "Handreinigung", "Hygienestation", "Sohlen", "Eingang", "Behälter",
        "Niederdruck", "Waschkabinett", "Abfall", "Spender", "Desinfektion",
        "Reinigung", "Sterilisation", "Messer", "Schürzen", "Stiefel", "Schuh",
        "Portaldrehkreuz", "Paletten", "Trocknung", "Frontlader", "Satellit",
        "Automatik", "Mobile Haupt", "Gabelhubwagen", "Pendeltür", "Bodenablauf",
        "Rinne", "Geländer", "Schattenwand", "Schäumer", "Schlauch", "Zubehör",
    )
    return any(k in line for k in keywords)


def extract_from_pdf(pdf_path: Path) -> dict:
    products: list[dict] = []
    seen_articles: set[str] = set()

    with pdfplumber.open(pdf_path) as pdf:
        page_map = build_page_category_map(pdf)

        for page_idx, page in enumerate(pdf.pages):
            page_num = page_idx + 1
            if page_num <= 3:
                continue

            category = category_for_page(page_num, page_map)
            current_group = category
            text = page.extract_text() or ""

            for raw_line in text.split("\n"):
                line = raw_line.strip()
                if not line or SKIP_LINE.match(line):
                    continue
                if re.match(r"^\d{1,2}$", line):
                    continue

                m = PRODUCT_LINE.match(line)
                if m:
                    art, name, price_s = m.group(1), m.group(2).strip(), m.group(3)
                    if art in seen_articles:
                        continue
                    seen_articles.add(art)
                    price = parse_price(price_s)
                    products.append({
                        "articleNumber": art,
                        "name": name,
                        "category": category,
                        "group": current_group,
                        "price": price,
                        "keywords": extract_keywords(name, category, current_group),
                    })
                    continue

                if is_group_header(line):
                    current_group = line

    by_cat: dict[str, list] = {}
    for p in products:
        by_cat.setdefault(p["category"], []).append(p)

    categories = []
    for cat, items in sorted(by_cat.items(), key=lambda x: (-len(x[1]), x[0])):
        prices = [i["price"] for i in items if i["price"] > 0]
        categories.append({
            "id": slugify(cat),
            "name": cat,
            "productCount": len(items),
            "priceMin": round(min(prices), 2) if prices else 0,
            "priceMax": round(max(prices), 2) if prices else 0,
        })

    return {
        "source": "PHT Preisliste 2026 AT-DE",
        "extractedAt": datetime.now().isoformat(timespec="seconds"),
        "currency": "EUR",
        "productCount": len(products),
        "categories": categories,
        "products": products,
    }


def main():
    pdf = PDF_PATH
    if len(sys.argv) > 1:
        pdf = Path(sys.argv[1])
    if not pdf.exists():
        print(f"PDF not found: {pdf}", file=sys.stderr)
        sys.exit(1)

    data = extract_from_pdf(pdf)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted {data['productCount']} products in {len(data['categories'])} categories -> {OUT_JSON}")


if __name__ == "__main__":
    main()
