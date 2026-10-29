---
name: Smart Retail Intelligence
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004f35'
  on-tertiary: '#ffffff'
  tertiary-container: '#006948'
  on-tertiary-container: '#76eab6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  metric-mono:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system projects authority, surgical operational clarity, and high-velocity workflow management for next-generation store operations and automated inventory control. Built for inventory operators, category managers, and retail analysts, the visual direction synthesizes crisp enterprise minimalism with modern high-performance SaaS cues. 

The aesthetic is clean, rigorous, and functional—inspired by modern enterprise patterns with calibrated typographic hierarchy. Visual tension is achieved by pairing technical, high-precision geometry in display metrics against human-centered, legible body text. Surfaces remain clinical, sterile, and light to prioritize SKU data density, scan results, real-time demand charts, and audit alerts without visual fatigue.

## Colors

The palette establishes an authoritative, high-contrast operational environment optimized for rapid readability under store-floor lighting and executive review.

- **Primary (`#1D4ED8`)**: Deep royal indigo delivering decisive visual focus for primary operational triggers, critical CTA flows, active navigation links, and batch actions. An interactive hover state steps to `#1E40AF`, while a softer `#2563EB` handles digital focus rings and secondary micro-interactions.
- **Secondary (`#0F172A`)**: Slate 900 serves as the anchor for headers, structural shell elements, high-importance labels, and deep structural frames.
- **Tertiary (`#059669`)**: Pure emerald green dedicated to positive operational feedback: healthy stock thresholds, finalized reconcile audits, and live inventory sync indicators.
- **Neutral (`#64748B`)**: Slate neutral handling structural borders (`#E2E8F0`), secondary metadata, muted icons, and table horizontal delimiters.
- **Functional Warnings & Criticals**: Amber (`#D97706`) governs low-stock warnings, reorder prompts, and pending shipments. Crimson (`#DC2626`) is reserved strictly for out-of-stock criticals, sensor disconnects, and reconciliation discrepancies.
- **Surfaces**: Layered white base (`#FFFFFF`) framed against canvas slate tint (`#F8FAFC`) and muted module backing (`#F1F5F9`).

## Typography

Typography establishes an intentional contrast between high-velocity metric interpretation and fatigue-free operational reading.

- **Headlines & KPI Metrics (`Space Grotesk`)**: Provides an authoritative, technical retail instrument tone. Used for top-tier analytical dashboards, inventory counts, shelf-allocation percentages, and modal headers. Letter tracking is slightly tightened to retain cohesion at high scale.
- **Body & Controls (`Plus Jakarta Sans`)**: Provides balance with soft, neutral clarity. Its open apertures maintain high legibility in dense data tables, nested SKU metadata lists, and fast-paced warehouse barcode scanning views.
- **Form Controls & Micro-Badges**: Rely on `label-sm` rendered in semi-bold styling to guarantee immediate identification of stock states (`IN STOCK`, `PAR LEVEL DEFICIT`) even at low monitor resolutions or on handheld scanners.

## Layout & Spacing

The layout is built upon a standard 12-column fluid grid system paired with strict 8pt modular vertical increments. 

- **Structure**: Dashboard screens utilize an expansive fluid frame containing a fixed 260px collapsible operational navigation sidebar, paired with an offset work surface bounded by a max container width of 1600px for large multi-monitor retail setups.
- **Breakpoints**:
  - **Desktop (≥1200px)**: 12 columns, 24px (`1.5rem`) gutters, 32px (`2rem`) page outer padding.
  - **Tablet (768px – 1199px)**: 8 columns, 16px (`1rem`) gutters, 24px (`1.5rem`) page outer padding. Collapses side navigation into an off-canvas drawer.
  - **Mobile (<768px)**: 4 columns, 16px (`1rem`) gutters, 16px (`1rem`) screen margins. Complex tabular grids collapse into structured card lists.
- **Component Rhythms**: Use `space-xs` (4px) and `space-sm` (8px) for badge internals, input padding, and icon pairing. `space-md` (16px) establishes standard card interior padding and control stacking, while `space-lg` (24px) separates card header zones from table regions.

## Elevation & Depth

