<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

<!-- END:nextjs-agent-rules -->

# SlatePDF — Engineering + SEO Operating Rules

Live at https://slatepdf.space/ (GitHub `hmzamumtaz/slatepdf`). Next.js 16.3.1, Tailwind v4, Vercel auto-deploys on push to `main`. The product pitch that MUST stay honest in every article: free, runs in the browser, files never upload, no account.

## Commands (required before finishing any task)
- Node is NOT on the default PATH. Export it first:
  `export PATH="/var/folders/bl/pttt5my53pg44y3szmbqmx080000gn/T/opencode/node/node-v22.14.0-darwin-x64/bin:$PATH"`
- Verify with: `npx tsc --noEmit`, `npx eslint`, `npm run build`.
- Commit + push to `origin main` only when the user asks. Vercel deploys on push.

## Blog file layout
- Posts live in `src/lib/blog/posts/`. One `export const newPostsNN: BlogPost[] = [...]` per batch file, newest batch imported first in `src/lib/blog/posts/index.ts` (`allPosts` is flattened into the newest-first `posts` in `src/lib/blog/index.ts`; sitemap, blog index, related links and JSON-LD all derive from `posts` automatically).
- `related` arrays are safe to point at any slug; `relatedPosts()` silently skips missing ones. Still: only list slugs that exist.
- Blog body model: `Block` = p / h2 / h3 / steps / list / table / callout; `BlogCategory` ∈ Merging & Organizing | Converting | Compressing | Security & Privacy | Editing & Signing | Troubleshooting. All posts get Article + Breadcrumb + Person schema automatically; FAQPage schema is added automatically when `faqs` is non-empty.

---

## PART 1 — SERP-first article protocol (mandatory for EVERY article request)

Ranking is not magic: a fresh, near-zero-authority domain can only win queries the current SERP is weak on. Write for those or don't write at all. Steps below are non-negotiable and happen in this order — before any prose.

### Step 1 — Winnability gate (say NO out loud before writing)
Reject (and tell the user why) any query where the current top-5 results are dominated by high-DR brands: iLovePDF, Smallpdf, Adobe, ILovePDF-style aggregators, *.pdf.com, well-known OS vendor docs. High-competition money words ("merge pdf", "compress pdf", "convert pdf to word") are off-limits for new articles until authority exists. Accept only if the top-5 can be beaten with one of our real differentiators: **free · no upload · in-browser · offline · no account**, or a genuinely underserved angle (thermal receipts, scanned docs, exact file-size limits, native-vs-browser comparison, weird formats like SVG/WebP/EPUB).

### Step 2 — Live SERP study BEFORE writing
For the exact target keyword: `websearch` the query, then `webfetch` the top 1–3 ranking URLs. Record:
- search intent (informational how-to vs tool/action vs comparison)
- word count and heading pattern/skeleton of the winners
- whether a featured snippet ("position 0") box or People-Also-Ask exists, and what the winning 40–60 word answer looks like
- what structured data the top results emit

### Step 3 — Match-and-exceed checklist (every article)
1. Slug = the exact keyword, `kebab-case`.
2. Title: keyword-first, ≤60 chars, add the buying differentiator in parens — e.g. "(Free, No Upload)".
3. Meta description ≤158 chars, keyword + outcome contained.
4. H1 = the keyword; the keyword also appears in the first 100 words.
5. Featured-snippet answer: a direct 40–60 word paragraph + a short list, immediately under the first H2, mirroring the SERP's snippet format.
6. H2/H3 keyword variants throughout; one H2 phrased as a question for PAA overlap.
7. FAQ block (3–5 items) that mirrors People-Also-Ask questions actually on the SERP.
8. If the top result uses a comparison table or device-specific section, include one — matching SERP format beats inventing a prettier one.
9. Internal links: 2–3 to the relevant tool page and/or pillar post. One direct tool CTA box.
10. E-E-A-T: 1–2 first-person/blunt-practical blocks ("run this test", "never do this") — real domain knowledge, not template filler.
11. `published` = today's date (`YYYY-MM-DD`); `tool` = the tool slug it points to; only set `updated` when the content actually changes.
12. Length: match or exceed the median of the top-3 results; never ship <700 words.
13. No squat content: never write a device/spinner variant just to pad coverage. A new post must target a genuinely distinct query with a distinct SERP, AND (if it's a device variant) only when no generic pillar for that intent exists.

### Step 4 — Build, verify, ship
Run tsc/eslint/build (commands above), confirm the new slug appears in the built output, then commit + push and tell Vercel will deploy it.

---

## PART 2 — Traffic operations (fix + maintain)

- **Google Search Console**: domain is verified (`verification.google` metadata exists). The site is static-exported; `sitemap.xml` and `robots.txt` are auto-generated (`src/app/sitemap.ts`, `src/app/robots.ts`) — never hand-edit a URL list. Verify: Pages → Indexed in GSC; request re-indexing for new/updated URLs.
- **AI / answer-engine visibility (AEO)**: `robots.txt` already allows OAI-SearchBot, ChatGPT-User, PerplexityBot, Google-Extended, ClaudeBot, etc. Keep every article quotable: the 40–60 word direct answer under a clean H2, an FAQ block, list-based steps, and honest "does not truly do X" disclaimers. AI engines reward accurate, citable, no-hype copy.
- **Content hygiene (the rule that prevents re-creating the 2025 mess)**: 76 near-duplicate articles (device-variant spam, encyclopedia filler, listicles) were deleted — the site went 185 → 109 posts and builds 158 static pages. Never reintroduce: (a) per-device variants of a generic intent that already has a pillar; (b) definition/explainer posts with no tool and no action; (c) listicles/decision posts ("Word vs PDF") that big brands own. Consolidate rather than duplicate.
- **Performance (Core Web Vitals)**: verify with Lighthouse before/after tool changes; tool pages are heavy (pdf.js, camera pipeline). Keep mobile LCP < 2.5s, INP < 200ms.
- **Freshness discipline**: sitemap `lastmod` is derived from `reviewed/updated/published`. Only bump dates when the page truly changed (see `src/app/sitemap.ts` comment) — Google uses lastmod to prioritise crawling.

---

## PART 3 — Measurement loop

- **6-month targets (starting now)**: page-1 (top 10) for ≥60% of the keywords chosen under Part 1; top-3 for ≥25% of them; every published post must start registering impressions, not sit at zero.
- **Monthly cadence** (when the user asks "check the site" or "any traffic yet"):
  1. Pull GSC: Performance → Queries, Pages; and Indexing → Pages.
  2. Ranked 10–50 with impressions: double down (new distinct-query sibling or refresh/strengthen the existing page).
  3. Ranking >50 after ~90 days or 0 impressions after ~60 days: consolidate (redirect-merge its value into a sibling via edit) or delete. Never leave SEO zombies.
  4. Record outcomes against the 6-month targets and report the delta in plain language.
- **Evidence over vibes**: no traffic "because Google hates us" is never the conclusion — pull the data and point at the specific queries/pages before proposing the next move.