# Dashboard Motion

## Overview

Nexora Dashboard uses a lightweight, performance-focused motion system that provides perceptible transitions while respecting user preferences and system constraints.

## Motion Principles

### Performance First
- **Compositor-only animations**: Only `opacity` and `transform` properties
- **Duration limits**: ≤ 250ms for main transitions
- **No layout thrashing**: Never animate layout properties (width, height, margin, padding)
- **Bounded animations**: Maximum duration strictly enforced

### User Control
- **Reduced motion**: Respects `prefers-reduced-motion: reduce`
- **Keyboard accessibility**: Maintains focus visibility during motion
- **No distractions**: No auto-playing celebratory animations

## Motion Types

### Dashboard Entry Animation

**Trigger**: First visit to Dashboard or return after navigation away

**Behavior**:
- Animates dashboard modules with staggered delays
- Duration: 240ms per element (Design System max: 250ms)
- Delays: 25ms increments (total ≤ 120ms max)
- Properties: `opacity` (0.68 → 1), `transform: translateY(10px → 0)`

**Implementation**:
```javascript
export function animateDashboardEnter(container) {
  const dashboard = resolveDashboard(container)
  if (!dashboard) return

  if (prefersReducedMotion()) {
    dashboard.dataset.dashboardMotionState = 'reduced'
    dashboard.dataset.dashboardMotionEntered = 'true'
    return
  }

  if (dashboard.dataset.dashboardMotionEntered === 'true') {
    return
  }

  dashboard.dataset.dashboardMotionEntered = 'true'
  dashboard.dataset.dashboardMotionState = 'scheduled'
  // ... animation logic
}
```

**State Management**:
- `dashboardMotionEntered`: Prevents re-animation on same session
- `dashboardMotionState`: Tracks animation phase (scheduled → entering → ready)
- Reset when navigating away from Dashboard via `resetDashboardMotion()`

### Mode Switch Animation

**Trigger**: Switching between Simplified and Complete modes

**Behavior**:
- Animates only visible elements (skips hidden elements)
- Duration: 200ms per element (Design System max: 250ms)
- Delays: 20ms increments
- Properties: `opacity` (0.78 → 1), `transform: translateY(7px → 0)`
- Simple → Complete: Revealed elements animate
- Complete → Simple: Elements hide immediately (no exit animation on hidden elements)

**Implementation**:
```javascript
export function animateDashboardModeSwitch(container) {
  const dashboard = resolveDashboard(container)
  if (!dashboard || dashboard.dataset.dashboardMotionState !== 'ready' || prefersReducedMotion()) return
  const isSimpleMode = document.body.classList.contains('mode-simple')
  const selectors = getModeSwitchSelectors(dashboard, isSimpleMode)
  
  // Only animate visible elements (skip hidden)
  selectors
    .map((selector) => dashboard.querySelector(selector))
    .filter(isRendered)
    .filter(element => !element.hidden)
    .forEach((element, index) => {
      // ... animation logic
    })
}
```

### Progress Animation

**Trigger**: Updates to progress bars and data values

**Behavior**:
- Transitions progress values smoothly
- Duration: Single frame update
- Uses `requestAnimationFrame` for timing
- Skips if value unchanged or reduced motion enabled

**Implementation**:
```javascript
export function transitionDashboardProgress(container) {
  const dashboard = resolveDashboard(container)
  if (!dashboard) return

  const scope = container?.querySelectorAll ? container : dashboard
  scope.querySelectorAll('progress').forEach((progress) => {
    const key = getProgressKey(progress)
    if (!key) return
    const finalValue = Number(progress.value)
    const previousValue = progressValues.get(key)
    progressValues.set(key, finalValue)

    if (prefersReducedMotion() || previousValue === undefined || previousValue === finalValue) return
    progress.value = previousValue
    requestAnimationFrame(() => {
      if (progress.isConnected) progress.value = finalValue
    })
  })
}
```

## State Management

### Motion States

**dashboardMotionState**:
- `reduced`: Motion disabled (reduced motion preference)
- `scheduled`: Animation queued
- `entering`: Animation in progress
- `ready`: Animation complete, ready for interactions

**dashboardMotionEntered**:
- `false`: Dashboard entry animation not yet played
- `true`: Dashboard entry animation already played
- Reset when navigating away from Dashboard

### Reset Logic

Motion state is reset when navigating away from Dashboard via a single authoritative hook in `authRouting.js`:

