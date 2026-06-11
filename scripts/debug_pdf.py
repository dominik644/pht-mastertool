import pdfplumber
from pathlib import Path

PDF = Path(
    r"c:\Users\Dominik Weller\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm"
    r"\LocalState\sessions\8BC0618318386C8D023BDAF329B68C7AB892F9F3"
    r"\transfers\2026-24\2. PHT_Preisliste_2026_AT-DE.pdf"
)
OUT = Path(__file__).parent / "debug_pdf_out.txt"

with pdfplumber.open(PDF) as pdf, OUT.open("w", encoding="utf-8") as out:
    for i in [3, 4, 5, 14, 20, 50]:
        page = pdf.pages[i]
        text = page.extract_text() or ""
        out.write(f"\n=== PAGE {i+1} ===\n")
        out.write(text[:2500])
        tables = page.extract_tables()
        if tables:
            out.write(f"\nTABLES: {len(tables)}\n")
            for ti, t in enumerate(tables[:2]):
                out.write(f"--- table {ti} ---\n")
                for row in t[:10]:
                    out.write(str(row) + "\n")
print("done")
