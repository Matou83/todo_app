# Hide Category — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a temporary hide toggle on category chips in the filter bar — blurs the chip label and all matching task cards across all columns.

**Architecture:** `hiddenCategories: Set<string>` in App.tsx, passed down to FilterBar (renders eye icon + blur) and KanbanColumn (passes `isHidden` to TaskCard).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4

---

## File Map

| File | Change |
|---|---|
| `src/App.tsx` | Add `hiddenCategories` state + `toggleHideCategory`, pass to FilterBar and KanbanColumn |
| `src/components/FilterBar.tsx` | Eye icon on hover, blur label + outline when hidden |
| `src/components/KanbanColumn.tsx` | Accept + pass `hiddenCategories` to TaskCard as `isHidden` |
| `src/components/TaskCard.tsx` | Accept `isHidden?: boolean`, apply blur |

---

### Task 1: App.tsx — state + prop wiring

**Files:**
- Modify: `src/App.tsx`

**Context:**

`activeFilter` state is at line ~61. `FilterBar` is rendered at ~line 317 with props `categories`, `activeFilter`, `onFilterChange`, `onAddCategory`. `KanbanColumn` is rendered twice (mobile at ~358, desktop at ~377) with props including `tasks`, `categories`, `activeFilter`.

- [ ] **Step 1: Add hiddenCategories state**

After `const [activeFilter, setActiveFilter] = useState<string | null>(null)`, add:

```ts
const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

function toggleHideCategory(id: string) {
  setHiddenCategories(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}
```

- [ ] **Step 2: Pass props to FilterBar**

Find the `<FilterBar` JSX block and add two props:

```tsx
<FilterBar
  categories={envCategories}
  activeFilter={activeFilter}
  onFilterChange={setActiveFilter}
  onAddCategory={addCategory}
  hiddenCategories={hiddenCategories}
  onToggleHideCategory={toggleHideCategory}
/>
```

- [ ] **Step 3: Pass hiddenCategories to both KanbanColumn instances**

Both `<KanbanColumn` blocks (mobile tab view and desktop grid): add `hiddenCategories={hiddenCategories}`.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc --noEmit
```

Expected: type errors only from missing prop definitions (will be fixed in Tasks 2–4). If there are other errors, fix them.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add hiddenCategories state and wiring in App"
```

---

### Task 2: FilterBar — eye icon + hidden visual state

**Files:**
- Modify: `src/components/FilterBar.tsx`

**Context:**

Current Props interface (line 4–9):
```ts
interface Props {
  categories: Category[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAddCategory: (label: string) => Promise<Category | null>
}
```

