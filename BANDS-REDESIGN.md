# The "Bands" redesign: context for future sessions

Status as of 2026-09-01: **three preview pages, not yet in production.**
`index.html`, `services.html` and `investment-strategies.html` are
untouched. Nothing here has been folded into `main.css`. This document
exists so a future session (or a future you) can pick this up without
replaying the whole conversation.

## Where things are

```
preview-bands.html               Home
preview-bands-services.html      Services
preview-bands-strategies.html    Investment Strategies
assets/css/theme-bands.css       The redesign, as a layered override on main.css
assets/js/bands.js               Behaviour for the service track + header inversion
design-loop/                     The methodology and tooling used to build this
```

Open `preview-bands.html` directly in a browser. No build step, no server.
The three preview pages link to each other and to the real `contact.html`.

## Why this exists

Bryan Long (Chief Development Officer, CFP, on the team page) reviewed the
site and sent feedback by email, plus a Word doc (`TMA Site - Style
Ideas.docx`, outside this repo, in his Downloads) pasting Refero
style-guide extractions for two reference sites. His email, in full:

> I feel like I've looked at 1,000 sites on that link. I'm struggling
> because a lot of them are so much more complex than what we need. I did
> pull two ideas I like from two sites. The first I like to show "Our
> Services" on both the home page and on the "Services" page. The second I
> just like how the background changes color. One thing I'm not a fan of
> with our site is how it's a consistent background throughout the entire
> scroll. Even something as simple as how the different sections have
> different colors on this site: https://glassnode.com/.
>
> I want to do something different with "The TM Advantage" section but I'm
> not sure the best way to show that. Same with investment strategies page.
> If you have any ideas let me know.
>
> We'll start with what I sent and go from there. I'll keep looking for
> ideas.

The two sites in his doc were `compoundplanning.com/membership` (he liked
the boxes-with-arrows service cards) and `mercury.com` (he liked the
background changing as you scroll). He named `glassnode.com` directly in
the email as the clearest example of section-by-section colour.

