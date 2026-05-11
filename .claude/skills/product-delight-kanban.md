# Product Delight — Kanban App

## Purpose

This skill trains Claude to systematically identify and implement **product delight moments** in a Kanban-style task management app. It combines UX emotional design principles, micro-interaction patterns, and gamification techniques specific to drag-and-drop, card management, and column-based workflows.

Trigger this skill any time you work on: UI components, animations, copy/microcopy, empty states, feedback states, onboarding flows, or any feature that touches the user's emotional experience.

---

## Philosophy

Product delight is the gap between "it works" and "it feels alive." In a task manager, delight comes from:

1. **Physical honesty** — elements move as if they have weight and inertia
2. **Emotional acknowledgment** — the app notices and celebrates user progress
3. **Personality in the margins** — microcopy, empty states, and transitions reveal character
4. **Zero friction** — the UI anticipates the user's next move

Delight must never be gratuitous. Every animation must shorten perceived time, confirm intent, or reward completion.

---

## Core Delight Areas for Kanban

### 1. Drag & Drop — The Heart of the Experience

The drag-and-drop is the most used interaction. It must feel physical and satisfying.

**Patterns to apply:**

- **Lift effect on drag start**: scale up the card to `1.04`, add a layered shadow, tilt `2deg` in drag direction
  ```css
  .card.dragging {
    transform: scale(1.04) rotate(2deg);
    box-shadow: 0 16px 40px oklch(0.1 0.01 0 / 0.18);
    cursor: grabbing;
    z-index: 999;
  }
  ```
- **Ghost placeholder**: show a dashed outline in the original slot while dragging — use `opacity: 0.4` on the ghost
- **Drop zone pulse**: when hovering over a valid column, animate a subtle `border` or `background` pulse to indicate acceptance
- **Spring landing**: on drop, use a spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`) so the card "bounces" slightly into place
- **Column count update animation**: when a card lands, the column's task counter increments with a pop animation (scale 1→1.3→1)

**Never do:**
- Instant teleport on drop (no transition = no delight)
- Lag above 16ms on drag (kills the physical feel)

---

### 2. Card Completion — The Money Moment

Completing a task is the core reward loop. Maximize it.

**Patterns:**

- **Checkmark animation**: draw the ✓ with a SVG stroke animation (150ms) before marking complete
- **Card exit**: completed card slides out to "Done" column with a satisfying arc movement, not a straight line
- **Confetti trigger**: when the last card in a column is moved to "Done", trigger a 600ms confetti burst (canvas-confetti, keep it subtle — 60 particles max, 2s decay)
- **Streak counter**: track consecutive completed tasks in a session. At 3, 5, 10 → toast with personality ("3 in a row! 🔥", "You're on fire", "Legend.")
- **Sound (optional, off by default)**: a soft "tick" (220Hz, 80ms) on completion reinforces the feedback loop. Always opt-in.

---

### 3. Empty States — First Impressions and Breathing Room

Empty columns are prime real estate for personality.

**Copy examples (use contextually, never repeat):**

| Column state | Copy |
|---|---|
| Empty "To Do" column | "A clean slate. The best kind." |
| Empty "In Progress" | "Nothing cooking yet — grab a task." |
| Empty "Done" | "Done tasks will live here. Go get one." |
| All columns empty (first visit) | "Your board is ready. What's first?" |
| All columns done | "Everything done. Seriously, take a break." |

**Visual pattern:**
- Animated illustration (Lottie or CSS): a small idle character, a floating card, or a gentle orbit animation
- Primary CTA ("Add a task") is large and prominent — the empty state IS the onboarding
- Never just show a gray box with "No items"

---

### 4. Micro-interactions Catalogue

Apply these to every interactive element:

| Element | Trigger | Feedback | Duration |
|---|---|---|---|
| Add card button | Hover | `+` icon rotates 90°, button scale 1.02 | 150ms |
| Add card button | Click | Ripple expand from click point | 300ms |
| Column header | Hover | Subtle background shift + count badge pulse | 100ms |
| Card | Hover | Lift 2px (`translateY(-2px)`) + shadow increase | 150ms |
| Card label/tag | Click toggle | Spring pop scale 1→1.15→1 | 200ms |
| Delete card | Click | Card shakes 3× then fades out with scale 0.9 | 400ms |
| Rename column | Focus | Border animates in from bottom (clip-path) | 180ms |
| Task counter badge | Value change | Count flips with a CSS flip animation | 250ms |

All durations respect `prefers-reduced-motion: reduce` — reduce to `1ms` when set.

---

### 5. Loading & Skeleton States

**Column skeleton:**
```html
<div class="column-skeleton">
  <div class="skeleton skeleton-heading"></div>
  <div class="skeleton skeleton-card" style="height: 72px"></div>
  <div class="skeleton skeleton-card" style="height: 56px"></div>
  <div class="skeleton skeleton-card" style="height: 88px"></div>
