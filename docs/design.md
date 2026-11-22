---
version: alpha
name: Rpl
description: |
  This design system embodies a modern, tech-forward educational platform with
  minimalist sensibilities and purposeful restraint. The aesthetic blends clean
  typography, soft radial gradients, and deliberate use of whitespace to create
  an environment that feels both professional and approachable. The color
  palette oscillates between deep charcoal (#171717) and bright canvas
  (#FFFFFF), punctuated by warm gold (#F2B53A) and cool decorative accents.
  Interactions employ subtle transforms and opacity shifts rather than loud
  animations, reinforcing the sense of purposeful, considered design. The system
  privileges clarity and hierarchy over embellishment, making it ideal for
  technical curriculum, code-based learning, and industry-standard project
  workflows.
source:
  url: "https://rpl.tamsis.site/"
  pagesAnalyzed: 1
  extractedAt: 2026-11-22
  tokensMeasured: true
colors:
  primary: "#171717"
  accent: "#F2B53A"
  canvas: "#FFFFFF"
  surface: "#07170F"
  on-primary: "#FFFFFF"
  ink: "#171717"
  body: "#666666"
  muted: "#BDBDBD"
  hairline: "#E5E7EB"
  accent-1: "#16523A"
  accent-2: "#0369A1"
  accent-3: "#C98E12"
  neutral-1: "#0A0A0A"
  neutral-2: "#222222"
typography:
  display-xl:
    fontFamily: Geist
    fontSize: 73.6px
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: -4.05px
  display-lg:
    fontFamily: Geist
    fontSize: 54.4px
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: -2.99px
  display-md:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1.8px
  heading-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: -0.7px
  heading-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: -0.6px
  heading-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.4px
  heading-xs:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.38
    letterSpacing: -0.45px
  body-xl:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0px
  body-lg:
    fontFamily: Geist
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  body-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-sm-loose:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  body-xs:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  button-md:
    fontFamily: Geist
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.38
    letterSpacing: 0px
  button-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  button-sm-strong:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0px
  button-xs:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.38
    letterSpacing: 0px
  code-xl:
    fontFamily: "Geist Mono"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  code-lg:
    fontFamily: "Geist Mono"
    fontSize: 13.12px
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: 0px
  code-md:
    fontFamily: "Geist Mono"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  code-md-loose:
    fontFamily: "Geist Mono"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: 0px
  code-sm:
    fontFamily: "Geist Mono"
    fontSize: 12.8px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  code-xs:
    fontFamily: "Geist Mono"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 9.6px
  sm: 12px
  md: 14.4px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 28px
  xxxl: 32px
  section: 36px
  band: 40px
shadows:
  sm: "rgb(234, 234, 234) 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 8px 30px 0px"
  md: "rgb(234, 234, 234) 0px 0px 0px 1px"
  lg: "rgb(31, 43, 37) 0px 0px 0px 1px"
  xl: "rgb(212, 212, 212) 0px 0px 0px 1px inset"
elevationStrategy: layered-micro
themes:
  derived: dark   # the other theme is the site's measured palette
  light:
    bg: "#FFFFFF"
    surface: "#07170F"
    surfaceRaised: "#08170F"
    text: "#171717"
    textMuted: "#666666"
    border: "#E5E7EB"
    accent: "#BA800C"
    accentFg: "#000000"
    focusRing: "#F2B53A"
    elevation: shadow
  dark:
    bg: "#13100B"
    surface: "#211E1A"
    surfaceRaised: "#2D2A26"
    text: "#FEFCF7"
    textMuted: "#A5A29D"
    border: "#393632"
    accent: "#F2B53A"
    accentFg: "#0B0B0C"
    focusRing: "#F2B53A"
    elevation: "border+surface"
  contrastFailures:
    - "light: text on surface = 1.03:1 (needs 4.5:1)"
gradients:
  - context: hero
    kind: radial
    value: "radial-gradient(40% 60% at 20% 70%, rgba(34, 197, 94, 0.18), rgba(0, 0, 0, 0) 70%), radial-gradient(35% 55% at 50% 85%, rgba(242, 181, 58, 0.2), rgba(0, 0, 0, 0) 70%), radial-gradient(40% 60% at 80% 70%, rgba(56, 189, 248, 0.2), rgba(0, 0, 0, 0) 70%)"
  - context: hero
    kind: radial
    value: "radial-gradient(rgb(212, 212, 212) 1px, rgba(0, 0, 0, 0) 1px)"
  - context: section
    kind: radial
    value: "radial-gradient(rgb(212, 212, 212) 1px, rgba(0, 0, 0, 0) 1px)"
  - context: section
    kind: radial
    value: "radial-gradient(120% 90% at 0% 0%, rgb(224, 242, 254), rgba(0, 0, 0, 0) 60%), none"
  - context: section
    kind: radial
    value: "radial-gradient(120% 90% at 0% 0%, rgb(234, 245, 239), rgba(0, 0, 0, 0) 60%), none"
  - context: section
    kind: radial
    value: "radial-gradient(60% 80% at 100% 0%, rgb(234, 245, 239), rgba(0, 0, 0, 0) 70%)"
components:
  button-filled:
    typography: "{typography.button-sm}"
    textColor: "{colors.ink}"
    height: 51.1875px
    padding: "13.6px 16px 13.6px 48px"
    rounded: "{rounded.xs}"
    backgroundColor: "rgb(250, 250, 250)"
  button-primary:
    typography: "{typography.button-sm-strong}"
    textColor: "{colors.on-primary}"
    height: 48px
    padding: "0px 24px 0px 24px"
    rounded: 999px
    backgroundColor: "{colors.primary}"
  button-primary-sm:
    textColor: "{colors.on-primary}"
    height: 36px
    padding: "0px 16px 0px 16px"
    fontSize: 14px
    fontFamily: Geist
    fontWeight: 500
    lineHeight: 1.43
    rounded: 999px
    backgroundColor: "{colors.primary}"
  button-filled-sm:
    textColor: "{colors.neutral-1}"
    height: 40px
    padding: "0px 20px 0px 20px"
    fontSize: 14px
    fontFamily: Geist
    fontWeight: 500
    lineHeight: 1.43
    rounded: 999px
    backgroundColor: "{colors.accent}"
  button-icon:
    typography: "{typography.button-sm}"
    textColor: "{colors.ink}"
    height: 32px
    boxShadow: "rgb(212, 212, 212) 0px 0px 0px 1px inset"
    rounded: 999px
    backgroundColor: "rgb(250, 250, 250)"
  card-featured:
    typography: "{typography.button-sm}"
    textColor: "{colors.on-primary}"
    boxShadow: "rgb(31, 43, 37) 0px 0px 0px 1px"
    rounded: "{rounded.md}"
    backgroundColor: "{colors.surface}"
  card:
    typography: "{typography.button-sm}"
    textColor: "{colors.ink}"
    padding: "32px 32px 32px 32px"
  card-sm:
    typography: "{typography.button-sm}"
    textColor: "{colors.ink}"
    boxShadow: "rgb(234, 234, 234) 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 8px 30px 0px"
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.canvas}"
  badge-filled:
    textColor: "{colors.accent-2}"
    height: 27.1875px
    padding: "4px 11.2px 4px 11.2px"
    fontSize: 12.8px
    fontFamily: Geist
    fontWeight: 500
    lineHeight: 1.5
    rounded: 999px
    backgroundColor: "rgb(224, 242, 254)"
  badge-filled-2:
    textColor: "{colors.accent-1}"
    height: 27.1875px
    padding: "4px 11.2px 4px 11.2px"
    fontSize: 12.8px
    fontFamily: Geist
    fontWeight: 500
    lineHeight: 1.5
    rounded: 999px
    backgroundColor: "rgb(234, 245, 239)"
  navigation:
    typography: "{typography.button-sm}"
    textColor: "{colors.ink}"
    height: 64px
    padding: "0px 24px 0px 24px"
  footer:
    typography: "{typography.button-sm}"
    textColor: "{colors.ink}"
  link:
    typography: "{typography.body-xs}"
    textColor: "{colors.ink}"
    padding: "4.8px 6.4px 4.8px 14.4px"
    boxShadow: "rgb(234, 234, 234) 0px 0px 0px 1px inset"
    rounded: 999px
    backgroundColor: "{colors.canvas}"
  link-lg:
    typography: "{typography.button-sm-strong}"
    textColor: "{colors.ink}"
    padding: "0px 24px 0px 24px"
    boxShadow: "rgb(212, 212, 212) 0px 0px 0px 1px inset"
    rounded: 999px
    backgroundColor: "{colors.canvas}"
states:
  other-focus-visible:
    target: other
    state: focus-visible
    rounded: 6px
  button-hover:
    target: button
    state: hover
    opacity: 0.85
  other-hover:
    target: other
    state: hover
    transform: "scaleX(1)"
  input-focus-visible:
    target: input
    state: focus-visible
    outline: none
  card-hover:
    target: card
    state: hover
    transform: "translateY(-3px)"
  button-active:
    target: button
    state: active
    transform: "scale(0.97)"
  link-hover:
    target: link
    state: hover
    transform: "translate(2px, -2px)"
  other-focus:
    target: other
    state: focus
    rounded: "{rounded.full}"
breakpoints:
  - width: 375
    containerWidth: 375
    gridColumns: 6
    navLinksVisible: 1
    menuToggleVisible: true
    headingPx: 40
    bodyPx: 16
    sectionPaddingX: 0
  - width: 768
    containerWidth: 768
    gridColumns: 6
    navLinksVisible: 3
    menuToggleVisible: true
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1024
    containerWidth: 1024
    gridColumns: 7
    navLinksVisible: 10
    menuToggleVisible: true
    headingPx: 63
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1280
    containerWidth: 1080
    gridColumns: 4
    navLinksVisible: 10
    menuToggleVisible: true
    headingPx: 74
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1440
    containerWidth: 1080
    gridColumns: 4
    navLinksVisible: 10
    menuToggleVisible: true
    headingPx: 74
    bodyPx: 16
    sectionPaddingX: 0
coverage:
  statesFound: 24
  gradientsFound: 8
  rolesUnassigned: 5
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: true
  semanticRampDeclared: false
---

# Design System Inspired by Tamansiswa Jetis RPL

## 1. Visual Theme & Atmosphere

This design system embodies a **modern, tech-forward educational platform** with minimalist sensibilities and purposeful restraint. The aesthetic blends clean typography, soft radial gradients, and deliberate use of whitespace to create an environment that feels both professional and approachable. The color palette oscillates between deep charcoal (`{colors.primary}` — `#171717`) and bright canvas (`{colors.canvas}` — `#FFFFFF`), punctuated by warm gold (`{colors.accent}` — `#F2B53A`) and cool decorative accents. Interactions employ subtle transforms and opacity shifts rather than loud animations, reinforcing the sense of purposeful, considered design. The system privileges clarity and hierarchy over embellishment, making it ideal for technical curriculum, code-based learning, and industry-standard project workflows.

**Key Characteristics:**
- Deep, neutral primary palette with strategic warm gold accent
- Negative letter-spacing on display typography for visual compression and authority
- Pill-shaped buttons and badges (`{rounded.full}` — `9999px`) contrasting with sharp card corners (`{rounded.none}` — `0px`)
- Micro-layered shadows and subtle elevation for depth without dominance
- Radial gradients as ambient, barely-perceptible background texture
- Interaction states driven by opacity, transform, and inset borders rather than colour change
- Focus visible outlines at `6px` radius, distinct from the system's pill/sharp dichotomy
- Mobile-first responsive design with progressive disclosure of navigation

## 2. Color Palette & Roles

### Primary
- **Primary / Brand / Ink** (`{colors.primary}` — `#171717`): Deep charcoal used for primary CTAs, active states, headings, and primary text. The brand's dominant dark anchor.
- **Brand Accent** (`{colors.accent}` — `#F2B53A`): Warm gold applied to secondary actions, filled badges, and highlight states. Energizes the achromatic primary.

### Accent Colors (Decorative)
- **Decorative Accent 1** (`{colors.accent-1}` — `#16523A`): Deep forest green; used in radial gradient overlays for hero and section backgrounds but not assigned a functional role.
- **Decorative Accent 2** (`{colors.accent-2}` — `#0369A1`): Cool sky blue; applied in hero and section gradients for visual depth and motion suggestion.
- **Decorative Accent 3** (`{colors.accent-3}` — `#C98E12`): Warm amber; included in gradient layers for warmth and visual interest.

### Interactive
- **Interactive Surface Light** (`#E0F2FE`): Badge fill for blue badge variant; provides high-contrast text pairing.
- **Interactive Surface Light Alt** (`#EAF5EF`): Badge fill for green badge variant; pairs with dark teal text.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#FFFFFF`): Default page background and primary surface for text-heavy content. Label colour on brand surfaces.
- **Surface** (`{colors.surface}` — `#07170F`): Dark card and panel background; used in featured card patterns for visual inversion.
- **Body** (`{colors.body}` — `#666666`): Standard body copy and secondary content text.
- **Muted** (`{colors.muted}` — `#BDBDBD`): Captions, disabled states, and tertiary text.
- **Neutral Dark 1** (`{colors.neutral-1}` — `#0A0A0A`): Near-black; used sparingly for maximum contrast overlays.
- **Neutral Dark 2** (`{colors.neutral-2}` — `#222222`): Charcoal; alternative dark surface for subtle differentiation.

### Surface & Borders
- **Hairline** (`{colors.hairline}` — `#E5E7EB`): 1px borders, dividers, and subtle structural lines throughout. The system's primary stroke colour.

## 3. Typography Rules

### Font Family
**Primary: Geist** (https://fonts.googleapis.com/) — humanist sans-serif, approachable and modern. Fallback: `system-ui, -apple-system, sans-serif`.

**Monospace: Geist Mono** (https://fonts.googleapis.com/) — for code, terminal labels, and technical content. Fallback: `"Courier New", monospace`.

**Decorative: Press Start 2P** (https://fonts.googleapis.com/) — applied sparingly for retro/game-inspired elements; fallback to monospace if unavailable.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display XL | Geist | 73.6px | 600 | 1.02 | −4.05px | Hero/hero-scale headings; extreme compression for authority |
| Display LG | Geist | 54.4px | 600 | 1.02 | −2.99px | Major section breaks; sub-hero headlines |
| Display MD | Geist | 40px | 600 | 1.1 | −1.8px | Large section headings; card titles |
| Heading LG | Geist | 28px | 600 | 1.14 | −0.7px | Section dividers and featured content headings |
| Heading MD | Geist | 24px | 600 | 1.33 | −0.6px | Subheadings and feature blocks |
| Heading SM | Geist | 20px | 600 | 1.3 | −0.4px | Secondary headings and tertiary sections |
| Heading XS | Geist | 18px | 600 | 1.38 | −0.45px | Small headings and labels |
| Body XL | Geist | 18px | 400 | 1.65 | 0px | Large body/intro text |
| Body LG | Geist | 17px | 400 | 1.63 | 0px | Primary body text in featured contexts |
| Body MD | Geist | 16px | 400 | 1.63 | 0px | Standard body copy |
| Body SM | Geist | 15px | 400 | 1.5 | 0px | Secondary body text and descriptions |
| Body SM Loose | Geist | 15px | 400 | 1.63 | 0px | Body with increased line-height for readability |
| Button MD | Geist | 17px | 500 | 1.38 | 0px | Standard button text |
| Button SM | Geist | 16px | 400 | 1.5 | 0px | Small/secondary button text |
| Button SM Strong | Geist | 16px | 500 | 1.5 | 0px | Small button with emphasis |
| Button XS | Geist | 15px | 500 | 1.38 | 0px | Minimal button text |
| Link | Geist | 14px | 400 | 1.5 | 0px | Inline and standalone links |
| Code XL | Geist Mono | 14px | 400 | 1.5 | 0px | Large code blocks and terminals |
| Code LG | Geist Mono | 13.12px | 400 | 1.75 | 0px | Standard code and command output |
| Code MD | Geist Mono | 13px | 400 | 1.5 | 0px | Inline code and labels |
| Code MD Loose | Geist Mono | 13px | 400 | 1.8 | 0px | Code with increased line-height |
| Code SM | Geist Mono | 12.8px | 400 | 1.5 | 0px | Small inline code |
| Code XS | Geist Mono | 12px | 400 | 1.33 | 0px | Minimal code references |

### Principles
- **Negative letter-spacing on displays** (`−4.05px` on Display XL) creates visual compression and authority; never neutralize this trait.
- **Weight hierarchy** is bimodal: 400 for body/UI and 500–600 for headings and CTAs.
- **Line-height scales** with size: displays sit tighter (1.02–1.1), bodies more generous (1.5–1.65).
- **Monospace** appears only in code, terminal, and technical label contexts; never use it for body or UI copy.
- **All tracking is zero or negative**; no letter-spacing expansion exists in the system.

## 4. Component Stylings

### Buttons

**Primary (Filled Dark)**
- Background: `#171717` (`{colors.primary}`)
- Text: `#FFFFFF` (`{colors.canvas}`)
- Padding: `0px 24px`
- Height: `48px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `16px` / weight 500 / line-height 1.5 (`{typography.button-sm-strong}`)
- Border: none
- Box Shadow: none
- Hover State: `opacity: 0.85`
- Active State: `transform: scale(0.97)`

**Primary Small**
- Background: `#171717` (`{colors.primary}`)
- Text: `#FFFFFF` (`{colors.canvas}`)
- Padding: `0px 16px`
- Height: `36px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `14px` / weight 500 / line-height 1.38 (`{typography.button-xs}`)
- Border: none
- Hover State: `opacity: 0.85`
- Active State: `transform: scale(0.97)`

**Secondary (Filled Accent)**
- Background: `#F2B53A` (`{colors.accent}`)
- Text: `#0A0A0A` (`{colors.neutral-1}`)
- Padding: `0px 20px`
- Height: `40px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `14px` / weight 500 / line-height 1.38 (`{typography.button-xs}`)
- Border: none
- Hover State: `background-color: #F7C869`; `opacity: 0.85`
- Active State: `transform: scale(0.97)`

**Ghost (Light Fill)**
- Background: `#FAFAFA`
- Text: `#171717` (`{colors.primary}`)
- Padding: `0px 16px`
- Height: `40px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `14px` / weight 500 / line-height 1.38
- Border: none
- Box Shadow: none
- Hover State: `opacity: 0.85`; `background-color: #1A1A1A`; `color: #FFFFFF`
- Active State: `transform: scale(0.97)`

**Icon (Outline)**
- Background: `#FAFAFA`
- Text: `#171717` (`{colors.primary}`)
- Padding: `0px` (square/icon)
- Height / Width: `32px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `16px` / weight 400 / line-height 1.5
- Border: none
- Box Shadow: `#D4D4D4 0px 0px 0px 1px inset`
- Hover State: `opacity: 0.85`
- Active State: `transform: scale(0.97)`

### Cards & Containers

**Featured Card (Dark Invert)**
- Background: `#07170F` (`{colors.surface}`)
- Text: `#FFFFFF` (`{colors.canvas}`)
- Padding: `0px` (media-driven internal padding)
- Border Radius: `{rounded.md}` (`14.4px`)
- Border: none
- Box Shadow: `#1F2B25 0px 0px 0px 1px`
- Font: Geist, `16px` / weight 400 / line-height 1.5
- Hover State: `transform: translateY(−6px)`; `box-shadow: #D4D4D4 0px 0px 0px 1px inset, 0 12px 32px rgba(0, 0, 0, 0.25)`

**Default Card (Light)**
- Background: `#FFFFFF` (`{colors.canvas}`)
- Text: `#171717` (`{colors.primary}`)
- Padding: `32px`
- Border Radius: `{rounded.none}` (`0px`)
- Border: none
- Box Shadow: none
- Font: Geist, `16px` / weight 400 / line-height 1.5
- Hover State: `box-shadow: 0 0 0 1px #E5E7EB, 0 12px 32px rgba(0, 0, 0, 0.08)`; `transform: translateY(−3px)`

**Default Card Small (Elevated Light)**
- Background: `#FFFFFF` (`{colors.canvas}`)
- Text: `#171717` (`{colors.primary}`)
- Padding: `0px` (variant-driven internal spacing)
- Border Radius: `{rounded.sm}` (`12px`)
- Border: none
- Box Shadow: `#EAEAEA 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 8px 30px 0px`
- Font: Geist, `16px` / weight 400 / line-height 1.5
- Hover State: `box-shadow: 0 0 0 1px #E5E7EB, 0 12px 32px rgba(0, 0, 0, 0.08)`; `transform: translateY(−4px) rotate(−6deg)` or `scale(1.03)`

### Inputs & Forms

**Text Input (Default)**
- Background: `#FFFFFF` (`{colors.canvas}`)
- Text: `#171717` (`{colors.primary}`)
- Border Radius: `{rounded.none}` (`0px`)
- Border: `1px solid #E5E7EB` (`{colors.hairline}`)
- Padding: Inferred from link component (`4.8px 6.4px` vertical, `14.4px` horizontal)
- Font: Geist, `14px` / weight 400 / line-height 1.5
- Focus-Visible State: `outline: none`; (system manages focus styling separately via `:focus-visible { outline: 2px solid var(--focus); border-radius: 6px; }`)

### Navigation

**Navigation Bar (Default)**
- Background: transparent / `rgba(0, 0, 0, 0)`
- Text: `#171717` (`{colors.primary}`)
- Padding: `0px 24px`
- Height: `64px`
- Border Radius: `{rounded.none}` (`0px`)
- Border: none
- Box Shadow: none
- Font: Geist, `16px` / weight 400 / line-height 1.5
- Hover State (Link): `color: #171717` (emphasis); internal link styling applies hover underline and subtle transform

### Badges

**Badge Filled (Blue)**
- Background: `#E0F2FE`
- Text: `#0369A1` (`{colors.accent-2}`)
- Padding: `4px 11.2px`
- Height: `27.1875px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `12.8px` / weight 500 / line-height 1.5
- Border: none
- Box Shadow: none
- Hover State: `box-shadow: inset 0 0 0 1px #E5E7EB`

**Badge Filled Alt (Green)**
- Background: `#EAF5EF`
- Text: `#16523A` (`{colors.accent-1}`)
- Padding: `4px 11.2px`
- Height: `27.1875px`
- Border Radius: `{rounded.full}` (`9999px`)
- Font: Geist, `12.8px` / weight 500 / line-height 1.5
- Border: none
- Hover State: `box-shadow: inset 0 0 0 1px #E5E7EB`

## 5. Layout Principles

### Spacing System
**Base Unit:** `{spacing.xs}` = `8px`

**Scale (multiples of base):**
- `{spacing.xxs}` = `4px` (half-unit; micro-spacing between tight elements)
- `{spacing.xs}` = `8px` (base unit; button padding, tight card spacing)
- `{spacing.sm}` = `12px` (1.5x; interior form padding)
- `{spacing.md}` = `16px` (2x; standard padding, section gutters)
- `{spacing.lg}` = `20px` (2.5x; spacious component padding)
- `{spacing.xl}` = `24px` (3x; heading spacing, navigation padding)
- `{spacing.xxl}` = `28px` (3.5x; large gaps between features)
- `{spacing.xxxl}` = `32px` (4x; card internal padding; major section spacing)
- `{spacing.section}` = `36px` (4.5x; between major sections)
- `{spacing.band}` = `40px` (5x; hero bands, footer sections)

**Usage Context:**
- Button padding: `{spacing.md}` to `{spacing.lg}` (`16px–20px`)
- Card internal spacing: `{spacing.xxxl}` (`32px`)
- Section vertical rhythm: `{spacing.section}` to `{spacing.band}` (`36px–40px`)
- Form field gaps: `{spacing.md}` (`16px`)

### Grid & Container
- **Max Width:** Constrained to `1080px` at desktop scales (measured at 1280px+ viewport)
- **Navigation / Header:** Full-width, `64px` height, `0px–24px` padding horizontally
- **Section Padding:** `0px` horizontal at all breakpoints (content fills viewport edge-to-edge; internal padding applied per component)
- **Column Strategy:** Fluid at mobile/tablet; 4-column grid visible at 1024px+
- **Section Pattern:** Hero with radial gradient overlays; cards in 1, 2, or 3-column layouts depending on breakpoint; footer full-width

### Whitespace Philosophy
Whitespace is **generous and intentional**, reinforcing hierarchy and legibility:
- Large negative space between major sections (`{spacing.section}` vertical gaps)
- Substantial padding inside cards (`{spacing.xxxl}`)
- Headings separated from body by `{spacing.lg}` minimum
- Mobile sections use `0px` horizontal padding, allowing edge-to-edge content and relying on internal component padding for breathing room

### Border Radius Scale
- `{rounded.none}` = `0px` — cards, images, inputs, navigation (sharp, utilitarian aesthetic)
- `{rounded.xs}` = `9.6px` — minor decorative elements and some focus states
- `{rounded.sm}` = `12px` — elevated card variants and subtle container corners
- `{rounded.md}` = `14.4px` — featured cards and prominent containers
- `{rounded.full}` = `9999px` — all buttons, badges, and icon containers (pill-shaped, visual softness in interactive zones)

**Note:** Radius assignment is **role-specific**, not universal. Cards are sharp (`0px`), buttons are pills (`9999px`).

### Border Widths
- **Hairline (`1px`):** Borders on cards, form inputs, badge hover states; primary structural stroke throughout (`{colors.hairline}`)
- **Inset Stroke (`1px`):** Icon buttons and light input variants use inset box-shadow `1px` equivalent to indicate borders without taking layout space

## 6. Depth & Elevation

### Shadow Layers

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow | Default surfaces, cards on canvas |
| Subtle | `#EAEAEA 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 8px 30px 0px` | Elevated small cards; gentle lift on hover |
| Medium | `#E5E7EB 0px 0px 0px 1px` | Hairline border only; structural definition without depth |
| Dark Subtle | `#1F2B25 0px 0px 0px 1px` | Featured card stroke (dark mode inversion) |
| Inset | `#D4D4D4 0px 0px 0px 1px inset` | Icon buttons; defines interior boundary without lift |

**Philosophy:** The system employs **layered-micro** elevation—many barely-perceptible shadows and thin strokes rather than a single dramatic drop shadow. Depth is primarily achieved through **colour blocking** (light canvas vs. dark surface) and subtle transforms (hover scale/translate) rather than shadow multiplication. This creates a contemporary, minimal aesthetic suitable for technical education platforms.

### Opacity Levels
- `1.00` (100%) — default, fully opaque
- `0.99` (99%) — imperceptible dim; used on gradients
- `0.97` (97%) — subtle fade on overlays
- `0.85` (85%) — button hover dimming; noticeable but not drastic
- `0.50` (50%) — secondary or disabled states
- `0.35` (35%) — very faint text, captions
- `0.07` (7%) — ambient background texture (dot grids, gradient underlays)

### Z-index / Layering
- **Base** = `1` — Standard content, body elements
- **Dropdown** = `40`, `50`, `60`, `70` — Progressive layering for nested dropdowns and overlays; mobile menu and submenus stack at `50+`

## 7. Do's and Don'ts

### Do
- **Use negative letter-spacing on display typography.** The compressed tracking (`−4.05px` on Display XL, `−2.99px` on Display LG) is a defining trait of authority and modernity; apply it consistently.
- **Pair sharp containers with pill buttons.** The contrast between flat card corners (`0px`) and rounded button edges (`9999px`) is intentional and visual.
- **Rely on colour blocking and subtle transforms for depth.** Use `opacity`, `transform: scale()`, `transform: translateY()`, and thin strokes instead of large shadows.
- **Apply inset box-shadows to outline interactive elements.** Icon buttons and light input fields use `1px inset` strokes; this preserves layout integrity.
- **Stack opacity levels for disabled/secondary states.** Start at `0.85` (button hover), move to `0.50` (disabled), or `0.35` (captions).
- **Use Geist Mono exclusively for code and terminal content.** Never apply it to UI labels or body copy.
- **Apply radial gradients as ambient background texture.** Dot-grid (`1px` radial dot, `7%` opacity) and subtle colour bleeds create visual interest without competing for attention.
- **Respect the `9999px` focus-visible outline** (`6px` radius, separate from component radius). It breaks the pill/sharp dichotomy intentionally to signal keyboard focus.

### Don't
- **Do not round card corners.** Cards, images, and form inputs default to `0px` (`{rounded.none}`); use this sharp aesthetic to distinguish containers from buttons.
- **Do not invent shadows larger than the subtle micro-layer.** Avoid drop-shadows beyond the `8px blur` defined; the system prioritizes flatness.
- **Do not mix letter-spacing values.** All body and UI text is `0px` letter-spacing; only displays use negative tracking.
- **Do not apply colour to secondary button states without opacity changes.** Hover states use `opacity: 0.85` and `transform: scale(0.97)` or slight background shifts; avoid colour inversion.
- **Do not use serif or script typefaces.** Geist is the only approved face for UI; Press Start 2P is rare and decorative only.
- **Do not apply status colours (error red, success green, warning yellow).** The extracted system declares no semantic colour ramp; do not invent one.
- **Do not hide navigation links below 1024px without a toggle.** The system shows a menu button at mobile but leaves some nav visible; fully hidden navigation is not observed in the extraction.
- **Do not apply box-shadows to buttons.** Buttons are flat (no shadow) by default; only inset strokes on icon buttons.

## 8. Responsive Behavior

### Breakpoints

| Viewport Width | Content Max Width | Grid Columns | Visible Nav Links | Menu Toggle | Display Heading (Hero) | Body Text Size | Section Padding X |
|---|---|---|---|---|---|---|---|
| 375px | 375px | 6 | 1 link | Yes | 40px (`{typography.display-md}`) | 16px (`{typography.body-md}`) | 0px |
| 768px | 768px | 6 | 3 links | Yes | 48px (calculated) | 16px (`{typography.body-md}`) | 0px |
| 1024px | 1024px | 7 | 10 links | Yes | 63px (calculated) | 16px (`{typography.body-md}`) | 0px |
| 1280px+ | 1080px (max) | 4 | 10 links | Yes | 74px (`{typography.display-xl}` / `73.6px`) | 16px (`{typography.body-md}`) | 0px |

**Key Observations:**
- **Horizontal padding is always `0px`** at all breakpoints; content flows edge-to-edge, with internal component padding providing spacing.
- **Navigation links collapse from 10 visible at desktop to 1 at mobile**, but menu toggle remains visible; no fully hidden navigation pattern observed.
- **Display heading scales from `40px` (mobile) to `73.6px` (desktop)** using Display MD, DG LG, and Display XL tokens.
- **Grid columns range from 6 at tablet to 4 at desktop**, implying a fluid layout with responsive re-arrangement rather than fixed grid shifts.

### Touch Targets
- **Minimum interactive height:** `36px` (small buttons, `{spacing.md}` padding)
- **Standard interactive height:** `40px–48px` (buttons, form fields, navigation items)
- **Icon buttons:** `32px` minimum
- **Link padding:** `4.8px` vertical, `14.4px` horizontal (inset box-shadow preserves clickable area)

### Collapsing Strategy
- **Mobile (375px):** Stack cards vertically; hero text reduces to Display MD; 1 nav link visible + menu toggle; sections use full viewport width with no horizontal padding.
- **Tablet (768px):** Cards begin 2-column layout; hero text rises to mid-range; 3 nav links visible; grid column count increases to 6.
- **Desktop (1024px+):** Cards in 2–3 column grids or full-width depending on feature; hero reaches Display XL; navigation fully expanded; content constrained to `1080px` max-width; grid column count stabilizes at 4 or 7 depending on layout context.

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Primary / Brand Ink (`#171717`)
- **Secondary CTA:** Brand Accent (`#F2B53A`)
- **Background Canvas:** White (`#FFFFFF`)
- **Dark Card Surface:** Surface (`#07170F`)
- **Heading & Primary Text:** Primary Ink (`#171717`)
- **Body Text:** Body (`#666666`)
- **Secondary Text / Captions:** Muted (`#BDBDBD`)
- **Borders & Strokes:** Hairline (`#E5E7EB`)
- **Decorative Overlays:** Accent 1 (forest green `#16523A`), Accent 2 (sky blue `#0369A1`), Accent 3 (warm amber `#C98E12`)

### Iteration Guide
1. **Typography is high-contrast.** Display sizes use negative letter-spacing (`−4.05px` minimum); all body and UI is `0px` tracking. Never flatten this distinction.
2. **Buttons are pill-shaped (`9999px` radius); cards are sharp (`0px` radius).** This contrast is intentional and signals interactive vs. container zones.
3. **Depth via colour, not shadow.** Use light/dark surface pairs, subtle opacity shifts (`0.85` hover), and micro-transforms (`scale(0.97)`, `translateY(−3px)`) instead of drop-shadows.
4. **All section padding is internal to components; no horizontal gutters on body.** Content flows edge-to-edge; padding lives on cards, buttons, and typography.
5. **Focus-visible outlines are `2px solid` at `6px` border-radius**, breaking the pill/sharp system intentionally to signal keyboard focus.
6. **Hover states are multi-faceted:** buttons use `opacity: 0.85` + optional `transform: scale(0.97)`; cards use `transform: translateY(−3px)` + shadow lift; links use `text-decoration: underline` + subtle transform.
7. **Badges and interactive elements max out at `12.8px` / `{typography.code-sm}` font size** with `500` weight for emphasis despite small size.
8. **Radial gradients with `0.07` opacity create ambient texture** (dot grids) without visual noise; use these on hero and section backgrounds.
9. **Responsive is mobile-first:** base styles for 375px, scale up to 1080px content width at desktop. Navigation toggle always present; visibility of nav links increases with viewport.
10. **No status/semantic colour ramp exists.** Error, success, warning states are not declared; do not invent them. Use opacity and disabled state patterns instead.

## 10. Known Gaps

- **No error/success/warning semantic colours extracted.** The site does not expose a status colour ramp; implementation of validation states must infer from opacity/disabled patterns or await brand extension.
- **Interaction states partially captured.** Hover, active, and focus states are present for buttons, cards, and links, but disabled state CSS was not extracted; assume `opacity: 0.50` or similar reduction for disabled controls.
- **No data-driven state variants.** Loading, empty, and error states for complex components (modals, data tables, forms) are not observed in the extraction.
- **Dark mode not confirmed.** The extracted system is single-theme light; no dark-mode stylesheet was measured or toggled. The `derived` theme indicator in the token set marks computed values, not a shipped dark variant.
- **5 colour tokens have no measured role.** Accent 1 (`#16523A`), Accent 2 (`#0369A1`), Accent 3 (`#C98E12`), and the interactive surface tints (`#E0F2FE`, `#EAF5EF`) appear only in gradient overlays or badge fills; no broader semantic assignment is evident.
- **Animation/transition timings not specified.** Extracted interaction states show transforms and opacity shifts but no `transition` duration or `cubic-bezier()` timing function; assume `150–200ms` ease-out for smooth UX.
- **Typography on decorated backgrounds not measured.** Text contrast over radial gradient overlays (hero section, section backgrounds) was not explicitly validated; verify WCAG AAA compliance when overlaying text on the `0.07` opacity dot-grid or colour gradient layers.
- **Breakpoint ranges are measured points, not complete coverage.** Intermediate viewports (480px, 640px, 960px) were not captured; scale linearly between measured breakpoints.
- **Code typography size variation.** Six code sizes are defined (`{typography.code-xs}` through `{typography.code-xl}`), but component-to-size mapping (inline vs. block) was not exhaustively extracted; apply context-sensitively.
- **Link hover transform direction.** One link hover state shows `translate(2px, −2px)` while another shows `underline`; both are valid, but the specific trigger (external link vs. internal navigation) was not disambiguated.
- **Gradient background colour values sourced from CSS.** The radial gradient overlays use literal RGB values in shorthand (e.g., `rgb(224, 242, 254)` inferred to `#E0F2FE`); cross-reference these with the extracted badge fill colours to ensure consistency.
- **Surfaces behind authentication or in dynamic states not visited.** This extraction is based on publicly visible pages only; admin interfaces, user dashboards, or conditional UI flows may deviate from the documented system.

---

**Metadata:**
- **Source:** https://rpl.tamsis.site/
- **Page Title:** RPL / PPLG — SMK Tamansiswa Jetis Yogyakarta
- **Analysis Date:** Single-page extraction (publicly visible only)
- **Primary Font:** Geist (humanist sans-serif, 17 sizes, weights 400–600)
- **Monospace Font:** Geist Mono (fixed-width technical content)
- **Accent Font:** Press Start 2P (decorative, rare use)
- **Extraction Coverage:** 12 colour tokens, 23 typography roles, 10 spacing units, 4 border-radius values, 4 shadow/elevation layers, 6 opacity levels, 4 z-index tiers, 5 responsive breakpoints, 10+ component variants