Current category chip (lines 50–61):
```tsx
{categories.map(cat => (
  <button
    key={cat.id}
    onClick={() => onFilterChange(activeFilter === cat.id ? null : cat.id)}
    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 ${
      activeFilter === cat.id ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`}
    style={activeFilter === cat.id ? { backgroundColor: cat.color } : {}}
  >
    {cat.label}
  </button>
))}
```

- [ ] **Step 1: Add new props to interface**

```ts
interface Props {
  categories: Category[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAddCategory: (label: string) => Promise<Category | null>
  hiddenCategories: Set<string>
  onToggleHideCategory: (id: string) => void
}
```

Update destructuring:
```ts
export default function FilterBar({ categories, activeFilter, onFilterChange, onAddCategory, hiddenCategories, onToggleHideCategory }: Props) {
```

- [ ] **Step 2: Replace category chip rendering**

Replace the `{categories.map(...)}` block with:

```tsx
{categories.map(cat => {
  const isHidden = hiddenCategories.has(cat.id)
  const isActive = activeFilter === cat.id
  return (
    <div key={cat.id} className="relative group/cat shrink-0 flex items-center">
      <button
        onClick={() => onFilterChange(isActive ? null : cat.id)}
        className={`rounded-full pl-3 pr-7 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer ${
          isActive ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        } ${isHidden ? 'outline outline-2 outline-offset-1' : ''}`}
        style={{
          ...(isActive ? { backgroundColor: cat.color } : {}),
          ...(isHidden ? { outlineColor: cat.color } : {}),
        }}
      >
        <span style={isHidden ? { filter: 'blur(4px)', userSelect: 'none' } : {}}>
          {cat.label}
        </span>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onToggleHideCategory(cat.id) }}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 transition-opacity duration-150 cursor-pointer ${
          isHidden ? 'opacity-100' : 'opacity-0 group-hover/cat:opacity-100'
        }`}
        aria-label={isHidden ? `Afficher ${cat.label}` : `Masquer ${cat.label}`}
        title={isHidden ? `Afficher ${cat.label}` : `Masquer ${cat.label}`}
      >
        {isHidden ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: cat.color }}>
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
})}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors (or only KanbanColumn/TaskCard errors not yet fixed).

- [ ] **Step 4: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: hide category eye icon + blur chip label in FilterBar"
```

---

### Task 3: KanbanColumn + TaskCard — apply blur to hidden cards

**Files:**
- Modify: `src/components/KanbanColumn.tsx`
- Modify: `src/components/TaskCard.tsx`

**Context:**

KanbanColumn Props (around line 7–16):
```ts
interface Props {
  column: Column
  tasks: Task[]
  categories: Category[]
  activeFilter: string | null
  onAddTask: () => void
  onMoveTask: (id: string, status: Status) => void
  onDeleteTask: (id: string) => void
  onEditTask: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  allStatuses: Column[]
}
```

KanbanColumn renders `<TaskCard>` in a loop. Find the `<TaskCard` JSX (has props: `task`, `category`, `onMove`, `onDelete`, `onEdit`, `onUpdateDescription`, `allStatuses`).

TaskCard Props (around line 8–17 of TaskCard.tsx):
```ts
interface Props {
  task: Task
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  allStatuses: Column[]
  category?: Category
  isDragOverlay?: boolean
}
```

- [ ] **Step 1: Add hiddenCategories to KanbanColumn Props**

```ts
interface Props {
  column: Column
  tasks: Task[]
  categories: Category[]
  activeFilter: string | null
  hiddenCategories: Set<string>   // ← add
  onAddTask: () => void
  onMoveTask: (id: string, status: Status) => void
  onDeleteTask: (id: string) => void
  onEditTask: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  allStatuses: Column[]
}
```

Add `hiddenCategories` to the destructuring:
```ts
export default function KanbanColumn({
  column, tasks, categories, activeFilter, hiddenCategories,
  onAddTask, onMoveTask, onDeleteTask, onEditTask, onUpdateDescription, allStatuses,
}: Props) {
```

- [ ] **Step 2: Pass isHidden to TaskCard**

Find the `<TaskCard` JSX (it's inside a `.map()` or similar loop) and add:

```tsx
isHidden={hiddenCategories.has(task.categoryId)}
```

Also find the DragOverlay `<TaskCard` (has `isDragOverlay` prop) and add `isHidden={false}` to it.

- [ ] **Step 3: Add isHidden prop to TaskCard**

In `src/components/TaskCard.tsx`, add to Props interface:
```ts
isHidden?: boolean
```

Add to destructuring:
```ts
export default function TaskCard({ task, onMove, onDelete, onEdit, onUpdateDescription, allStatuses, category, isDragOverlay, isHidden }: Props) {
```

- [ ] **Step 4: Apply blur styles to the card root div**

In the root `<div` of TaskCard (the one with `className="bg-white rounded-xl..."`), add the blur logic. Find the existing `className` with `isDragging` and `isDragOverlay` checks and add:

```tsx
className={`bg-white rounded-xl px-4 py-3.5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative cursor-pointer active:cursor-grabbing animate-scale-in ${isDragging ? 'opacity-40' : ''} ${isDragOverlay ? 'shadow-xl rotate-1 opacity-95 cursor-grabbing' : ''} ${isHidden ? 'blur-[4px] opacity-55 pointer-events-none select-none' : ''}`}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/KanbanColumn.tsx src/components/TaskCard.tsx
git commit -m "feat: blur hidden category cards in KanbanColumn and TaskCard"
```

---

### Task 4: Playwright verification

- [ ] **Step 1: Run verification**

```bash
cat > /tmp/test_hide_category.mjs << 'EOF'
import { chromium } from '/Users/mathieu/Documents/Claude/Projects/todo_app/node_modules/playwright/index.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

await page.goto('http://localhost:5173')
await page.waitForTimeout(1500)
await page.fill('input[type="email"]', 'mathieu.ingrao@gmail.com')
await page.fill('input[type="password"]', 'SvP53g7F&Wu!gw')
await page.click('button[type="submit"]')
await page.waitForTimeout(3000)

// Hover on first category chip and click its eye icon
const catChip = page.locator('div.group\\/cat').first()
await catChip.hover()
await page.waitForTimeout(300)

const eyeBtn = catChip.locator('button[aria-label^="Masquer"]')
await eyeBtn.click()
await page.waitForTimeout(500)

await page.screenshot({ path: '/tmp/hide_category_result.png' })

// Check category chip label is blurred
const blurredLabel = catChip.locator('span[style*="blur"]')
const blurredCount = await blurredLabel.count()
console.log('✅ Category label blurred:', blurredCount > 0 ? 'PASS' : 'FAIL')

// Check eye-off icon visible
const eyeOffBtn = catChip.locator('button[aria-label^="Afficher"]')
const eyeOffCount = await eyeOffBtn.count()
console.log('✅ Eye-off icon visible:', eyeOffCount > 0 ? 'PASS' : 'FAIL')

// Click again to restore
await eyeOffBtn.click()
await page.waitForTimeout(300)
const restoredBlur = catChip.locator('span[style*="blur"]')
const restoredCount = await restoredBlur.count()
console.log('✅ Label restored on toggle:', restoredCount === 0 ? 'PASS' : 'FAIL')

await browser.close()
EOF
node /tmp/test_hide_category.mjs
```

Expected:
```
✅ Category label blurred: PASS
✅ Eye-off icon visible: PASS
✅ Label restored on toggle: PASS
```

- [ ] **Step 2: Check screenshot `/tmp/hide_category_result.png`**
