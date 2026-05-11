# Completion Rewarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make task completion feel rewarding with animated checkmark, spring card exit, confetti, and streak toasts.

**Architecture:** Add CSS keyframes for all animations. Modify TaskCard to delay `onMove` behind a completing animation. Add streak state + toast + confetti logic in App.tsx. Add counter pop in KanbanColumn.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, canvas-confetti

---

## File Map

| File | Change |
|---|---|
| `package.json` | Add `canvas-confetti` dependency |
| `src/index.css` | Add 6 keyframes + 4 theme animation variables |
| `src/components/TaskCard.tsx` | Add `completing` state, animate check + card exit, delay `onMove` |
| `src/components/KanbanColumn.tsx` | Counter pop animation on count change |
| `src/App.tsx` | Streak counter, toast component, confetti trigger, `onComplete` callback |

---

### Task 1: Add canvas-confetti dependency and CSS keyframes

**Files:**
- Modify: `package.json`
- Modify: `src/index.css`

- [ ] **Step 1: Install canvas-confetti**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Step 2: Add keyframes in index.css**

In `src/index.css`, add these animation variables inside the existing `@theme { }` block, after `--animate-complete`:

```css
--animate-draw-check: drawCheck 0.2s ease-out forwards;
--animate-green-flash: greenFlash 0.25s ease-out;
--animate-spring-slide-out: springSlideOut 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
--animate-counter-pop: counterPop 0.3s ease-out;
--animate-toast-in: toastIn 0.3s ease-out forwards;
--animate-toast-out: toastOut 0.3s ease-in forwards;
```

Then add these `@keyframes` blocks after the existing `@keyframes slideUpFade` block (around line 34):

```css
@keyframes drawCheck {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}

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

@keyframes counterPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(20px) translateX(-50%); }
  to { opacity: 1; transform: translateY(0) translateX(-50%); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translateY(0) translateX(-50%); }
  to { opacity: 0; transform: translateY(-10px) translateX(-50%); }
}
```

- [ ] **Step 3: Remove the old completeTask keyframe**

In `src/index.css`, the old `@keyframes completeTask` (added in the design audit) and its `--animate-complete` variable are no longer needed — they're replaced by `greenFlash` + `springSlideOut`. Remove:

```css
--animate-complete: completeTask 0.4s ease-out forwards;
```

And:

```css
@keyframes completeTask {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.97); background-color: #ecfdf5; }
  100% { opacity: 0; transform: scale(0.95) translateX(20px); }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/index.css
git commit -m "feat: add canvas-confetti + completion animation keyframes"
```

---

### Task 2: Animated checkmark + card exit in TaskCard

**Files:**
- Modify: `src/components/TaskCard.tsx`

- [ ] **Step 1: Add completing state and handler**

In `src/components/TaskCard.tsx`, add a `completing` state inside the component (after the existing `useState` calls around line 47):

```ts
const [completing, setCompleting] = useState(false)
```

- [ ] **Step 2: Replace the check button onClick**

Find the check button (line 249-258). Replace the `onClick` handler:

From:
```tsx
onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
```

To:
```tsx
onClick={e => {
  e.stopPropagation()
  if (completing) return
  setCompleting(true)
  setTimeout(() => onMove(task.id, 'done'), 800)
}}
```

- [ ] **Step 3: Add animation classes to check button when completing**

Replace the entire check button block (lines 249-258):

