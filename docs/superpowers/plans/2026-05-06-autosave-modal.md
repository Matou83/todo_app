# Auto-save Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In edit mode, the task modal saves automatically when closed (X, Escape, click outside); "Annuler" discards changes.

**Architecture:** Capture a snapshot of the task on modal open. On close, compare snapshot with current state — if different, call `onSave` before calling `onClose`. "Annuler" calls `onClose` directly, bypassing save. Add a `beforeunload` listener while unsaved changes exist.

**Tech Stack:** React 19, TypeScript, Supabase (via existing `onSave` prop)

---

## File Map

| File | Change |
|---|---|
| `src/components/AddTaskModal.tsx` | Snapshot on mount, async handleClose, remove Enregistrer in edit mode, beforeunload |

---

### Task 1: Implement auto-save on close in AddTaskModal

**Files:**
- Modify: `src/components/AddTaskModal.tsx`

**Context:**

Current modal state (lines 23–35):
```ts
const [title, setTitle] = useState(task?.title ?? '')
const [description, setDescription] = useState(task?.description ?? '')
const [status, setStatus] = useState<Status>(task?.status ?? defaultStatus)
const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
const [categoryId, setCategoryId] = useState<string>(task?.categoryId ?? DEFAULT_CATEGORIES[0].id)
const [dueDate, setDueDate] = useState<string>(
  task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
)
```

Current close points (all call `onClose` directly):
- Line 44: `if (e.key === 'Escape') onClose()`
- Line 76: `onClick={e => { if (e.target === e.currentTarget) onClose() }}`  — backdrop click
- Line 94: `onClick={onClose}` — X button
- Line 260: `onClick={onClose}` — Annuler button

Current submit button (lines 263–269): visible in both create and edit mode.

The `onSave` prop signature:
```ts
onSave: (title: string, description: string, status: Status, priority: Priority, categoryId: string, editId?: string, dueDate?: number) => Promise<boolean>
```

---

- [ ] **Step 1: Add snapshot and hasChanges logic**

After the existing `useState` declarations (after line 35), add:

```ts
// Snapshot of original values for auto-save comparison (edit mode only)
const snapshot = useRef({
  title: task?.title ?? '',
  description: task?.description ?? '',
  status: (task?.status ?? defaultStatus) as Status,
  priority: (task?.priority ?? 'medium') as Priority,
  categoryId: task?.categoryId ?? DEFAULT_CATEGORIES[0].id,
  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
})

function hasChanges(): boolean {
  if (!isEdit) return false
  const s = snapshot.current
  return (
    title !== s.title ||
    description !== s.description ||
    status !== s.status ||
    priority !== s.priority ||
    categoryId !== s.categoryId ||
    dueDate !== s.dueDate
  )
}
```

Note: `useRef` is already imported at line 1 (`import { useState, useRef, useEffect } from 'react'`).

- [ ] **Step 2: Add handleClose (auto-save on close)**

Replace the existing Escape key handler and add `handleClose`. Currently around line 40:

```ts
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [onClose])
```

Replace with:

```ts
async function handleClose() {
  if (isEdit && hasChanges()) {
    setSaving(true)
    setSaveError('')
    const dueDateTs = dueDate ? new Date(dueDate).getTime() : undefined
    const ok = await onSave(title.trim(), description.trim(), status, priority, categoryId, task!.id, dueDateTs)
    setSaving(false)
    if (!ok) { setSaveError('Erreur lors de la sauvegarde.'); return }
  }
  onClose()
}

useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleClose()
  }
  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [title, description, status, priority, categoryId, dueDate])
```

- [ ] **Step 3: Add beforeunload listener**

Add a second `useEffect` after the keydown one:

```ts
useEffect(() => {
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (isEdit && hasChanges()) {
      e.preventDefault()
    }
  }
  window.addEventListener('beforeunload', onBeforeUnload)
  return () => window.removeEventListener('beforeunload', onBeforeUnload)
}, [title, description, status, priority, categoryId, dueDate])
```

- [ ] **Step 4: Wire handleClose to backdrop and X button**

In the JSX:

Backdrop (currently `if (e.target === e.currentTarget) onClose()`):
```tsx
onClick={e => { if (e.target === e.currentTarget) handleClose() }}
```

X button (currently `onClick={onClose}`):
```tsx
onClick={handleClose}
```

