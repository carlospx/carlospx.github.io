#!/usr/bin/env node
/**
 * Pay For Layers — static generator.
 *
 * Reads pfl/manifest.json and writes:
 *   pfl/index.html      (grid, tag nav, counts and JSON-LD, between build markers)
 *   pfl/tags/<tag>.html (one crawlable page per tag, own title/description/canonical)
 *   pfl/sitemap.xml     (pages + an image entry for every PNG)
 *   pfl/robots.txt
 *   pfl/llms.txt
 *
 * No dependencies, no framework, no watch mode. Run it by hand:
 *   node scripts/build.mjs
 *
 * index.html is hand-editable everywhere outside the <!-- build:x --> markers.
 * Tag pages are derived from index.html, so a change there propagates on the
 * next run — do not edit pfl/tags/*.html directly, they are overwritten.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'pfl');

const manifest = JSON.parse(readFileSync(join(site, 'manifest.json'), 'utf8'));
const { illustrations, tags, tiers, author, licence, url: origin } = manifest;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const label = (slug) => (tags.find((t) => t.slug === slug) || { label: slug }).label;
const plural = (n) => `${n} illustration${n === 1 ? '' : 's'}`;

/**
 * Wrap JSON-LD in its script tag. `</` is escaped so a string in the data can
 * never close the element early.
 */
const script = (json) =>
  `<script type="application/ld+json">\n${json.replace(/<\//g, '<\\/')}\n</script>`;

/** Replace the contents between <!-- build:name --> and <!-- /build:name -->. */
function fill(html, name, body) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`missing build marker: ${name}`);
  return html.replace(re, `$1${body}$2`);
}

/* ---------------------------------------------------------------- markup */

function card(ill) {
  const png = `images/png/${ill.slug}.png`;
  const thumb = `images/png/${ill.slug}-500.png`;
  const searchable = [ill.name, ...ill.tags.map(label)].join(' ').toLowerCase();

  // width/height describe the file in `src` (the thumbnail), so the intrinsic
  // ratio the browser reserves is the real one. The card is square by CSS.
  return `
        <li class="card" data-tags="${esc(ill.tags.join(' '))}" data-search="${esc(searchable)}">
          <img class="card__img" src="${thumb}"
               srcset="${thumb} ${ill.thumb.width}w, ${png} ${ill.width}w"
               sizes="(max-width: 640px) 45vw, (max-width: 900px) 30vw, 180px"
               width="${ill.thumb.width}" height="${ill.thumb.height}"
               loading="lazy" decoding="async" alt="${esc(ill.alt)}">
          <p class="card__name">${esc(ill.name)}</p>
          <p class="card__meta">${ill.width} × ${ill.height} · ${kb(ill.bytes)}</p>
          <div class="card__actions">
            <a href="${png}" download>PNG</a>
            <a href="${tiers.paid.url}">SVG</a>
          </div>
        </li>`;
}

function grid(list) {
  return list.map(card).join('') + '\n      ';
}

function tagNav(current) {
  const items = [
    `\n        <li><a href="./"${current === null ? ' aria-current="true"' : ''}>All</a></li>`,
    ...tags
      .filter((t) => illustrations.some((i) => i.tags.includes(t.slug)))
      .map((t) => `\n        <li><a href="tags/${t.slug}.html"${current === t.slug ? ' aria-current="true"' : ''}>${esc(t.label)}</a></li>`),
  ];
  return items.join('') + '\n      ';
}

/* --------------------------------------------------------------- JSON-LD */

