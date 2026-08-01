# Pay For Layers v3

Static site for payforlayers.com. Lives in `pfl/`; the portfolio at the repo
root is untouched and still ships from GitHub Pages.

---

## ⚠️ Read this first — the visual layer was built from the wrong source

This branch's **architecture is finished and correct**. Its **visual layer and
every count are wrong** and need redoing against the live site.

The live payforlayers.com is v.2, served from
`carloseduardopx/carloseduardopx.github.io`. That repo could not be reached from
the session that wrote this code — cross-owner `add_repo` is unsupported, and
the HTTP proxy 403s both payforlayers.com and carloseduardopx.github.io. What
got cloned instead was `carlospx/payforlayers.github.io`, which is the **2020
Webflow version**. Everything visual here derives from that stale stylesheet.

### Wrong, and why

| Thing | In this branch (from 2020) | Actually true on v.2 |
|---|---|---|
| Library size | 8 illustrations | 156 files — 121 illustrations + 35 scribbles |
| Free tier | "8 illustrations, all free as PNG" | 15 free sample out of 150+ |
| The art | browser, meditation, flower, … | a different set: AI, API, DNA, headphones, … |
| Hero image | `illustrator-at-laptop` (a substitution) | the box illustration |
| Body face | Nunito | not Nunito |
| Display face | Mint Grotesk V0.6 | not Mint Grotesk |
| Neutrals | `#2c2c2c` / `#7c7c7c` / `#a0a0a0` | unknown — read from v.2's CSS |
| Type scale | h1 37/50, h2 26/34 (from `.heading-3` 60/70) | re-derive from v.2 |

The brief's note that "the hero promises *every illustration* while the grid
shows 15" only parses once you know the real numbers: the grid is the **15 free
sample**, the library is **150+**. The value ladder is sample-vs-library, not
"all of them are free".

### To redo

1. Read v.2's stylesheet. Replace the tokens at the top of `pfl/css/pfl.css`
   — `--ink`, `--muted`, `--faint`, `--display`, `--text` — and the type scale
   in the block beneath. Keep `--link: #0c00f8`; it is the one deliberate
   addition and it is the brief's requirement, not v.2's colour.
   Re-run `node scripts/contrast.mjs` afterwards — it fails the build if any
   text pair drops below AA, which is how the 2020 grey got caught.
2. Replace `pfl/images/png/*` with the real 15 free illustrations, two files
   each (`<slug>.png` at 1080px, `<slug>-500.png`). Delete the eight 2020 ones.
3. Rewrite `pfl/manifest.json`: the 15 entries, real tags, human-written alt
   text, and `tiers.paid` describing 156 files / 121 illustrations / 35
   scribbles in `.SVG`, `.PNG` and `.FIG`.
4. Fix the hero: the box illustration, and copy stating 15 free of 150+.
5. Swap the hero art in `scripts/og.html`, then `node scripts/og.mjs`.
6. `node scripts/build.mjs`, then re-run the checks in the Verifying section.

### Getting this branch into a session rooted at the other repo

`carlospx/carlospx.github.io` is public, so a session started on
`carloseduardopx/carloseduardopx.github.io` can read it directly without
`add_repo`:

```
git clone --depth 1 -b claude/pfl-visual-scale-rhythm-la4tbb \
  https://github.com/carlospx/carlospx.github.io pfl-v3
```

Decide there whether v3 should keep living in this repo or move to the one that
actually serves payforlayers.com. Moving it is probably right.

### What is source-independent and should not be rebuilt

The manifest-driven build, crawlable tag pages that work with JavaScript off,
the sitemap and image sitemap, `robots.txt`, `llms.txt`, JSON-LD, `vercel.json`
including the `*.svg` 404, the OG renderer, the contrast script, the section
rhythm decisions, and the licence resolution (CC BY with attribution required,
stated identically in footer / tier table / FAQ / licence page, with the terms
de-conflicted). None of that depends on which stylesheet is correct.

## Adding an illustration

1. Export two PNGs into `pfl/images/png/`, named semantically
   (`backpack-line-illustration.png`, never `Backpack.png`):
   - `<slug>.png` — 1080px on the long edge. This is the free download.
   - `<slug>-500.png` — 500px wide. This is the grid thumbnail.
