# wilsonjcarter.github.io

Personal site of Carter J. Wilson. Plain Jekyll, built by GitHub Pages.

- Add a paper: `python3 scripts/add_paper.py <DOI> --theme methods|aquaporins|disorder` (pulls title, authors and journal from Crossref). Then add `*` for shared first authors.
- Publications: `_data/publications.yml` (homepage and `/archive.html` render from it). Each paper can also have a page in `_posts/` for its abstract; link it with `post: <slug>`.
- Positions, education, awards, links: `_data/cv.yml`.
- Styles: `assets/css/site.css`, which shares colour tokens with `amyloid/index.html`.
- Preview locally: `jekyll serve`, then open http://localhost:4000.
