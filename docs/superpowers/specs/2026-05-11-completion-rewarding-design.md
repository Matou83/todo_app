# Completion Rewarding — Design Spec

## Goal

Make task completion feel rewarding with animated checkmark, card exit animation, column confetti, and streak toasts. Every completion should give a dopamine hit.

## Scope

- Checkmark SVG stroke animation on click
- Card exit with green flash + spring slide-out
- Column counter pop animation on value change
- Confetti burst when last card leaves a "À faire" or "En cours" column
- Session streak counter with energetic toasts at 3, 5, 10

## Non-scope

- No full-board celebration screen
- No sound effects
- No persistent streak (session only, resets on reload)

---

## Detailed Design

### 1. Checkmark Animation

**Trigger:** User clicks the check button on a TaskCard.

**Behavior:**
- The circle border transitions to `emerald-500`, background fills `emerald-500`, color becomes white
- The checkmark SVG polyline draws in via `stroke-dasharray`/`stroke-dashoffset` animation (200ms ease-out)
- Button scales to 1.15 during the animation, then settles at 1.0

**CSS:**
```css
@keyframes drawCheck {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}
```

### 2. Card Exit Animation

**Trigger:** Immediately after the checkmark animation starts (300ms delay to let user see the check).

**Behavior:**
1. Card background flashes to `#ecfdf5` (emerald-50) over 250ms
2. Card slides out to the right with spring easing: `translateX(40px) scale(0.95) opacity(0)` over 500ms using `cubic-bezier(0.34, 1.56, 0.64, 1)`
3. After animation ends, the card is removed from DOM (the existing `moveTask` function handles the state update)

**CSS:**
```css
@keyframes greenFlash {
  0% { background-color: white; }
  30% { background-color: #ecfdf5; }
  100% { background-color: #ecfdf5; }
}

@keyframes springSlideOut {
  0% { opacity: 1; transform: translateX(0) scale(1); }
  15% { transform: translateX(-8px) scale(1.02); }
  100% { opacity: 0; transform: translateX(40px) scale(0.95); }
}
```

**Implementation approach:** Instead of calling `onMove` immediately, the check button triggers an animation state on the card. After the animation completes (~800ms total), `onMove(task.id, 'done')` is called. This requires a small local state (`completing: boolean`) in TaskCard.

### 3. Counter Pop Animation

**Trigger:** When a column's task count changes (card enters or leaves).

**Behavior:** The count badge scales 1 → 1.4 → 1 over 300ms with the count value updating at peak scale.

**CSS:**
```css
@keyframes counterPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}
```

**Implementation:** In KanbanColumn, track previous `matchingCount` with a ref. When it changes, add/remove an `animate-counter-pop` class on the badge element.

### 4. Confetti

**Trigger:** When the last visible card in a "À faire" or "En cours" column is completed (moved to done).

**Dependency:** `canvas-confetti` npm package (~2KB gzipped).

**Behavior:**
- 50 particles
- Colors: `['#10b981', '#14b8a6', '#0d9488', '#fbbf24', '#f97316']`
- Origin: center of the column that was emptied
- Spread: 60°, decay: 0.9, gravity: 1.2
- Duration: ~2s natural decay

**Implementation:** In App.tsx, after `moveTask` completes, check if the source column is now empty. If so, get the column's DOM rect and fire confetti. Use a ref to track the column elements.

### 5. Streak Toasts

**State:** A session-level counter in App.tsx: `streakCount` (useState, starts at 0). Incremented each time `moveTask` is called with `status === 'done'`. Resets on page reload (no persistence).

**Thresholds and messages:**
| Count | Message |
|-------|---------|
| 3 | 🔥 3 d'affilée ! |
| 5 | ⚡ 5 tâches ! Tu gères ! |
| 10 | 🏆 10 d'affilée ! Légendaire. |

**Toast style:**
- Position: fixed, bottom 20px, centered horizontally
- Background: slate-800, text: white, rounded-2xl, shadow-xl
- Enter: slide-up + fade-in (300ms)
- Auto-dismiss: 2s, then fade-out (300ms)
- Only one toast visible at a time

**CSS:**
```css
@keyframes toastIn {
  from { opacity: 0; transform: translateY(20px) translateX(-50%); }
  to { opacity: 1; transform: translateY(0) translateX(-50%); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateY(0) translateX(-50%); }
  to { opacity: 0; transform: translateY(-10px) translateX(-50%); }
}
```

### 6. Reduced Motion

All animations respect `prefers-reduced-motion: reduce` — already handled globally in `index.css` with `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;`. No additional work needed.

---

## File Map

| File | Change |
|---|---|
| `src/index.css` | Add keyframes: drawCheck, greenFlash, springSlideOut, counterPop, toastIn, toastOut + theme variables |
| `src/components/TaskCard.tsx` | Add completing state, animate check + card exit, delay onMove call |
| `src/components/KanbanColumn.tsx` | Counter pop animation on count change |
| `src/App.tsx` | Streak counter state, toast rendering, confetti trigger after moveTask |
| `package.json` | Add canvas-confetti dependency |

## Interaction with Existing Features

- **Undo delete snackbar:** The streak toast and the undo snackbar both live at the bottom of the screen. They should not overlap. The undo snackbar already uses `fixed bottom-5 left-1/2`. The streak toast should stack above it if both are visible (use `bottom-20` when snackbar is present, `bottom-5` otherwise).
- **Drag-and-drop:** Completion animation only triggers from the check button, NOT from drag-and-drop moves to the done column. DnD moves should remain instant.
- **Mobile tab view:** Confetti should still work — fire from the column container's position.