```tsx
{!isDragOverlay && task.status !== 'done' && (
  <button
    onClick={e => {
      e.stopPropagation()
      if (completing) return
      setCompleting(true)
      setTimeout(() => onMove(task.id, 'done'), 800)
    }}
    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 ${
      completing
        ? 'border-emerald-500 bg-emerald-500 text-white scale-115'
        : 'border-slate-300 text-slate-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 hover:scale-110'
    }`}
    aria-label="Marquer comme terminée"
  >
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
      style={completing ? { strokeDasharray: 24, strokeDashoffset: 0, animation: 'drawCheck 0.2s ease-out' } : undefined}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </button>
)}
```

- [ ] **Step 4: Add animation classes to the card wrapper when completing**

In the card's outer `<div>` (line 97-103), add the completing animation classes. Find the className string and append the completing condition.

Add at the end of the existing className template literal (before the closing backtick):

```tsx
${completing ? 'animate-green-flash animate-spring-slide-out [animation-delay:0.3s]' : ''}
```

Note: Tailwind v4 doesn't support stacked animations via utility classes easily. Instead, use an inline style approach. Replace the animation append with:

```tsx
style={{
  ...dragStyle,
  ...(completing ? {
    animation: 'greenFlash 0.25s ease-out, springSlideOut 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards',
    pointerEvents: 'none' as const,
  } : {}),
}}
```

And remove the separate `style={dragStyle}` since it's now merged.

- [ ] **Step 5: Block card clicks during completion**

In `handleCardClick` (line 83), add a guard at the top:

```ts
function handleCardClick() {
  if (completing) return
  if (isDragOverlay) return
  if (wasDragging.current) { wasDragging.current = false; return }
  if (Date.now() - menuActionTs.current < 400) return
  onEdit(task.id)
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/TaskCard.tsx
git commit -m "feat: animated checkmark + spring card exit on completion"
```

---

### Task 3: Counter pop animation in KanbanColumn

**Files:**
- Modify: `src/components/KanbanColumn.tsx`

- [ ] **Step 1: Add a ref to track previous count**

In `src/components/KanbanColumn.tsx`, add imports and a ref after the existing state (around line 63):

```ts
import { useState, useRef, useEffect } from 'react'
```

(Update the existing `import { useState } from 'react'` line.)

Then inside the component, after `const matchingCount = ...` (line 71):

```ts
const prevCountRef = useRef(matchingCount)
const [countPop, setCountPop] = useState(false)

useEffect(() => {
  if (prevCountRef.current !== matchingCount) {
    setCountPop(true)
    const t = setTimeout(() => setCountPop(false), 300)
    prevCountRef.current = matchingCount
    return () => clearTimeout(t)
  }
}, [matchingCount])
```

- [ ] **Step 2: Apply the animation class to the count badge**

Find the count badge `<span>` (line 124):

```tsx
<span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${style.count}`}>
  {matchingCount}
</span>
```

Replace with:

```tsx
<span
  className={`text-xs font-semibold rounded-full px-2 py-0.5 ${style.count}`}
  style={countPop ? { animation: 'counterPop 0.3s ease-out' } : undefined}
>
  {matchingCount}
</span>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/KanbanColumn.tsx
git commit -m "feat: counter pop animation on task count change"
```

---

### Task 4: Streak toasts + confetti in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and streak state**

At the top of `src/App.tsx`, add the confetti import after the existing imports:

```ts
import confetti from 'canvas-confetti'
```

Inside the `App` component, after the existing state declarations (around line 74), add:

```ts
const [streakCount, setStreakCount] = useState(0)
const [streakToast, setStreakToast] = useState<string | null>(null)
const streakToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})
```

- [ ] **Step 2: Create the streak toast trigger function**

Add this function after the `toggleOverdue` function (around line 178):

```ts
const STREAK_MESSAGES: Record<number, string> = {
  3: '🔥 3 d\'affilée !',
  5: '⚡ 5 tâches ! Tu gères !',
  10: '🏆 10 d\'affilée ! Légendaire.',
}

function showStreakToast(count: number) {
  const msg = STREAK_MESSAGES[count]
  if (!msg) return
  if (streakToastTimeout.current) clearTimeout(streakToastTimeout.current)
  setStreakToast(msg)
  streakToastTimeout.current = setTimeout(() => setStreakToast(null), 2300)
}
```

- [ ] **Step 3: Create the onComplete handler**

Add this function after `moveTask` (around line 307). This is the new callback that TaskCard will use via the check button, which handles streak + confetti AFTER the animated move:

```ts
function handleComplete(id: string) {
  // Find the task's current column before moving
  const task = tasks.find(t => t.id === id)
  if (!task) return

  const sourceStatus = task.status
  const sourceTasks = envTasks.filter(t => t.status === sourceStatus && t.id !== id)
  const sourceWillBeEmpty = sourceTasks.length === 0 ||
    (activeFilter ? sourceTasks.filter(t => t.categoryId === activeFilter).length === 0 : false)

  // Move the task
  moveTask(id, 'done')

  // Streak
  const newStreak = streakCount + 1
  setStreakCount(newStreak)
  showStreakToast(newStreak)

  // Confetti if column emptied (only todo and in_progress)
  if (sourceWillBeEmpty && sourceStatus !== 'done') {
    const colEl = columnRefs.current[sourceStatus]
    if (colEl) {
      const rect = colEl.getBoundingClientRect()
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + 60) / window.innerHeight,
        },
        colors: ['#10b981', '#14b8a6', '#0d9488', '#fbbf24', '#f97316'],
        decay: 0.9,
        gravity: 1.2,
      })
    }
  }
}
```

- [ ] **Step 4: Pass onComplete to KanbanColumn and wire column refs**

In the KanbanColumn JSX for both desktop (around line 853) and mobile (around line 831), add the `onComplete` prop. But since KanbanColumn passes it through to TaskCard, we need to add it to both KanbanColumn and CategorySection props.

**Simpler approach:** Instead of threading through, change the `onMoveTask` callback at the App level. When `moveTask` is called with `status === 'done'`, trigger the streak/confetti logic.

Replace the `moveTask` function (lines 301-307) with:

```ts
async function moveTask(id: string, status: Status) {
  const task = tasks.find(t => t.id === id)
  const completed_at = status === 'done' ? new Date().toISOString() : null
  const { error } = await supabase.from('tasks').update({ status, completed_at }).eq('id', id)
  if (!error) {
    setTasks(prev => prev.map(t => t.id === id
      ? { ...t, status, completedAt: completed_at ? new Date(completed_at).getTime() : undefined }
      : t))

    // Streak + confetti only when completing (not DnD — DnD is handled by handleDragEnd which also calls moveTask, but that's fine)
    if (status === 'done' && task) {
      const newStreak = streakCount + 1
      setStreakCount(newStreak)
      showStreakToast(newStreak)

      // Check if source column will be empty
      const sourceStatus = task.status
      if (sourceStatus !== 'done') {
        const remaining = envTasks.filter(t => t.status === sourceStatus && t.id !== id)
        const visibleRemaining = activeFilter ? remaining.filter(t => t.categoryId === activeFilter) : remaining
        if (visibleRemaining.length === 0) {
          const colEl = columnRefs.current[sourceStatus]
          if (colEl) {
            const rect = colEl.getBoundingClientRect()
            confetti({
              particleCount: 50,
              spread: 60,
              origin: {
                x: (rect.left + rect.width / 2) / window.innerWidth,
                y: (rect.top + 60) / window.innerHeight,
              },
              colors: ['#10b981', '#14b8a6', '#0d9488', '#fbbf24', '#f97316'],
              decay: 0.9,
              gravity: 1.2,
            })
          }
        }
      }
    }
  }
}
```

This way, we don't need to add any new props to KanbanColumn, CategorySection, or TaskCard. The existing `onMoveTask={moveTask}` wiring handles everything.

- [ ] **Step 5: Add column refs to KanbanColumn wrappers**

In the desktop KanbanColumn map (around line 853), add a ref callback:

```tsx
{COLUMNS.map(col => (
  <KanbanColumn
    key={col.id}
    ref={(el: HTMLDivElement | null) => { columnRefs.current[col.id] = el }}
    column={col}
```

Wait — KanbanColumn doesn't forward refs. Instead, wrap with a div. Find the desktop column map and wrap each KanbanColumn:

```tsx
{COLUMNS.map(col => (
  <div key={col.id} ref={el => { columnRefs.current[col.id] = el }} className="flex-1 min-w-0">
    <KanbanColumn
      column={col}
      tasks={envTasks.filter(t => t.status === col.id)}
      categories={envCategories}
      activeFilter={activeFilter}
      onAddTask={() => setModal({ open: true, status: col.id })}
      onMoveTask={moveTask}
      onDeleteTask={deleteTask}
      onEditTask={(id) => setModal({ open: true, status: tasks.find(t => t.id === id)?.status ?? col.id, editId: id })}
      onUpdateDescription={updateTaskDescription}
      allStatuses={COLUMNS}
      hiddenCategories={hiddenCategories}
      searchQuery={searchQuery}
      overdueFilter={showOverdue}
      overdueTaskIds={overdueTaskIds}
    />
  </div>
))}
```

Note: KanbanColumn already has `className="flex flex-col w-full sm:flex-1 sm:min-w-0"` on its outer div. Moving `flex-1 min-w-0` to the wrapper div means removing `sm:flex-1 sm:min-w-0` from KanbanColumn's root div. Instead, just use a simple ref wrapper without layout classes — add `className="contents"` to make it invisible in layout:

Actually, simplest: use `forwardRef` on KanbanColumn. But that's intrusive. Easiest: just wrap with a plain div and set the ref, keeping the existing layout as-is. The `flex gap-5` parent will distribute space to these wrapper divs. Add `className="flex-1 min-w-0 flex flex-col"` to the wrapper:

```tsx
{COLUMNS.map(col => (
  <div key={col.id} ref={el => { columnRefs.current[col.id] = el }} className="flex-1 min-w-0 flex flex-col">
    <KanbanColumn
      column={col}
```

And in `src/components/KanbanColumn.tsx`, remove `sm:flex-1 sm:min-w-0` from the outer div's className (line 97) since the parent wrapper now handles flex sizing. Change:

```tsx
<div className={`flex flex-col w-full sm:flex-1 sm:min-w-0 animate-slide-up ...`}>
```

To:

```tsx
<div className={`flex flex-col w-full animate-slide-up ...`}>
```

For mobile, just add a ref on the main container:

```tsx
<main ref={el => { columnRefs.current[activeTab] = el }} className="p-4">
```

- [ ] **Step 6: Render the streak toast**

In `src/App.tsx`, add the toast JSX just before the closing `</div>` of the root (before `{/* Modal */}`, around line 920). Place it after the undo snackbar:

```tsx
{/* Streak toast */}
{streakToast && (
  <div
    key={streakToast}
    className={`fixed left-1/2 z-50 bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${pendingDelete ? 'bottom-20' : 'bottom-5'}`}
    style={{ animation: 'toastIn 0.3s ease-out, toastOut 0.3s ease-in 2s forwards' }}
    role="status"
    aria-live="polite"
  >
    {streakToast}
  </div>
)}
```

The `bottom-20` when `pendingDelete` is active ensures it stacks above the undo snackbar.

- [ ] **Step 7: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/KanbanColumn.tsx package.json package-lock.json
git commit -m "feat: streak toasts + confetti on column completion"
```

---

## Summary

| Task | Scope | Commit |
|------|-------|--------|
| 1 | CSS keyframes + canvas-confetti dep | `feat: add canvas-confetti + completion animation keyframes` |
| 2 | TaskCard animated check + spring exit | `feat: animated checkmark + spring card exit on completion` |
| 3 | KanbanColumn counter pop | `feat: counter pop animation on task count change` |
| 4 | App streak state + toast + confetti | `feat: streak toasts + confetti on column completion` |

**4 tasks, 4 commits, 5 files modified.**
