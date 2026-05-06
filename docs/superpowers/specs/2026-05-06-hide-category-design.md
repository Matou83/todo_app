# Hide Category — Design Spec

## Goal

Allow temporarily hiding all tickets of a category by clicking an eye icon on the category chip in the filter bar. Hidden categories have their name blurred and all their cards blurred across all columns. Persists for the session (resets on page refresh).

## Behaviour

- Hovering a category chip in the filter bar reveals an eye icon (SVG, right of label)
- Clicking the eye icon toggles the "hidden" state for that category
- When hidden:
  - Category chip: label is blurred (`filter: blur(4px)`), eye-off icon always visible, colored outline to signal active state
  - All task cards with that `categoryId`: `filter: blur(5px)`, `opacity: 0.55`, `pointer-events: none` (not clickable)
- Clicking the icon again restores normal state
- "Toutes" chip and other categories are unaffected
- Multiple categories can be hidden simultaneously

## State

`hiddenCategories: Set<string>` in `App.tsx` — a set of category IDs. Resets on refresh (no persistence needed).

## Architecture

```
App.tsx
  hiddenCategories (Set<string>)
  toggleHideCategory(id) → adds/removes from set

  FilterBar ← hiddenCategories, onToggleHideCategory
    chip per category:
      - hover → show eye icon
      - if hidden → blur label, eye-off icon, outline

  KanbanColumn ← hiddenCategories
    TaskCard ← isHidden (bool)
      - if isHidden → blur + no pointer events
```

## Changes

| File | Change |
|---|---|
| `src/App.tsx` | Add `hiddenCategories` state + `toggleHideCategory`, pass to FilterBar and KanbanColumn |
| `src/components/FilterBar.tsx` | Add `hiddenCategories` + `onToggleHideCategory` props; eye icon on hover; blur + outline when hidden |
| `src/components/KanbanColumn.tsx` | Accept `hiddenCategories` prop, pass `isHidden` to TaskCard |
| `src/components/TaskCard.tsx` | Accept `isHidden?: boolean`, apply blur classes |

## Out of scope

- Persisting hidden state across sessions
- Hiding from the column group headers
- Hiding the "Toutes" filter
