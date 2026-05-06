# Auto-save Modal — Design Spec

## Goal

In edit mode, the task modal saves automatically when closed (X, Escape, click outside). An explicit "Annuler" button discards changes without saving. Create mode is unchanged.

## Behaviour

### Edit mode

- On open: capture a snapshot of the task's initial state (title, description, status, priority, categoryId, dueDate).
- On close via **X / Escape / click outside**: compare current state with snapshot. If different, call `saveTask` silently before closing. If unchanged, close immediately.
- On **"Annuler"**: close immediately without saving. The task keeps its previous state.
- **"Enregistrer"** button is removed in edit mode.

### Create mode

No change. "Annuler" discards the new task, "Ajouter" saves it.

## Error handling

Save is silent (no spinner). On Supabase error, a short error message appears at the bottom of the modal. The modal stays open so the user can retry or cancel.

## Browser unload

A `beforeunload` listener is added while the modal is open with unsaved changes. If the user tries to refresh or close the tab, the browser shows its native "Leave page?" dialog.

## Changes

| File | Change |
|---|---|
| `src/components/AddTaskModal.tsx` | Snapshot on mount, async `handleClose` (save if diff), "Annuler" bypasses save, remove "Enregistrer" in edit mode, `beforeunload` listener |
| `src/App.tsx` | No change |

## Out of scope

- Auto-save while typing (debounce)
- Undo/redo
- Conflict resolution (multi-tab)
