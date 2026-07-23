# TM Advisors, Website v2

Static site. No build step, no dependencies, no framework. Everything is plain
HTML/CSS/JS so it can be dropped straight onto GitHub Pages.

## Structure

```
index.html                  Home
services.html               Six service disciplines
investment-strategies.html  Portfolio architecture (3 layers + process)
contact.html                Contact form + offices
thank-you.html              Form success landing (form _next target)
404.html                    Served automatically by GitHub Pages
assets/css/main.css         The entire design system, one file
assets/js/main.js           All behaviour, one file, ~7KB, zero libraries
assets/img/team/*.jpg       Portraits, 720x900, ~68KB each
tools/optimize-images.ps1   Re-run when new portraits are added
```

## Deploying to GitHub Pages

```bash
git init && git add -A && git commit -m "Site v2"
```

Then create the repo and push:

```bash
gh repo create tmadvisors-site --private --source=. --push
```

In **Settings → Pages**, set Source to `main` / `/ (root)`. `.nojekyll` is already
present so Jekyll won't touch the files.

### Before it goes live

1. **Swap the domain.** Every page has `https://www.tmadvisors.com` hard-coded in
   `<link rel="canonical">`, the `og:` tags, `robots.txt` and `sitemap.xml`. If the
   production origin differs, find-and-replace it across the repo.
2. **Custom domain.** Add a `CNAME` file containing just the bare domain, then point
   DNS at GitHub Pages. Enable *Enforce HTTPS*.
3. **Accounting Today badge.** Drop the official artwork at
   `assets/img/accounting-today-2026.png`. Until then, the hero shows a text lockup
   fallback automatically, with no broken image. Use the artwork supplied by the
   publisher rather than a recreation, to stay inside their usage terms.
4. **Social share card.** Create a 1200×630 image at `assets/img/og-card.png`. Without
   it, links pasted into LinkedIn/iMessage will have no preview image.
5. **Contact form.** `formsubmit.co` requires a one-time email confirmation on first
   submission. A honeypot field is in place; if spam still gets through, set
   `_captcha` to `true` or move to Formspree/Netlify Forms.

## Cache busting

CSS and JS are referenced as `main.css?v=3` / `main.js?v=3`. **Bump the number on
every deploy** or returning visitors will keep the old stylesheet.

## Editing notes

- **Colour, type and spacing** are all CSS custom properties at the top of
  `main.css`. Change `--gold` in one place and it updates everywhere.
- **Icons** are an inline SVG sprite in the `<defs>` block at the top of each page.
  There is no icon font. To add one, add a `<symbol id="i-name">` and reference it
  with `<svg class="icon"><use href="#i-name"/></svg>`.
- **Team bios** live in the `<div hidden>` block at the bottom of `index.html`, one
  `<div id="bio-src-{key}">` per person. They sit in the HTML (rather than a JS
  object) so search engines index them. The key must match the `data-member`
  attribute on that person's `.member-trigger` button.
- **Header and footer are duplicated** across the five pages. That is the cost of
  having no build step. If editing them in five places becomes annoying, the fix is
  a static site generator (Eleventy is the lightest option), not JS includes, which
  would hurt SEO and cause layout shift.

## Adding or replacing portraits

Drop the new files in a folder, add them to the `$map` hashtable in
`tools/optimize-images.ps1`, then:

```powershell
.\tools\optimize-images.ps1 -Source "C:\path\to\originals"
```

It centre-crops to 4:5 with a slight top bias (so heads sit properly in frame),
resizes to 720×900 and encodes JPEG q85. The originals totalled 7.5 MB; the output
is 623 KB.

## Accessibility

Keyboard navigable throughout; the team modal is a native `<dialog>` so focus
trapping and Escape are handled by the browser. Motion respects
`prefers-reduced-motion` (the animated background is removed entirely, not just
slowed). If you add components, keep the visible focus ring, and don't reintroduce a
global `outline: none`.
