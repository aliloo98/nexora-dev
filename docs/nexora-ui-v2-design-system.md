# Nexora UI V2 — Design System

## 1. Purpose

Nexora UI V2 implements the product principle **Calm intelligence**: a calm,
readable and precise interface that helps a person decide without adding visual
noise. This package is presentation-only. Financial decisions and calculations
remain in presenters, engines and services outside `src/ui`.

## 2. Architecture

```text
src/ui/
  tokens/       CSS source of truth
  foundation/   scoped reset, base, accessibility, utilities
  layout/       AppShell, PageHeader, Stack, Cluster, Divider
  primitives/   Button, Card, Input, Badge, Chip, Progress
  components/   financial and feedback components
  icons/        eight local currentColor SVG icons
  internal/     shared DOM helpers
  catalog/      local-only component preview
  tests/        Node unit tests
  index.js      public JavaScript exports
  index.css     public stylesheet
```

All new CSS is loaded after the legacy design stylesheet. Tokens are global, but
foundation and component behavior is opt-in through `.nx-scope` and `nx-*`
classes. The package has no external runtime dependency.

## 3. Tokens

### Color

The canonical palette is declared in `tokens/colors.css`.

- canvas: `--nx-color-canvas`
- surfaces: `--nx-color-surface-1` through `--nx-color-surface-3`
- text: `--nx-color-text-primary`, `secondary`, `tertiary`, `inverse`
- action: `--nx-color-gold`, `--nx-color-gold-hover`
- semantics: `stable`, `success`, `warning`, `danger`, `info`
- structure: border, overlay, backdrop, hover, disabled and focus tokens

Semantic colors never depend on a user theme. A future theme may change only
`--nx-color-accent-decorative`.

### Spacing

The spacing scale is 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 and 80 px. Components
use the named tokens from `none` to `6xl`; they do not introduce local spacing
values. Responsive gutters are 16, 24 and 32 px.

### Typography

The interface uses Outfit with a system fallback. Useful text never falls below
12 px. Amounts use `.nx-numeric` for tabular figures. Heading levels are selected
semantically by the caller; size is handled by the component.

### Radius and elevation

- small control: 8 px
- button/input: 12 px
- card: 16 px
- hero/modal: 20 px
- badge/chip: pill

Normal surfaces use borders without shadow. Elevated cards and modals use the two
documented shadow tokens.

### Motion

Durations are 0, 100, 160, 220 and 250 ms. Components use only state transitions.
`prefers-reduced-motion` reduces scoped animations and transitions to an
effectively instant duration.

### Responsive and layers

The four reference breakpoints are 480, 768, 1024 and 1280 px. Layout is
mobile-first. The z-index scale covers content, sticky UI, dropdowns, backdrop,
modal and toast.

## 4. Component contracts

All factories accept an options object and an optional `documentRef` as the second
argument. The injectable document keeps structure tests independent from a browser.
Returned values are DOM elements, except Modal and Toast which return controllers.

### Primitives

#### Button

```js
createButton({
  label: 'Continuer',
  variant: 'primary',
  size: 'default',
  loading: false,
  disabled: false,
  icon: 'arrowRight',
  onClick
})
```

Variants are `primary`, `secondary`, `ghost`, and `danger`. Sizes are `default`,
`compact`, and `icon-only`. An icon-only button requires `ariaLabel`. Loading
disables activation and exposes an accessible status.

#### Card

```js
createCard({ variant: 'elevated', padding: 'default', children })
```

Variants are `default`, `elevated`, `interactive`, and `critical`. An interactive
card requires `onActivate` and supports Enter and Space.

#### Input

```js
createInput({
  id: 'monthly-income',
  label: 'Revenus',
  helper: 'Montant net',
  error: null,
  suffix: '€'
})
```

An id or name and a persistent label are mandatory. Helper and error messages are
associated through `aria-describedby`; errors set `aria-invalid`.

#### Badge and Chip

Badge is non-interactive. Chip is a controlled selection button using
`aria-pressed`; its callback receives the requested next state.

#### Progress

Progress uses the native `<progress>` element. It supports determinate and
indeterminate states, min/max/value, accessible labels, and 4 or 8 px thickness.

### Composed components