2. Add an entry to `pfl/manifest.json` with `slug`, `name`, `tags`, and `alt`.
   Write the alt text for a person, not a crawler — describe what is happening
   in the drawing.
3. Run the build. It fills in `width`, `height` and `bytes` from the files
   themselves, so those are never wrong.

```
node scripts/build.mjs
```

That regenerates the grid, every tag page, `sitemap.xml`, `robots.txt` and
`llms.txt`. Commit the result.

**Do not hand-edit `pfl/tags/*.html`** — they are overwritten on every build.
They are generated from `pfl/index.html`, so edit that and rebuild.

## The other two scripts

```
node scripts/og.mjs        # re-renders pfl/og.png (1200x630) from scripts/og.html
node scripts/contrast.mjs  # WCAG check on every colour pair; non-zero exit on failure
```

`og.mjs` needs Playwright (`npm i -g playwright`); nothing else does.
Re-run it if you change the OG card copy or swap which illustrations appear on it.
Run `contrast.mjs` after touching any colour in `pfl/css/pfl.css`.

## Paid files

**No SVG is in this repo, and none should ever be.** PNGs sit at predictable
public paths, so `/images/png/<slug>.svg` is the first thing anyone will try.
Paid delivery is the Gumroad zip; the vectors do not need to be on the server
at all.

Three things enforce this: `vercel.json` rewrites every `*.svg` request to a
404 regardless of what is on disk, `robots.txt` disallows the pattern, and
Vercel static hosting has no directory listing. Verified clean at the time of
writing — no `.svg` exists in the worktree or anywhere in git history.

## Deploying to Vercel

Import the repo as a new Vercel project. `vercel.json` already sets:

- output directory `pfl`, no build command
- `Access-Control-Allow-Origin: *` on `/images/png/*` and `/manifest.json`
- immutable caching on images, fonts and CSS
- the `*.svg` 404 rewrite
- `/library` and `/api/*` reserved for the gated route (nothing built there yet)

### DNS — do this yourself, nothing here touches it

Add `payforlayers.com` and `www.payforlayers.com` as domains in the Vercel
project first. Vercel then shows you the exact records. **Use what the
dashboard shows, not the table below** — these values are current as of now but
Vercel has changed them before.

| Type    | Host  | Value                  |
|---------|-------|------------------------|
| `A`     | `@`   | `76.76.21.21`          |
| `CNAME` | `www` | `cname.vercel-dns.com` |

- Delete the existing Webflow `A`/`CNAME` records for those two hosts first, or
  verification stalls on conflicting records.
- Drop TTL to 3600 or lower a day before the switch.
- Leave `MX` and `TXT` alone — email and domain verification run through those.
- Keep the Webflow site live until Vercel reports the domain as valid, then
  cancel Webflow.

`carlospx.com` is a separate site served from this same repo via GitHub Pages
(see the `CNAME` file). Its DNS is unaffected — do not touch those records.

## Verifying

With the site served locally (`npx http-server pfl -p 8899`):

- Disable JavaScript and click every tag — each must be a real page load with
  its own title, description and canonical.
- Tab through the grid, the tag row, both Gumroad buttons and the newsletter
  form; focus must be visible at every stop.
- `node scripts/contrast.mjs` — non-zero exit means a text pair is below AA.
- Confirm `/images/png/*.png` sends `Access-Control-Allow-Origin: *`, and that
  any `*.svg` path 404s.
- Check the JSON-LD parses on the index and on a tag page, and that the OG card
  renders in a preview debugger.
- Grep the attribution string across `index.html`, `licence.html`, `terms.html`
  and the FAQ — all four must match exactly.

## Open items

- **Newsletter frequency.** `pfl/index.html` currently promises "roughly once a
  month". Confirm or change it before launch; it is a promise you have to keep.
- **Nunito** loads from Google Fonts. Mint Grotesk is self-hosted in
  `pfl/fonts/`. Self-hosting Nunito too would remove the last third-party
  request if you want the Lighthouse points.
- **FAQ and terms copy** was written fresh, not carried over from the earlier
  draft. Replace with the original wording if you prefer it — the structure
  will not need to change.
