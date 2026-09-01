# bar.md

The reference standard this run is judged against. Every verdict must cite a
mechanism number below and say what was observed.

## Provenance

**Observed, not synthesized.** All three references were fetched and rendered at
1440x900 on 2026-09-01. Captures are in `bar/`.

| Reference | What Bryan flagged | Captures |
|---|---|---|
| `compoundplanning.com/membership` | "The boxes that describe what they do and how you can click the arrows to go to the different ones" | `bar/compound-membership-full.png`, `bar/compound-membership-0*.png` |
| `mercury.com` | "The transition from a dark to light background when you scroll through sections" | `bar/mercury-full.png`, `bar/mercury-0*.png` |
| `glassnode.com` | "Even something as simple as how the different sections have different colors on this site" | `bar/glassnode-full.png`, `bar/glassnode-0*.png` |

Two caveats worth holding onto:

1. **The Refero style extractions pasted into Bryan's document are stale for
   Mercury.** That extraction reports `Theme: dark` and instructs "do not use
   bright or saturated backgrounds for sections, every surface is either #171721
   or #1e1e2a." The live page does the opposite: photographic hero, then a
   near-black band, then a long light-grey body, then a dark footer. Bryan's own
   one-line note describes the live page correctly. Where the two disagree,
   **Bryan's note and the live render win.**
2. **Band colours below were read from the renders, not the DOM.** A full-page
   transparent overlay on both Glassnode and Mercury intercepts hit-testing, so
   scripted colour extraction returned the page root instead of each band. The
   rhythm is unambiguous in the captures. Exact hexes do not matter here anyway:
   these mechanisms get executed in TM's own Meridian palette, not copied.

## Observed band rhythm

Glassnode, top to bottom (`bar/glassnode-full.png`), is the clearest specimen:

| # | Band | Value |
|---|---|---|
| 1 | Hero, "Pioneering digital asset market intelligence" | light warm grey |
| 2 | Ticker strip | near-black, thin |
| 3 | Nav | white |
| 4 | "The unified digital asset data layer" | **near-black** |
| 5 | "Our flagship platform" | **white** |
| 6 | "Know When to Step Aside" | **pale periwinkle, a real tint** |
| 7 | "The market's story, told with data" + collaborations | **near-black** |
| 8 | "Glassnode pioneered on-chain analysis" | light grey |
| 9 | "integrated solutions" | white |
| 10 | Footer | near-black |

Mercury: photographic hero -> near-black product band -> long light body -> dark
footer. Fewer swings, larger blocks, same principle.

## Mechanisms

### Band rhythm

**M1.** The page reads as a stack of full-bleed bands, each a single flat colour
with a hard edge against its neighbours. No gradient, fade, or blur at a band
boundary. No fixed or parallax field scrolling independently behind the
sections. Adjacent bands never share a colour.

**M2.** Bands swing in *value*, not only in tint. Across one page there are at
least two clearly dark bands and at least two clearly light bands, and the
direction reverses at least twice. A page that only steps between three shades
of one dark hue fails this.

**M3.** At least one band is a genuine tint, a colour that is recognisably not
another step on the page's neutral ramp. Glassnode's periwinkle is the model.

**M4.** Content and card fills invert with the band they sit in; no card fill
repeats across two differently-valued bands. On a dark band, cards sit one step
*lighter* than the band. On a light band, cards are white or near-white with a
hairline border. Body and heading colour flip to match. Separation comes from
value difference, not from drop shadows.

### Service card track

**M5.** Services are one horizontally-sliding track of wide cards, not a static
grid. Exactly one card occupies the full content width at a time, and the next
card is visibly clipped by the right viewport edge so the track reads as
continuing. Card radius is 20-24px.

**M6.** The track is driven by a text tab row sitting *above* it: one short
label per service, the active label full-contrast with a rule under it, the
inactive labels mid-grey. A pair of circular prev/next buttons sits
right-aligned on the same baseline as that tab row. Both controls drive the same
track.

**M7.** Each card is a two-column split: copy column left, supporting visual
right. The copy column carries a headline, a short paragraph or three to four
bullets, and a small muted footnote pinned to the bottom of the card, clear of
the body copy. The card headline is two-tone across two lines at one size and
one weight: first line muted, second line full-contrast ("We help you /
borrow more efficiently").

## Deliberately not adopted

- Compound's near-total achromatic silence and single 400 weight. TM has a
  serif display face and a gold accent that are doing real brand work.
- Mercury's cobalt. TM's single accent is gold `#c5a47e`.
- Glassnode's dense data-product furniture: metric counters, ticker strips,
  chart chrome. TM is an advisory firm, not a data product, and the foundation
  rule against data slop applies.