- [ ] **Step 5: Update the actions row — remove Enregistrer in edit mode, keep Annuler**

Current actions row (lines ~252–270):
```tsx
<div className="flex gap-2 justify-end pt-1">
  <button
    type="button"
    onClick={onClose}
    className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
  >
    Annuler
  </button>
  <button
    type="submit"
    disabled={saving}
    className="px-5 py-2.5 text-sm font-semibold bg-[#0D9488] text-white rounded-xl hover:bg-teal-700 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {saving ? 'Sauvegarde…' : isEdit ? 'Enregistrer' : 'Ajouter'}
  </button>
</div>
```

Replace with:

```tsx
<div className="flex gap-2 justify-end pt-1">
  <button
    type="button"
    onClick={onClose}
    className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
  >
    Annuler
  </button>
  {!isEdit && (
    <button
      type="submit"
      disabled={saving}
      className="px-5 py-2.5 text-sm font-semibold bg-[#0D9488] text-white rounded-xl hover:bg-teal-700 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {saving ? 'Sauvegarde…' : 'Ajouter'}
    </button>
  )}
  {isEdit && saving && (
    <span className="px-4 py-2.5 text-sm text-slate-400">Sauvegarde…</span>
  )}
</div>
```

Note: "Annuler" keeps `onClick={onClose}` (not `handleClose`) — it intentionally discards changes.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/components/AddTaskModal.tsx
git commit -m "feat: auto-save modal on close, Annuler discards changes"
```

---

### Task 2: Playwright verification

**Files:** none (test only)

- [ ] **Step 1: Run verification script**

```bash
cat > /tmp/test_autosave.mjs << 'EOF'
import { chromium } from '/Users/mathieu/Documents/Claude/Projects/todo_app/node_modules/playwright/index.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

await page.goto('http://localhost:5173')
await page.waitForTimeout(1500)
await page.fill('input[type="email"]', 'mathieu.ingrao@gmail.com')
await page.fill('input[type="password"]', 'SvP53g7F&Wu!gw')
await page.click('button[type="submit"]')
await page.waitForTimeout(3000)

// Open first task
await page.locator('p.text-sm.font-semibold').first().click()
await page.waitForTimeout(800)

// Verify no "Enregistrer" button in edit mode
const saveBtn = page.locator('button[type="submit"]')
const saveBtnCount = await saveBtn.count()
console.log('✅ No submit button in edit mode:', saveBtnCount === 0 ? 'PASS' : `FAIL (found ${saveBtnCount})`)

// Change title
const titleInput = page.locator('#task-title')
const originalTitle = await titleInput.inputValue()
const newTitle = originalTitle + ' (modifié)'
await titleInput.fill(newTitle)

// Close via X button (should auto-save)
await page.locator('button[aria-label="Fermer"]').click()
await page.waitForTimeout(1500)

// Verify new title appears on card
const cardWithNewTitle = page.locator(`text=${newTitle}`)
const found = await cardWithNewTitle.count()
console.log('✅ Auto-save on X close:', found > 0 ? 'PASS' : 'FAIL')

// Re-open, change title, click Annuler (should discard)
await page.locator(`text=${newTitle}`).first().click()
await page.waitForTimeout(800)
await page.locator('#task-title').fill(originalTitle + ' (annulé)')
await page.locator('button:has-text("Annuler")').click()
await page.waitForTimeout(800)

const discardedTitle = page.locator(`text=${originalTitle} (annulé)`)
const discardedCount = await discardedTitle.count()
console.log('✅ Annuler discards changes:', discardedCount === 0 ? 'PASS' : 'FAIL')

// Restore original title
await page.locator(`text=${newTitle}`).first().click()
await page.waitForTimeout(800)
await page.locator('#task-title').fill(originalTitle)
await page.locator('button[aria-label="Fermer"]').click()
await page.waitForTimeout(1500)

await page.screenshot({ path: '/tmp/autosave_result.png' })
await browser.close()
EOF
node /tmp/test_autosave.mjs
```

Expected:
```
✅ No submit button in edit mode: PASS
✅ Auto-save on X close: PASS
✅ Annuler discards changes: PASS
```

- [ ] **Step 2: Check screenshot**

Read `/tmp/autosave_result.png` to confirm the board looks correct after the test.
