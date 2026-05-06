# Due Date Feature — Design Spec

## Goal

Allow users to set an optional due date on a task. The date is displayed as a colored urgency badge in the task card footer. No due date = nothing shown (creation date also removed).

## Architecture

Add a nullable `due_date` column to the Supabase `tasks` table, map it to a `dueDate?: number` field in the `Task` type, wire it through the modal and card components.

## Data Layer

**`src/types.ts`**
- Add `dueDate?: number` to `Task` interface (Unix timestamp in ms, optional)

**Supabase**
- New column: `due_date timestamptz NULL` on the `tasks` table
- User runs manually: `ALTER TABLE tasks ADD COLUMN due_date timestamptz;`

**`src/App.tsx`**
- Row mapping: `dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined`
- `addOrEditTask` accepts an additional `dueDate?: number` param
- Saves `due_date: dueDate ? new Date(dueDate).toISOString() : null` to Supabase

## Modal — `AddTaskModal`

- New state: `const [dueDate, setDueDate] = useState<string>('')` (ISO date string `YYYY-MM-DD`)
- Initialized from `task?.dueDate ? new Date(task.dueDate).toISOString().slice(0,10) : ''`
- New field between title and priority:
  ```
  Label: "Date d'échéance"
  <input type="date"> styled to match existing fields
  X button to clear (sets dueDate to '')
  ```
- `onSave` signature extended with `dueDate?: number` (converted from string before calling)
- `onSave` prop type updated in App.tsx accordingly

## Card — `TaskCard`

**Remove:** `<span>{formatDate(task.createdAt)}</span>` from footer

**Add:** when `task.dueDate` is defined, render a colored badge at the right of the footer:

Urgency logic (computed from `task.dueDate` vs `Date.now()`):
- Overdue (past midnight of due date): red — `"En retard"`
- Today: red — `"Aujourd'hui"`
- Tomorrow: orange — `"Demain"`
- 2–3 days: orange — `"Dans X jours"`
- 4+ days: teal — formatted date e.g. `"11 mai"`

Badge style mirrors the existing priority badge shape (rounded-full, small text, icon + label).

Calendar icon (SVG) prepended to the label.

No badge rendered when `task.dueDate` is undefined.

## Color Thresholds

| State | Days remaining | Badge colors |
|---|---|---|
| Overdue | < 0 | `bg-red-50 text-red-600` |
| Today | 0 | `bg-red-50 text-red-600` |
| Tomorrow | 1 | `bg-orange-50 text-orange-600` |
| Soon | 2–3 | `bg-orange-50 text-orange-600` |
| OK | 4+ | `bg-teal-50 text-teal-600` |

## Out of scope

- Sorting/filtering by due date
- Notifications or reminders
- Recurring due dates
