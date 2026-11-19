#!/usr/bin/env python3
"""Add a paper to _data/publications.yml from its DOI (metadata from Crossref).

    python3 scripts/add_paper.py 10.1021/acs.jctc.5c01816 --theme methods
    python3 scripts/add_paper.py <doi> --theme aquaporins --dry-run   # print only

The entry goes at the top of the list (newest first). Afterwards, check the
title and author names, and add * after names for shared first authorship.
Themes: methods | aquaporins | disorder
"""
import argparse, json, pathlib, re, sys, urllib.parse, urllib.request

DATA = pathlib.Path(__file__).resolve().parent.parent / "_data" / "publications.yml"
THEMES = ("methods", "aquaporins", "disorder")


def crossref(doi):
    url = "https://api.crossref.org/works/" + urllib.parse.quote(doi)
    req = urllib.request.Request(url, headers={"User-Agent": "personal-site-add-paper/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["message"]


def q(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def entry(m, doi, theme, post):
    title = re.sub(r"<[^>]+>", "", (m.get("title") or [""])[0]).strip()
    title = re.sub(r"\s+", " ", title)
    authors = ", ".join(
        " ".join(x for x in (a.get("given"), a.get("family")) if x) or a.get("name", "")
        for a in m.get("author", [])
    )
    preprint = m.get("type") == "posted-content"
    venue = (m.get("container-title") or [""])[0]
    servers = {"10.26434/": "ChemRxiv", "10.1101/": "bioRxiv", "10.48550/": "arXiv", "10.21203/": "Research Square"}
    if preprint:
        venue = next((v for p, v in servers.items() if doi.startswith(p)), venue)
    if not venue:
        inst = m.get("institution") or [{}]
        venue = inst[0].get("name") or m.get("group-title") or m.get("publisher", "")
    vol, iss, pages = m.get("volume"), m.get("issue"), m.get("page") or m.get("article-number")
    if vol:
        venue += f" {vol}" + (f" ({iss})" if iss else "")
    if pages:
        venue += ("," if vol else "") + " " + pages.replace("-", "–")
    parts = (m.get("published") or m.get("issued") or {}).get("date-parts", [[None]])[0]
    year = parts[0]

    lines = [f"- title: {q(title)}", f"  authors: {q(authors)}", f"  venue: {q(venue.strip())}",
             f"  year: {year}", f"  doi: {q(doi)}"]
    if preprint:
        lines.append("  note: preprint")
    lines.append(f"  theme: {theme}")
    if post:
        lines.append(f"  post: {post}")
    return "\n".join(lines) + "\n\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("doi")
    ap.add_argument("--theme", choices=THEMES, required=True)
    ap.add_argument("--post", help="slug of a page in _posts with the abstract (optional)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    doi = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)", "", a.doi.strip(), flags=re.I)
    text = DATA.read_text()
    if f'doi: "{doi}"' in text:
        sys.exit(f"Already in {DATA.name}: {doi}")

    new = entry(crossref(doi), doi, a.theme, a.post)
    if a.dry_run:
        print(new, end="")
        return
    i = text.index("\n- title:") + 1  # insert before the first (newest) entry
    DATA.write_text(text[:i] + new + text[i:])
    print(new, end="")
    print(f"Added to {DATA.relative_to(DATA.parent.parent)}. Check names, and add * for shared first authors.")


if __name__ == "__main__":
    main()