- `MetricCard`: label, displayed value, context, trend and tone; no CTA.
- `CoachCard`: one title, one description, one level and at most one action.
- `GoalCard`: values and percentage supplied by a presenter; no division or forecast.
- `Modal`: mounted controller with `open`, `close`, `destroy`, focus trap,
  Escape, backdrop policy, scroll lock and focus restoration.
- `ToastRegion`: mounted controller with `show`, `dismiss`, `destroy`, live
  announcements, optional action, pausable timer and cleanup.
- `Skeleton`: static text, block or circle placeholder, hidden from assistive tools.
- `SectionHeader`: safe configurable heading level and one optional action.
- `EmptyState`: icon, title, description and one recovery action.
- `LoadingState`: accessible in-place loading announcement.
- `StatRow`: label, prepared value, helper, tone and one optional secondary action.

### Layout

- `AppShell`: maximum width and responsive gutters; it does not own navigation.
- `PageHeader`: page title, description and one action.
- `Stack`: vertical flow with tokenized gaps.
- `Cluster`: wrapping horizontal flow with tokenized gaps and alignment.
- `Divider`: horizontal full or inset separator.

## 5. Iconography

The package contains only close, check, warning, info, chevron, spinner, plus and
arrow-right. Icons are local SVG, use `currentColor`, 20 or 24 px sizes, and a
1.75 px stroke. Decorative icons are hidden from assistive technologies; the
interactive control owns the accessible name.

No Folded Ring or product logo is created by this package.

## 6. Accessibility rules

- WCAG AA color combinations are the target.
- Focus is never removed and uses a visible two-layer ring.
- Default controls are 48 px; compact controls remain at least 44 px.
- Labels are persistent and validation messages are associated.
- Modal focus is trapped and restored.
- Toasts use polite status announcements or alerts for danger.
- Components do not rely on hover or color alone.
- Heading levels remain a caller decision with safe fallbacks.
- Reduced motion is respected.
- Text content is inserted with `textContent`, never raw HTML.

## 7. Composition rules

Do:

- prepare financial strings and percentages in a presenter;
- use Card as the common surface;
- expose one main action per screen;
- use Badge for information and Chip for selection;
- mount Modal and Toast once per relevant application boundary;
- keep DOM order meaningful on every viewport.

Do not:

- import services or storage from `src/ui`;
- calculate balances, percentages, forecasts or recommendations in a component;
- add inline styles or unprefixed classes;
- nest buttons inside a clickable Card;
- use a placeholder instead of a label;
- display the Coach score;
- create an additional icon dependency for a small icon set;
- add local colors, spacing or motion durations.

## 8. Legacy coexistence

The following remain transitional:

- `styles.css`
- `src/styles/design-system.css`
- `src/styles/authStyles.js`
- legacy `.btn`, `.card`, `.form-input`, `.modal-*`, and `.toast`
- runtime themes
- legacy modals and toasts in product screens

New code must not use those classes. A future screen migration wraps its new root in
`.nx-scope`, replaces one surface at a time, validates it, then removes only the
legacy selectors made obsolete by that migration.

The older numbered `--nx-space-*` tokens remain untouched because existing pages
consume them. V2 uses named spacing tokens to avoid changing legacy geometry.

## 9. Catalogue and verification

The local catalogue is available at `/nexora-ui-v2.html` while Vite is running.
It is absent from application navigation and from the production build entry.

Quality commands:

```text
npm run test:ui
npm run architecture:ui
npm run test:e2e:ui
```

The targeted architecture check rejects external/data imports, inline styles,
unprefixed classes, non-token color literals, motion over 250 ms, unsafe component
selectors and useful text below 12 px. It applies only to V2 and does not fail on
documented legacy debt.

## 10. Component status

Implemented in Sprint 1:

- all tokens and foundations;
- five layout primitives;
- six UI primitives;
- ten composed components;
- eight icons;
- local catalogue;
- Node unit tests, architecture rules and targeted E2E.

Not migrated in Sprint 1:

- landing and authentication;
- dashboard and simplified mode;
- Budget, Plan, Goals, Debts, History, Settings and Couple;
- legacy modal/toast consumers;
- runtime themes;
- brand assets and Folded Ring;
- legacy typography and icons.