```javascript
export function resetDashboardMotion() {
  const dashboard = document.querySelector('#section-dashboard')
  if (!dashboard) return

  // Cancel all active animations
  activeAnimations.forEach(animation => {
    try {
      animation.cancel()
    } catch (e) {
      // Ignore errors from already-cancelled animations
    }
  })
  activeAnimations.clear()

  // Reset motion state
  dashboard.dataset.dashboardMotionEntered = 'false'
  dashboard.dataset.dashboardMotionState = 'ready'
}
```

Exported via `window.NexoraMotion.resetDashboardMotion()`.

Triggered by:
- Navigation from Dashboard to other sections (Plan, Saisie, etc.)
- Single authoritative hook in `RouteGuard.navigateTo()` using `previousSection` tracking
- Reset count: exactly 1 for Dashboard → Plan → Dashboard navigation

## Reduced Motion

### Implementation

Motion system respects user preferences via:
```javascript
const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

### Behavior with Reduced Motion

When reduced motion is enabled:
- ❌ No dashboard entry animation
- ❌ No mode switch animation
- ❌ No progress transitions
- ✅ Final content still displayed
- ✅ Progress values still updated
- ✅ All data refresh still works

### Testing

Reduced motion is tested in `tests/playwright/dashboard-reduced-motion.spec.js`:
- Verifies motion is disabled
- Confirms final content is preserved
- Validates progress values update
- Tests keyboard focus visibility
- Confirms usability after month changes

## Performance Guarantees

### Animation Characteristics

- **Property count**: 2 per animation (opacity + transform)
- **Maximum duration**: 220ms
- **Maximum total delay**: 120ms (entry), 80ms (mode switch)
- **Permanent animations**: 0
- **Loops**: 0
- **Decorative animations**: 0

### Resource Management

- **Active animations tracked**: `activeAnimations` Set
- **Progress values tracked**: `progressValues` Map
- **Animation cleanup**: Automatic on completion
- **Memory leaks**: Prevented by proper cleanup

## Implementation Guidelines

### Adding New Animations

When adding dashboard animations:

1. **Use Web Animations API**: Prefer over CSS animations for control
2. **Compositor properties only**: `opacity`, `transform`
3. **Short durations**: ≤ 250ms
4. **Check reduced motion**: Always respect user preference
5. **Clean up properly**: Remove references to completed animations

Example:
```javascript
const animation = element.animate([
  { opacity: 0, transform: 'translateY(10px)' },
  { opacity: 1, transform: 'translateY(0)' }
], {
  duration: 200,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  fill: 'none'
})

animation.finished.finally(() => {
  // Cleanup
})
```

### Motion Best Practices

✅ **DO**:
- Use opacity and transform for transitions
- Keep durations short (≤ 250ms)
- Respect reduced motion preferences
- Clean up animations properly
- Test with reduced motion enabled

❌ **DON'T**:
- Animate layout properties (width, height, margin, padding)
- Use long durations (> 250ms)
- Create permanent or looping animations
- Animate during data updates
- Ignore reduced motion preferences

## Testing

### Motion Tests

Motion robustness is tested in `tests/playwright/dashboard-motion-robustness.spec.js`:
- Login → Dashboard: Entry animation test
- Dashboard → Plan → Dashboard: Re-entry animation test
- Dashboard → Saisie → Dashboard: Re-entry animation test
- updateAll(): No replay of entry animation
- Simple → Complete: Revealed elements animate
- Complete → Simple: Immediate hide (no exit animation)
- resetDashboardMotion: Existence and runtime test
- Reset count: Exactly 1 for Dashboard → Plan → Dashboard navigation
- Validates one bounded compositor-only entrance sequence
- Confirms no motion restart during `updateAll()`
- Checks static cards remain still
- Verifies hover effects limited to interactive controls
- Ensures no automatic celebration animations

### Runtime Testing

Motion can be tested at runtime via diagnostics:
```javascript
const diagnostics = window.NexoraMotion?.getDashboardMotionDiagnostics()
// Returns: { activeAnimations, trackedProgressBars, reducedMotion }
```

## Module Locations

- **Motion implementation**: `src/ui/dashboard/dashboardMotion.js`
- **Motion hooks**: `src/auth/authRouting.js` (reset logic)
- **Motion tests**: `tests/playwright/dashboard-motion-robustness.spec.js`
- **Reduced motion tests**: `tests/playwright/dashboard-reduced-motion.spec.js`

## Future Enhancements

Potential improvements to consider:
- Add more subtle hover effects for better interactivity
- Implement loading states for async data
- Add error state animations
- Create mode-specific entry animations
