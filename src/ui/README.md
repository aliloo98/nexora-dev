# Nexora UI V2

Nexora UI V2 is the presentation-only component library for the product.

## Boundaries

- Components import only files inside `src/ui`.
- Components receive prepared values and callbacks.
- Components never import Supabase, storage, services, or financial logic.
- New CSS classes use the `nx-` prefix.
- New components never use inline styles.
- Motion durations are capped at 250 ms.

## Usage

Import JavaScript from the public barrel:

```js
import { createButton, createCoachCard } from './ui/index.js'
```

The application entry point already loads `src/ui/index.css`. Render new components
inside an element carrying `nx-scope` while the legacy interface is being migrated:

```js
const host = document.createElement('section')
host.className = 'nx-scope'
host.appendChild(createButton({
  label: 'Continuer',
  variant: 'primary',
  onClick: handleContinue
}))
```

## Local catalogue

Run `npm run dev`, then open `/nexora-ui-v2.html`.

The catalogue is not linked from the product and is not part of the production Vite
entry point.

## Verification

- `npm run test:ui`
- `npm run architecture:ui`
- `npm run test:e2e:ui`

See `docs/nexora-ui-v2-design-system.md` for component contracts and migration rules.