</div>
```

- Shimmer direction: left to right, 1.4s loop
- Card skeletons should vary in height to feel organic
- Reveal the real column with a `fade-in + translateY(8px→0)` (250ms, ease-out)

---

### 6. Gamification Patterns

Light gamification for a task manager — reward progress without trivializing work.

**Daily streak**: a small flame icon in the header shows consecutive days with at least 1 task completed. No streak counter in the main UI — only appears on hover as a tooltip.

**Board completion**: when all "Done" columns are full and no tasks remain in "To Do" or "In Progress", show a full-board celebration screen (3s, dismissible). Keep this rare and meaningful.

**Progress bar per column** (optional): a thin colored line at the top of each column showing `done / total` ratio across the board. Fills smoothly on each card move.

---

### 7. Motion Principles

All animations in this app follow these rules:

1. **Easing hierarchy**
   - UI state changes: `cubic-bezier(0.16, 1, 0.3, 1)` (fast out, smooth deceleration)
   - Spring/bounce (rewards, card drop): `cubic-bezier(0.34, 1.56, 0.64, 1)`
   - Fade in: `ease-out` (200–300ms)
   - Fade out: `ease-in` (150ms) — exits are faster than entrances

2. **Stagger children**: when loading a board, each column appears with a 60ms stagger. Cards within a column stagger at 30ms. Never more than 5 staggered items before trimming.

3. **No layout thrashing**: never animate `width`, `height`, `top`, `left`. Use `transform` and `opacity` exclusively.

4. **Duration caps**:
   - Micro-interactions: 100–200ms
   - Component transitions: 200–350ms
   - Celebrations / entrances: 400–600ms
   - Never above 700ms for any UI animation

---

### 8. Copywriting Principles

Microcopy carries the app's voice. The tone is: **warm, direct, human, slightly playful** — never corporate.

**Do:**
- "Add a task" (not "Create new item")
- "Move to Done" (not "Update status")
- "Oops, something went wrong. Try again?" (not "Error 500")
- "Nice work today." (on logout/end of session)

**Don't:**
- Exclamation marks on every message (dilutes impact)
- Filler words ("Please", "Kindly")
- Technical jargon in user-facing copy

**Error states** always include: what went wrong (brief) + what to do next (actionable).

---

## Implementation Checklist

When reviewing or building any UI feature, run this checklist:

- [ ] Does every interactive element have a visible hover state?
- [ ] Does every action have feedback within 100ms?
- [ ] Are empty states warm and actionable (not just blank)?
- [ ] Does drag-and-drop have lift + spring landing?
- [ ] Do completions feel rewarding (animation + copy)?
- [ ] Are skeleton states organic (varied heights, shimmer)?
- [ ] Is `prefers-reduced-motion` respected everywhere?
- [ ] Is there at least one "oh, that's nice" moment per major flow?
- [ ] Is copy direct, warm, and human throughout?
- [ ] Are animations under 700ms total?

---

## References & Inspiration

- Linear.app — drag interactions, spring animations
- Things 3 — task completion satisfaction
- Trello — column patterns (but improve on them)
- Notion — microcopy voice
- Superhuman — keyboard-first delight