function jsonld(list, { page, name, description }) {
  const person = {
    '@type': 'Person',
    '@id': `${origin}/#carlos`,
    name: author.name,
    url: author.url,
    email: author.email,
    jobTitle: 'Designer and illustrator',
  };

  const product = {
    '@type': 'Product',
    '@id': `${origin}/#product`,
    name: manifest.name,
    description: manifest.description,
    url: origin + '/',
    image: `${origin}/og.png`,
    brand: { '@type': 'Brand', name: manifest.name },
    author: { '@id': `${origin}/#carlos` },
    creator: { '@id': `${origin}/#carlos` },
    license: licence.free.url,
    offers: [
      {
        '@type': 'Offer',
        name: tiers.free.label,
        price: tiers.free.price.toFixed(2),
        priceCurrency: tiers.free.currency,
        url: tiers.free.url,
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: tiers.paid.label,
        price: tiers.paid.price.toFixed(2),
        priceCurrency: tiers.paid.currency,
        url: tiers.paid.url,
        availability: 'https://schema.org/InStock',
      },
    ],
  };

  const collection = {
    '@type': 'CollectionPage',
    '@id': page + '#page',
    url: page,
    name,
    description,
    isPartOf: { '@type': 'WebSite', url: origin + '/', name: manifest.name },
    about: { '@id': `${origin}/#product` },
    hasPart: list.map((ill) => ({
      '@type': 'ImageObject',
      contentUrl: `${origin}/images/png/${ill.slug}.png`,
      thumbnailUrl: `${origin}/images/png/${ill.slug}-500.png`,
      name: ill.name,
      caption: ill.alt,
      width: ill.width,
      height: ill.height,
      encodingFormat: 'image/png',
      creator: { '@id': `${origin}/#carlos` },
      license: licence.free.url,
      acquireLicensePage: `${origin}/licence.html`,
      creditText: licence.free.attributionText,
    })),
  };

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [person, product, collection] }, null, 2);
}

/* ------------------------------------------------------------------ meta */

