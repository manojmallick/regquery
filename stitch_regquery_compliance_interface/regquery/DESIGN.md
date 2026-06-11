---
name: RegQuery
colors:
  surface: '#0d1322'
  surface-dim: '#0d1322'
  surface-bright: '#33394a'
  surface-container-lowest: '#080e1d'
  surface-container-low: '#151b2b'
  surface-container: '#191f2f'
  surface-container-high: '#242a3a'
  surface-container-highest: '#2f3445'
  on-surface: '#dde2f8'
  on-surface-variant: '#bacbb7'
  inverse-surface: '#dde2f8'
  inverse-on-surface: '#2a3040'
  outline: '#849582'
  outline-variant: '#3b4b3b'
  surface-tint: '#00e560'
  primary: '#a2ffaa'
  on-primary: '#003912'
  primary-container: '#00ed64'
  on-primary-container: '#006626'
  inverse-primary: '#006e2a'
  secondary: '#adc6ff'
  on-secondary: '#002e69'
  secondary-container: '#0162cf'
  on-secondary-container: '#dae4ff'
  tertiary: '#ffe6d2'
  on-tertiary: '#4b2800'
  tertiary-container: '#ffc28a'
  on-tertiary-container: '#7a4e20'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#69ff87'
  primary-fixed-dim: '#00e560'
  on-primary-fixed: '#002108'
  on-primary-fixed-variant: '#00531e'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#004494'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#f7bb83'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#663d11'
  background: '#0d1322'
  on-background: '#dde2f8'
  surface-variant: '#2f3445'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  grid-margin: 24px
  gutter: 16px
  container-max-width: 1440px
---

## Brand & Style

The design system is engineered for high-stakes regulatory intelligence, prioritizing clarity, authority, and rapid data synthesis. The brand personality is technical and precise, designed to instill confidence in legal and compliance professionals navigating complex global requirements.

The visual style is **Corporate Modern** with a focus on high-density information architecture. It leverages a deep, dark environment to reduce eye strain during long research sessions, using vibrant semantic accents to guide the eye toward critical regulatory changes. The aesthetic is "SaaS-Elite"—clean, structured, and utilitarian, avoiding decorative fluff in favor of functional precision.

## Colors

The palette utilizes a "Deep Sea" foundation to provide maximum contrast for the primary brand color. 

- **Primary (#00ED64):** Reserved for high-priority actions, active states, and successful regulatory matches. Its high luminosity against the dark background ensures it serves as a beacon.
- **Secondary (#4285F4):** Used for interactive text, links, and secondary intelligence categories.
- **Surface Strategy:** We use a tiered dark approach. The base background is the darkest (#0B1120), while cards and containers use a slightly elevated navy (#131F35) to create a sense of structure without needing heavy shadows.
- **Semantic Indicators:** Critical for risk assessment. Success, Warning, and Error colors are strictly mapped to confidence levels and regulatory impact scores.

## Typography

This design system utilizes **Inter** exclusively for its neutral, highly legible characteristic at small sizes. 

- **Headlines:** Use semi-bold weights with slight negative letter-spacing to maintain a compact, "newsroom" feel.
- **Body Text:** Optimized for long-form reading of legal statutes. `body-md` is the standard for article content, ensuring line heights are generous (1.5x) to prevent "wall of text" fatigue.
- **Labels:** Small caps or uppercase are used for category tags and confidence badges to distinguish them from prose.
- **Technical Text:** For regulatory IDs or version numbers, a monospaced font (JetBrains Mono) may be used within the Inter framework for visual differentiation.

## Layout & Spacing

The layout follows a **Strict 8px Grid** system to ensure mathematical alignment across complex data tables and dashboards.

- **Desktop:** 12-column fluid grid with 24px margins. For document-heavy views, a centered 8-column "reading lane" is preferred to limit line length.
- **Sidebar:** A fixed 280px navigation rail on the left for quick access to jurisdictions and search history.
- **Density:** Data density is "Medium-High." Use 12px padding for table cells and 24px padding for main content cards to balance information volume with white space (or "dark space").

## Elevation & Depth

This design system avoids traditional drop shadows in favor of **Tonal Layering and Borders**. 

1.  **Level 0 (Base):** `#0B1120` — The canvas for the entire application.
2.  **Level 1 (Surface):** `#131F35` — Used for cards, sidebars, and header bars.
3.  **Borders:** All surface transitions are defined by a `1px` solid border (`#1E3050`). This provides a crisp, structural feel that shadows cannot achieve in a dark UI.
4.  **Active State:** When an element is focused or active, the border color shifts to the Primary (`#00ED64`) or Secondary (`#4285F4`) color, effectively using "light" as the indicator of depth.

## Shapes

The shape language is primarily **Rounded (0.5rem)** for containers and inputs, creating a professional yet modern appearance. 

- **Pills:** A specific exception is made for status badges, tags, and confidence indicators, which use the **Full Pill (rounded-full)** style. This distinct shape makes them immediately recognizable as metadata against the more rectangular structural elements.
- **Interactive Elements:** Buttons and form inputs follow the standard 8px radius to maintain consistency with the grid.

## Components

- **Buttons:** Primary buttons use a solid `#00ED64` background with dark text for maximum contrast. Secondary buttons use an outlined style with the `#4285F4` color.
- **Pill Badges:** Used for "Confidence Levels" (e.g., High, Medium, Low). These should use a subtle background tint (15% opacity) of the semantic color with a solid 1px border of the same color.
- **Input Fields:** Backgrounds should be slightly darker than the surface color to create an "inset" feel. Use `#F0F6FF` for typed text and `#7B8FA6` for placeholders.
- **Cards:** Cards should not have shadows. Use the `#131F35` surface color and `#1E3050` border. Titles within cards should always be `title-lg`.
- **Data Tables:** Use zebra-striping with a 2% opacity difference between rows. Headers should be `label-md` with a subtle bottom border to anchor the data.
- **Status Indicators:** Use 8px glowing dots (using CSS `box-shadow: 0 0 8px [color]`) for "Live" regulatory feeds to denote real-time activity.