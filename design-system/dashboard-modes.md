# Dashboard Modes

## Overview

Nexora Dashboard supports two UX modes to accommodate different user preferences and complexity levels:

- **Mode Simplifié**: Essential information only, streamlined interface
- **Mode Complet**: Full dashboard with advanced analytics and projections

## Mode Storage

The current mode is stored in:
- **Key**: `nexora_ux_mode_v1` in `SafeStorage` (or localStorage fallback)
- **Values**: `'simple'` or `'complete'` (default: `'complete'`)
- **Access**: Via `window.setNexoraUxMode(mode)` and `window.getNexoraUxMode()`

## Mode Implementation

### Core Functions

Mode management is implemented in `index.html` with browser-safe functions:

```javascript
// Get current mode
window.getNexoraUxMode() // Returns 'simple' or 'complete'

// Set mode and apply visibility
window.setNexoraUxMode('simple' | 'complete')

// Apply mode to DOM (internal function)
applyNexoraUxMode(mode)
```

These functions are defined globally and available throughout the application.

### Body Classes (Compatibility)

For compatibility with other parts of the application:
- `body.mode-simple` - Active when simplified mode is selected
- `body.mode-complete` - Active when complete mode is selected

### Visibility Control

Mode distinction is implemented using the HTML `hidden` attribute on elements marked with `data-dashboard-mode="complete"`:

```javascript
// In applyNexoraUxMode():
document.querySelectorAll('[data-dashboard-mode="complete"]').forEach((element) => {
  element.hidden = isSimple;
});
```

**Design System Scope**: The dashboard-shell container carries the `nx-scope` class, which enables the native `hidden` attribute to work correctly via the Design System reset rule:

```css
.nx-scope [hidden] {
  display: none !important;
}
```

**No CSS selector debt**: This approach uses the native `hidden` attribute instead of CSS rules that would create new selector-scope violations.

### Module Visibility

**Mode Simplifié** (Essential only):
- ✅ Hero (Cockpit Financier)
- ✅ Goal (Objectif d'épargne)
- ✅ Coach (Recommandation personnalisée)
- ❌ Timeline (Prochaine étape)
- ❌ Treasury Chart (Courbe de trésorerie)
- ❌ Donut Chart (Répartition des dépenses)
- ❌ Analytics Grid (Projections annuelles, taux d'épargne, marge de sécurité)
- ❌ Dual Grid (Détails supplémentaires)

**Mode Complet** (Full experience):
- ✅ All Simplified mode elements
- ✅ Timeline (Prochaine étape)
- ✅ Treasury Chart (Courbe de trésorerie)
- ✅ Donut Chart (Répartition des dépenses)
- ✅ Analytics Grid (Projections annuelles, taux d'épargne, marge de sécurité)
- ✅ Dual Grid (Détails supplémentaires)

## Mode Switching

Mode switching triggers:
1. `window.setNexoraUxMode(mode)` - Saves to storage and calls applyNexoraUxMode
2. `applyNexoraUxMode(mode)` - Updates body classes, hidden attributes, and triggers refreshes
3. `scheduleAssistantRefresh()` - Refreshes assistant data
4. `window.refreshDashboardCoach()` - Updates coach recommendations
5. `updateAll()` - Full data refresh
6. `window.NexoraMotion?.animateModeSwitch?.()` - Mode transition animation

### Async Renderers

For dynamically inserted elements after initial load, set the `hidden` attribute at creation time based on the current mode:

```javascript
const isSimple = window.getNexoraUxMode?.() === 'simple';
const element = document.createElement('div');
element.setAttribute('data-dashboard-mode', 'complete');
element.hidden = isSimple; // Set immediately based on current mode
container.appendChild(element);
```

This ensures newly created complete-only elements are immediately hidden in Simple mode.

## Design Principles

### Mode Simplifié
- **Focus**: Current financial status and immediate actions
- **Use case**: Quick daily check, mobile users, users preferring simplicity
- **Content**: Hero, Goal, Coach only

### Mode Complet
- **Focus**: Comprehensive financial overview and advanced insights
- **Use case**: Detailed planning, trend analysis, users wanting full context
- **Content**: All Simplified elements + Timeline, Charts, Analytics

## Implementation Guidelines

### Adding New Components

When adding new dashboard components, determine their mode visibility:

1. **Essential for all users**: Add without `data-dashboard-mode` attribute
2. **Advanced/Complete only**: Add `data-dashboard-mode="complete"` attribute

Example:
```html
<!-- Essential - visible in both modes -->
<section class="dashboard-module dashboard-module--new-essential">
  <!-- Content -->
</section>

<!-- Advanced - visible in Complete mode only -->
<section class="dashboard-module dashboard-module--new-advanced" data-dashboard-mode="complete">
  <!-- Content -->
</section>
```

### Testing

Mode switching is tested in `tests/playwright/dashboard-mode-superset.spec.js`:
- Verifies Simplified mode hides advanced elements (strict assertions, no optional checks)
- Verifies Complete mode shows all elements (strict assertions, no optional checks)
- Tests mode toggle functionality
- Validates Complete mode is a strict superset of Simplified mode (simple ⊂ complete)
- Tests mode persistence across page reload

Tests use the actual runtime API:
```javascript
window.setNexoraUxMode('simple')
window.getNexoraUxMode()
```

## Migration Notes

### Legacy Selectors (DO NOT USE)
The following legacy selectors are dead and should not be used:
- `.simple-dashboard-grid`
- `[data-mode="complete"]`
- `[data-mode="simple"]`
- `.kpi-grid`
- `.dashboard-secondary-kpis`
- Various `.assistant-*` legacy selectors

### V2 Architecture
The current Dashboard V2 Modular architecture uses:
- `.dashboard-v2-modular` as main container
- `.dashboard-module--*` for individual modules
- `data-dashboard-mode` attributes for visibility control

## Accessibility

Mode switching respects:
- Reduced motion preferences
- Keyboard navigation
- Screen reader announcements
- Color contrast requirements

## Performance Considerations

- Mode switching is immediate (no page reload)
- Async renderers handle data updates gracefully
- No unnecessary data fetching on mode change
- Mode state persists across sessions
