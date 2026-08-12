# Dashboard Modes

## Overview

Nexora Dashboard supports two UX modes to accommodate different user preferences and complexity levels:

- **Mode Simplifié**: Essential information only, streamlined interface
- **Mode Complet**: Full dashboard with advanced analytics and projections

## Mode Storage

The current mode is stored in:
- **Key**: `nexora_ux_mode_v1` in `SafeStorage`
- **Values**: `'simple'` or `'complete'` (default: `'complete'`)
- **Access**: Via `window.setNexoraUxMode(mode)` and `window.getNexoraUxMode()`

## Mode Implementation

### Body Classes
- `body.mode-simple` - Active when simplified mode is selected
- `body.mode-complete` - Active when complete mode is selected

### Visibility Control

Mode distinction is implemented using `data-dashboard-mode` attributes:

```css
/* Mode-specific visibility */
body.mode-simple [data-dashboard-mode="complete"] {
  display: none !important;
}

body.mode-complete [data-dashboard-mode="complete"] {
  display: revert;
}
```

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
1. `applyNexoraUxMode(mode)` - Updates body classes
2. `scheduleAssistantRefresh()` - Refreshes assistant data
3. `window.refreshDashboardCoach()` - Updates coach recommendations
4. `updateAll()` - Full data refresh
5. `window.NexoraMotion?.animateModeSwitch?.()` - Mode transition animation

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
- Verifies Simplified mode hides advanced elements
- Verifies Complete mode shows all elements
- Tests mode toggle functionality
- Validates Complete mode is a superset of Simplified mode

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