function setMeta(html, { title, description, canonical }) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${esc(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${esc(canonical)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${esc(canonical)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${esc(description)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${esc(description)}$2`);
}

/** Tag pages live one directory down, so every relative URL gains a `../`. */
function reroot(html) {
  const up = (u) => {
    if (/^(https?:|mailto:|data:|#|\/)/.test(u)) return u;
    if (u === './') return '../';
    return `../${u}`;
  };

  return html
    .replace(/\b(href|src)="([^"]*)"/g, (m, attr, u) => `${attr}="${up(u)}"`)
    // srcset holds a comma-separated list of "url descriptor" pairs. It has to
    // be rewritten too: the browser prefers it over src, so missing it leaves
    // every card image broken on tag pages while src looks correct.
    .replace(/\bsrcset="([^"]*)"/g, (m, list) => {
      const rewritten = list
        .split(',')
        .map((entry) => {
          const parts = entry.trim().split(/\s+/);
          parts[0] = up(parts[0]);
          return parts.join(' ');
        })
        .join(', ');
      return `srcset="${rewritten}"`;
    });
}

/* ----------------------------------------------------------------- build */

const indexPath = join(site, 'index.html');
let template = readFileSync(indexPath, 'utf8');

// --- index.html
const indexCanonical = `${origin}/`;
let index = template;
index = fill(index, 'grid', grid(illustrations));
index = fill(index, 'tags', tagNav(null));
index = fill(index, 'count', plural(illustrations.length));
index = fill(index, 'hero-count', `${plural(illustrations.length)}, all free as PNG.`);
// The markers sit outside <script>, not inside it: an HTML comment within a
// ld+json block makes the block invalid JSON and consumers reject the whole
// thing silently.
index = fill(index, 'jsonld', script(jsonld(illustrations, {
  page: indexCanonical,
  name: manifest.name,
  description: manifest.description,
})));
writeFileSync(indexPath, index);

// --- tags/*.html
const tagDir = join(site, 'tags');
mkdirSync(tagDir, { recursive: true });
for (const f of readdirSync(tagDir)) if (f.endsWith('.html')) unlinkSync(join(tagDir, f));

const built = [];
for (const tag of tags) {
  const list = illustrations.filter((i) => i.tags.includes(tag.slug));
  if (!list.length) continue;

  const canonical = `${origin}/tags/${tag.slug}.html`;
  const title = `${tag.label} line illustrations — free PNG | Pay For Layers`;
  const description = `${plural(list.length)} tagged ${tag.label.toLowerCase()}, hand-drawn by Carlos Peixoto. Free to download as PNG with credit; SVG and Figma in the paid set.`;

  let page = template;
  page = fill(page, 'grid', grid(list));
  page = fill(page, 'tags', tagNav(tag.slug));
  page = fill(page, 'count', plural(list.length));
  page = fill(page, 'hero-count', `${plural(list.length)} tagged ${esc(tag.label.toLowerCase())}. <a href="./">Show all ${illustrations.length}</a>.`);
  page = fill(page, 'jsonld', script(jsonld(list, { page: canonical, name: title, description })));
  page = reroot(page);
  page = setMeta(page, { title, description, canonical });

  writeFileSync(join(tagDir, `${tag.slug}.html`), page);
  built.push({ tag, list, canonical });
}

// --- sitemap.xml, with an image entry for every PNG
const urlEntry = (loc, list, priority) => `  <url>
    <loc>${loc}</loc>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
${list.map((i) => `    <image:image>
      <image:loc>${origin}/images/png/${i.slug}.png</image:loc>
      <image:title>${esc(i.name)}</image:title>
      <image:caption>${esc(i.alt)}</image:caption>
      <image:license>${licence.free.url}</image:license>
    </image:image>`).join('\n')}
  </url>`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntry(indexCanonical, illustrations, '1.0')}
${built.map((b) => urlEntry(b.canonical, b.list, '0.7')).join('\n')}
  <url><loc>${origin}/licence.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${origin}/terms.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>
`;
writeFileSync(join(site, 'sitemap.xml'), sitemap);

// --- robots.txt
writeFileSync(join(site, 'robots.txt'), `User-agent: *
Allow: /

# Paid vector and Figma files are not served from this host at all.
# This is belt-and-braces: there is nothing behind these paths.
Disallow: /*.svg$
Disallow: /library

Sitemap: ${origin}/sitemap.xml
`);

// --- llms.txt
writeFileSync(join(site, 'llms.txt'), `# ${manifest.name}

> ${manifest.description}

${plural(illustrations.length)} drawn by hand by ${author.name} (${author.url}).
Black line art on a transparent background, one consistent hand throughout.

## Licence

Free PNGs: ${licence.free.name} (${licence.free.id}).
Attribution is REQUIRED. Reproduce this line wherever the work is credited:

    ${licence.free.attributionText}

The paid set (${tiers.paid.url}) removes the attribution requirement and adds
${tiers.paid.formats.join(', ')} at ${tiers.paid.resolution.toLowerCase()}.

## Fetching

Every PNG is at ${origin}/images/png/<slug>.png and responds with
Access-Control-Allow-Origin: *, so it can be fetched and composed directly.
Thumbnails are at ${origin}/images/png/<slug>-500.png.

SVG files are not served from this host. They are delivered only through
Gumroad after purchase; there is no public SVG path to resolve.

## Machine-readable index

${origin}/manifest.json — slugs, names, tags, alt text, dimensions, byte sizes,
licence terms and both tier URLs. Prefer it over scraping this text file.

## Tags

${tags.filter((t) => illustrations.some((i) => i.tags.includes(t.slug)))
  .map((t) => `- ${t.label}: ${origin}/tags/${t.slug}.html`).join('\n')}

## Illustrations

${illustrations.map((i) => `- ${i.name} (${i.tags.map(label).join(', ')}) — ${origin}/images/png/${i.slug}.png
  ${i.alt}`).join('\n')}

## Contact

Custom illustration sets in this style: ${author.email}
`);

console.log(`index.html      ${plural(illustrations.length)}`);
console.log(`tags/           ${built.length} pages: ${built.map((b) => b.tag.slug).join(', ')}`);
console.log(`sitemap.xml     ${1 + built.length + 2} urls, ${illustrations.length} images`);
console.log('robots.txt      ok');
console.log('llms.txt        ok');