**One correction worth knowing:** the Refero extraction for Mercury in his
doc says `Theme: dark` and instructs never using light backgrounds. The
live Mercury site does the opposite (photographic hero, dark band, long
light body, dark footer). His own one-line note ("the transition from dark
to light") is right; the pasted extraction is stale. Trust the live site
and his note over the doc when they disagree.

## Method: the design-loop skill

This was built using a skill called `design-loop`
(`C:\Users\Brandon\OneDrive - Taylor Capital\Shared - Documents\Claude\claude-skills\designloop.zip`,
outside this repo). Five phases: interview, preflight, teardown, loop,
integration. The two things worth knowing if you re-run it or something
like it:

1. **A bar, not a vibe.** Before building anything, the three reference
   sites were rendered and read for concrete, checkable mechanisms (M1
   through M7 in `design-loop/bar.md` / `bar-mechanisms.md`), not
   adjectives. Every critic verdict has to cite a mechanism number.
2. **Three fresh-context critics per round**, each blind to the others and
   to how much work has gone in: a *brief* critic (does it do what Bryan
   asked, ignoring aesthetics), a *system* critic (does it respect
   Meridian's tokens), and a *craft* critic (a blind A/B against the real
   references, with identifying chrome stripped out so it can't just
   recognize the brand). A champion is kept; a new version has to beat it
   or the round is rolled back.

The critics caught real bugs that a solo pass would likely have missed.
The most important ones, because they're easy to reintroduce if this
pattern gets reused elsewhere in the site:

- **A gradient hero disguised as a "band."** `main.css`'s hero paints a
  large vertical gradient plus a texture layer. That's fine when the whole
  page shares one field, but the instant sections have their own flat
  colours, a 1000px gradient is the one section that visibly isn't flat.
  Same problem with `.cta-band::before`'s radial gold wash. Both are
  disabled inside a `.band` (see `theme-bands.css` section 2).
- **A digit-transposed shadow.** `rgba(22, 47, 30, 0.26)` on the tint
  band's `--elev-1` was supposed to be `rgba(22, 35, 47, 0.26)` (the ink
  colour's channels, correctly ordered) and instead rendered a faint green
  shadow. Caught by the system critic actually computing the value, not by
  looking at it.
- **A muted-text token that silently lost contrast on inversion.**
  `--fg-4` at 0.55 alpha measures fine on the dark field it was designed
  for (4.63:1, per main.css's own comment) but drops to 3.4-3.7:1 the
  moment the same alpha composites over a light band. Six components built
  on it failed AA as a result. Fixed by raising it to 0.66 for light
  bands specifically. **If you add a light surface anywhere else in this
  system, recompute contrast for every `--fg-*` token against it. Alpha
  tokens do not carry their contrast ratio with them across backgrounds.**
- **`scroll-snap-align: start` eats the scroll container's leading
  padding.** The service track's rail had a left gutter so the first card
  would line up with the tab row above it; under `scroll-snap-type: x
  mandatory`, the browser snapped that gutter away and the card sat flush
  at the viewport edge instead. Fixed with `scroll-padding-inline-start`
  on the scroller, and the JS has to subtract the same value when
  computing scroll offsets (see `railPad()` in `bands.js`).
- **A false ARIA tablist.** The service cards are all present in the DOM
  at once inside a scrollable rail (so a keyboard/AT user can reach all
  six without relying on JS state). That is not what `role="tablist"` /
  `role="tabpanel"` promise. It's a labelled scroll region (`role=
  "region"`) plus a plain button group now, using `aria-current` instead
  of `aria-selected`.

Full round-by-round gap ledger: `design-loop/progress.html` (open it in a
browser; it's a static report, not a build artifact).

## What each piece became

**Band rhythm (Bryan's core complaint).** The fixed `.bg-field` gradient
and `#contour` canvas, which painted one continuous scene behind the
entire scroll, are retired. Each section is now a flat, full-bleed `.band`
with a hard edge against its neighbours: `--band-deep`, `--band-navy`
(reuses `--ink-950`), `--band-bone`, `--band-paper`, and `--band-tint`.
Light bands invert the whole Meridian foreground token set locally
(`--fg`, `--fg-2` etc.), so every existing component just works on a
light background with no per-component rewrite — that's the load-bearing
trick in `theme-bands.css`.

**"Our Services" (wants to appear on both Home and Services).** One
component, `.track-*` in `theme-bands.css` plus the track logic in
`bands.js`: a tab row above a horizontally-snapping rail of wide cards,
one card at full width with the next visibly clipped at the edge, prev/
next circular buttons, no fake pagination beyond that (an earlier version
had a "1 of 6" counter and a progress bar on top of the tabs and arrows —
removed for being more machinery than Bryan asked for). Same component
appears on the home page (navy) and the Services page (bone), and both
say "Our Services" — Bryan's own words — so they read as one named block.

**"The TM Advantage" (he wanted something different, didn't know what).**
The old section was four numbered rows with four paragraphs. The first
replacement attempt kept those same four paragraphs and just added a
diagram above them restating the same four items — both the brief and
craft critics failed it for that reason (a list twice is still a list).
It was rebuilt as a matrix: five real client situations (selling a
business, unwinding a concentrated position, retirement, wealth transfer,
an NIL deal) against the firm's four in-house disciplines (Investment /
Tax / Legal / Valuation, labelled with the same credentials as the hero's
credential strip), marked with a dot where that discipline is typically
involved. The argument is "almost everything you bring us needs more than
one of these," which is a claim, not a decoration. The four original
paragraphs moved to the Services page under "In-house expertise" rather
than being duplicated under the same "TM Advantage" label in two places.

**Investment Strategies (same ask, same uncertainty).** First pass just
gave each of the three portfolio layers its own band and left everything
else — same hero, same three-row summary, same three detail sections,
same wording — untouched. The brief critic called this what it was:
"recolored, not rethought," no new way to understand the page. The
three-row summary (which just repeated the three section headers in
sequence) became a five-attribute side-by-side comparison table (job to
do / how it's built / when it changes / who it's for / liquidity), so a
reader can compare the layers instead of holding three blocks in their
head while scrolling past them one at a time. Column headers still link
down to each layer's detail section.

## Open decisions — need Bryan, not a developer

These are flagged in the CSS with comments; do not resolve them
unilaterally if you pick this back up.

1. **The tint band's colour.** Currently a champagne wash (`--band-tint:
   #ecdfc7`), chosen to stay inside the existing gold accent's hue family
   rather than introduce a second brand colour. A sage alternative
   (`#dde5dd`) reads as a stronger "third note" in blind comparison but is
   a genuinely different hue outside the brand. Both values are
   documented as a comment right above `--band-tint` in `theme-bands.css`
   — it's a one-line swap either way.
2. **Card radius.** Set to 20px, matching the reference sites measured in
   `bar.md`. Every other card in Meridian (`main.css`) uses 4-6px. If this
   whole direction is approved, `main.css`'s radius tokens should move
   with it — otherwise the site ends up with two card languages.
3. **The TM Advantage matrix's content.** The five situations and which
   disciplines apply to each are a judgement call assembled from the
   firm's own service and bio copy, not verified facts. Needs Bryan's
   sign-off and, given this is a registered investment adviser, probably
   a compliance read before it ships.
4. **The service card footnotes** ("Portfolios are constructed and
   monitored in-house by our Chief Investment Officer..." etc.) are
   drafted from the team bios already on the site. Verify each is
   accurate before shipping.
5. **The card's right-hand visual.** Currently an abstract line-art mark
   per service (no invented dashboards, no fake numbers — see the
   craft-critic note on why literal illustration was avoided). The
   stronger option, if the firm wants it, is naming the person who owns
   each service — this exists for four of six already (Investment, Tax,
   M&A, Retirement map to named team members in the bios) but NIL and
   Family Office would need an owner named before that swap is made.

## Known asset gap

The Accounting Today badge (`assets/img/accounting-today-2026.png`) has a
solid near-black background baked into the file. On the flattened hero
band this now reads as a visible dark rectangle rather than sitting
invisibly on the old gradient. Needs a transparent-background version of
the artwork from the publisher — same requirement the README already
flagged before this redesign, just newly visible.

## If this gets approved for production

Rough shape of the work, not a full plan:

1. Resolve the five open decisions above with Bryan first.
2. Fold `theme-bands.css` into `main.css` as real rules (not a loaded-after
   override) and delete the override file, same pattern the repo already
   uses for retiring `theme-refined.css` etc. once a preview is accepted
   (see README's "Editing notes").
3. Rename `preview-bands.html` → `index.html` (etc.) or port the markup
   changes into the existing production files — whichever the person doing
   it prefers, but not both at once.
4. Every other production page (`contact.html`, `thank-you.html`,
   `404.html`) still uses the old fixed-field look and will look
   inconsistent next to the new bands. They weren't in scope for this
   round (Bryan named home, Services, and Investment Strategies only) but
   will need the same treatment or the site will feel unfinished.
5. Bump the `?v=` cache-busting query on `main.css` and `main.js` per the
   README's existing rule.
6. Fix the Accounting Today badge asset (above) before or alongside this
   ship, since the redesign is what exposes the problem.

## Re-running or extending this

`design-loop/` keeps the reusable tooling, trimmed of the actual renders
(those are gitignored — regenerate them, don't expect them in the repo):

- `shoot.mjs` — headless-Chrome screenshot harness driven over CDP.
  Useful because the Claude-in-Chrome browser extension was not connected
  this session; this drives the machine's local Chrome install instead, no
  npm install required. Takes a `jobs-*.json` config; see
  `jobs-preview.json` for the current pattern (full-page renders of all
  three preview pages) and `jobs-bar.json` for how the three reference
  sites were captured.
- `probe-geom.mjs` — reports exact pixel geometry (position, size,
  computed style) for CSS selectors on a page. This is what caught the
  service-track alignment bug; eyeballing a screenshot would not have.
- `find-y.mjs` — finds the absolute document Y of an element by its exact
  text content, for aiming a blind-comparison crop at a specific
  component without guessing an offset.
- `crop.mjs` — crops a screenshot by re-rendering it in Chrome (a `data:`
  page can't load `file://` images directly, which is why this exists
  rather than a simpler approach).
- `bar.md` / `bar-mechanisms.md` — the observed standard (M1-M7) this
  round was judged against. Reusable if the same three references get
  revisited, or as a template for teardown-writing on a future round.
- `progress.html` — the full round-by-round record: every piece's
  verdicts, the complete gap ledger, what was fixed each round. Open it in
  a browser.

None of `design-loop/rounds/`, `shots/`, `blind*/`, `bar/` (the reference
screenshots), or `champion/` are committed — they're bulky, fully
reproducible from the jobs configs and the live reference URLs, and an
earlier version of `shoot.mjs` was also accidentally writing full
headless-Chrome browser profiles (50-150MB each) into every output
directory. That bug is fixed (profiles now go to the OS temp directory),
but if you regenerate renders, expect the output directories to still be
too large for git — that's expected and correct.
