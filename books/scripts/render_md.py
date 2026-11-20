"""Render each book JSON to a Markdown file beside it (Sanskrit, transliteration, reworded translation)."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
def strip_html(s): return re.sub(r"<[^>]+>", "", s or "").strip()
for f in sorted(ROOT.glob("*/*.json")):
    b = json.loads(f.read_text()); out = [f"# {b['title']}", ""]
    if b.get("subtitle"): out += [f"*{b['subtitle']}*", ""]
    if b.get("description"): out += [strip_html(b["description"]), ""]
    section = None
    for v in b["verses"]:
        if v.get("section_name") and v["section_name"] != section:
            section = v["section_name"]; out += [f"## {section}", ""]
        label = v.get("key") or ""
        out += [f"### {label}".rstrip(), ""]
        if v.get("sanskrit"): out += [v["sanskrit"].replace("\n", "  \n"), ""]
        if v.get("roman"): out += [f"*{v['roman'].replace(chr(10), '  ' + chr(10))}*", ""]
        t = v.get("translation_reworded") or v.get("translation") or ""
        out += [t, ""]
    f.with_suffix(".md").write_text("\n".join(out))
print("rendered", len(list(ROOT.glob("*/*.md"))), "markdown files")
