# Pay For Layers v3

Static site for payforlayers.com. Lives in `pfl/`; the portfolio at the repo
root is untouched and still ships from GitHub Pages.

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

## Open items

- **Newsletter frequency.** `pfl/index.html` currently promises "roughly once a
  month". Confirm or change it before launch; it is a promise you have to keep.
- **Nunito** loads from Google Fonts. Mint Grotesk is self-hosted in
  `pfl/fonts/`. Self-hosting Nunito too would remove the last third-party
  request if you want the Lighthouse points.
- **FAQ and terms copy** was written fresh, not carried over from the earlier
  draft. Replace with the original wording if you prefer it — the structure
  will not need to change.