Visual hierarchy uses crisp boundary containment combined with subtle, low-spread ambient shadows that preserve clean, high-contrast separation without muddying background panels.

- **Level 0 (Flat / Canvas)**: Base surface `#F8FAFC`. Zero elevation. Demarcated by 1px solid `#E2E8F0` borders.
- **Level 1 (Cards, KPI Modules, List Groups)**: Pure `#FFFFFF` surface stacked on `#F8FAFC`. Structured with `border: 1px solid #E2E8F0` and subtle ambient shadow: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Dropdowns, Popovers, Active Hovered Cards)**: Raised operational overlays utilize `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)` over a 1px `#CBD5E1` boundary.
- **Level 3 (Modal Dialogues, Quick-Audit Drawers, Flyouts)**: High-priority operational modals feature high-definition projection: `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)` coupled with a frosted translucent backdrop (`rgba(15, 23, 42, 0.4)` with 4px backdrop blur).

## Shapes

The design system incorporates geometric roundedness (Level 2), applying a clean `0.5rem` (8px) baseline corner radius across functional interactive components to combine modern approachability with enterprise restraint.

- **Standard Elements (8px / `0.5rem`)**: Applied universally to buttons, inputs, filter dropdowns, table card housings, and notification toasts.
- **Compound Components (16px / `1rem`)**: Reserved for large data container cards, summary modal frames, and retail zone heat-map overlays (`rounded-lg`).
- **Pill Accents (`9999px`)**: Utilized strictly for category tags, SKU status chips, and real-time live telemetry counters to distinguish them from actionable buttons and data rows.

## Components

### Buttons
- **Primary**: Solid `#1D4ED8` background, `#FFFFFF` text, `0.5rem` border-radius, minimum height 40px (padding: 8px 16px). Hover state transitions to `#1E40AF`. Focus ring features a 2px offset with 3px `#93C5FD` stroke.
- **Secondary**: `#FFFFFF` surface, 1px solid `#CBD5E1` border, `#0F172A` text. Hover shifts background to `#F1F5F9` with border `#94A3B8`.
- **Destructive**: Solid `#DC2626` background, `#FFFFFF` text. Used for stock write-offs, void audits, and catalog deletions.

### Cards & Metrics
- Constructed on clean `#FFFFFF` ground with 1px `#E2E8F0` outer line. Header bands are separated by 1px bottom border `#F1F5F9`.
- Metric Cards feature a top-aligned label (`label-sm`, color `#64748B`), an oversized Space Grotesk number (`metric-mono`, color `#0F172A`), and a bottom-aligned delta badge indicating reorder velocity.

### Chips & Badges
- Pill-shaped (`rounded-full`), horizontal padding of 8px, vertical padding of 2px. Font size `12px`, semi-bold weight.
- **In Stock**: `#ECFDF5` background, `#047857` text, 1px solid `#A7F3D0`.
- **Low Stock**: `#FFFBEB` background, `#B45309` text, 1px solid `#FDE68A`.
- **Critical / Out of Stock**: `#FEF2F2` background, `#B91C1C` text, 1px solid `#FECACA`.

### Data Tables
- Header row uses `#F8FAFC` background, uppercase `12px` Plus Jakarta Sans text, tracking `0.05em`, color `#64748B`.
- Row height fixed to 52px for high scanning density. Subtle `1px solid #F1F5F9` bottom divider.
- Alternate row striping is avoided in favor of direct cursor hover lighting (`#F8FAFC`).

### Input Fields & Controls
- Standard height 40px, `#FFFFFF` background, 1px solid `#CBD5E1` border, `0.5rem` radius. Text is `#0F172A`, placeholder is `#94A3B8`. Active focus triggers a 1px border switch to `#1D4ED8` alongside a 3px outer glow ring of `rgba(29, 78, 216, 0.15)`.
- Checkboxes and radios use a 18px footprint with an active primary `#1D4ED8` fill and a crisp white check glyph.

### Operational Scanners & Drawers
- Off-canvas quick-audit drawers utilize level-3 elevation, anchoring to the right margin with a persistent 480px width, designed for side-by-side SKU modification while maintaining background table context.