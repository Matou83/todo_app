# Categories + Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de catégories avec groupes repliables dans les colonnes, un filtre global, et le drag & drop entre colonnes pour changer le statut d'une tâche.

**Architecture:** Les tâches reçoivent un `categoryId` obligatoire. Chaque colonne groupe ses tâches par catégorie dans des `CategorySection` repliables. Un `FilterBar` au-dessus du board filtre globalement. `@dnd-kit/core` gère le drag entre colonnes avec `useDroppable` sur les colonnes et `useDraggable` sur les cartes.

**Tech Stack:** React 19, TypeScript, Tailwind v4, `@dnd-kit/core`, `@dnd-kit/utilities`, localStorage

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types.ts` | Modifié — `Category`, `DEFAULT_CATEGORIES`, `CATEGORY_COLOR_PALETTE`, `categoryId` sur `Task` |
| `src/App.tsx` | Modifié — états catégories + filtre, `DndContext`, `handleDragEnd`, `addCategory` |
| `src/components/FilterBar.tsx` | Créé — chips filtre + création inline |
| `src/components/CategorySection.tsx` | Créé — groupe repliable |
| `src/components/KanbanColumn.tsx` | Modifié — `useDroppable`, groupement par catégorie |
| `src/components/TaskCard.tsx` | Modifié — `useDraggable`, badge catégorie |
| `src/components/AddTaskModal.tsx` | Modifié — sélecteur catégorie + création inline |

---

## Task 1 — Installer @dnd-kit

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1 : Installer la dépendance**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app
npm install @dnd-kit/core @dnd-kit/utilities
```

Expected output : `added 2 packages` (ou similaire), exit 0.

- [ ] **Step 2 : Vérifier que le build passe toujours**

```bash
npm run build 2>&1 | tail -5
```

Expected : `✓ built in`

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit/core and @dnd-kit/utilities"
```

---

## Task 2 — Mettre à jour types.ts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1 : Remplacer le contenu de `src/types.ts`**

```ts
export type Status = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Category {
  id: string
  label: string
  color: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: Status
  priority: Priority
  categoryId: string
  createdAt: number
}

export interface Column {
  id: Status
  label: string
}

export const COLUMNS: Column[] = [
  { id: 'todo', label: 'À faire' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'ops',     label: 'Ops',     color: '#3B82F6' },
  { id: 'head-of', label: 'Head of', color: '#8B5CF6' },
  { id: 'ia',      label: 'IA',      color: '#10B981' },
  { id: 'perso',   label: 'Perso',   color: '#F97316' },
]

// Palette pour les catégories créées par l'utilisateur (cycle)
export const CATEGORY_COLOR_PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#6366F1', '#A855F7', '#EC4899',
]
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : erreurs uniquement dans les fichiers qui utilisent `Task` (normal, `categoryId` manque). On les corrige dans les tâches suivantes.

- [ ] **Step 3 : Commit**

```bash
git add src/types.ts
git commit -m "feat: add Category type and categoryId to Task"
```

---

## Task 3 — Mettre à jour App.tsx (données + état)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1 : Remplacer le contenu de `src/App.tsx`**

```tsx
import { useState } from 'react'
import { type Task, type Status, type Priority, type Category, COLUMNS, DEFAULT_CATEGORIES, CATEGORY_COLOR_PALETTE } from './types'
import KanbanColumn from './components/KanbanColumn'
import TaskModal from './components/AddTaskModal'
import FilterBar from './components/FilterBar'
import './index.css'

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadTasks(): Task[] {
  try {
    const raw = JSON.parse(localStorage.getItem('kanban_tasks') || '[]')
    return raw.map((t: Task) => ({
      priority: 'medium' as Priority,
      categoryId: 'ops',
      ...t,
    }))
  } catch {
    return []
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem('kanban_tasks', JSON.stringify(tasks))
}

function loadCustomCategories(): Category[] {
  try {
    return JSON.parse(localStorage.getItem('kanban_categories') || '[]')
  } catch {
    return []
  }
}

function saveCustomCategories(custom: Category[]) {
  localStorage.setItem('kanban_categories', JSON.stringify(custom))
}

// ── Component ─────────────────────────────────────────────────────────────────

type ModalState = { open: false } | { open: true; status: Status; editId?: string }

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [customCategories, setCustomCategories] = useState<Category[]>(loadCustomCategories)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })

  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories]

  // ── Tasks ──────────────────────────────────────────────────────────────────

  function updateTasks(next: Task[]) {
    setTasks(next)
    saveTasks(next)
  }

  function saveTask(
    title: string,
    description: string,
    status: Status,
    priority: Priority,
    categoryId: string,
    editId?: string,
  ) {
    if (editId) {
      updateTasks(tasks.map(t => t.id === editId ? { ...t, title, description, status, priority, categoryId } : t))
    } else {
      updateTasks([...tasks, {
        id: crypto.randomUUID(),
        title,
        description,
        status,
        priority,
        categoryId,
        createdAt: Date.now(),
      }])
    }
  }

  function moveTask(id: string, status: Status) {
    updateTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  function deleteTask(id: string) {
    updateTasks(tasks.filter(t => t.id !== id))
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  function addCategory(label: string): Category | null {
    const trimmed = label.trim()
    if (!trimmed) return null
    const isDuplicate = categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) return null

    const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const colorIndex = customCategories.length % CATEGORY_COLOR_PALETTE.length
    const color = CATEGORY_COLOR_PALETTE[colorIndex]
    const newCat: Category = { id, label: trimmed, color }

    const updatedCustom = [...customCategories, newCat]
    setCustomCategories(updatedCustom)
    saveCustomCategories(updatedCustom)
    return newCat
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const editingTask = modal.open && modal.editId ? tasks.find(t => t.id === modal.editId) : undefined
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

  return (
    <div className="min-h-screen bg-[#F0FDFA] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-teal-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#134E4A] leading-tight">Kanban Board</h1>
            {total > 0 && (
              <p className="text-xs text-teal-500 font-medium leading-tight">{done}/{total} terminées</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, status: 'todo' })}
          className="flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-500 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
          aria-label="Créer une nouvelle tâche"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle tâche
        </button>
      </header>

      {/* FilterBar */}
      <FilterBar
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddCategory={addCategory}
      />

      {/* Board */}
      <main className="p-6 flex gap-5 overflow-x-auto min-h-[calc(100vh-121px)] items-start">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter(t => t.status === col.id)}
            categories={categories}
            activeFilter={activeFilter}
            onAddTask={() => setModal({ open: true, status: col.id })}
            onMoveTask={moveTask}
            onDeleteTask={deleteTask}
            onEditTask={(id) => setModal({ open: true, status: tasks.find(t => t.id === id)?.status ?? col.id, editId: id })}
            allStatuses={COLUMNS}
          />
        ))}
      </main>

      {/* Modal */}
      {modal.open && (
        <TaskModal
          defaultStatus={modal.status}
          columns={COLUMNS}
          categories={categories}
          task={editingTask}
          onSave={saveTask}
          onAddCategory={addCategory}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation (des erreurs sont attendues sur les composants pas encore mis à jour)**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Expected : erreurs sur FilterBar, KanbanColumn, AddTaskModal (composants pas encore mis à jour). Normal.

- [ ] **Step 3 : Commit**

```bash
git add src/App.tsx
git commit -m "feat: add categories and filter state to App"
```

---

## Task 4 — Créer FilterBar.tsx

**Files:**
- Create: `src/components/FilterBar.tsx`

- [ ] **Step 1 : Créer `src/components/FilterBar.tsx`**

```tsx
import { useState } from 'react'
import { type Category } from '../types'

interface Props {
  categories: Category[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAddCategory: (label: string) => Category | null
}

export default function FilterBar({ categories, activeFilter, onFilterChange, onAddCategory }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  function handleAdd() {
    if (!inputValue.trim()) return
    const result = onAddCategory(inputValue)
    if (!result) {
      setError('Cette catégorie existe déjà')
      return
    }
    setInputValue('')
    setError('')
    setShowInput(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); setError('') }
  }

  return (
    <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center gap-2 flex-wrap sticky top-[73px] z-10">
      <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">FILTRE</span>

      {/* "Toutes" chip */}
      <button
        onClick={() => onFilterChange(null)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
          activeFilter === null
            ? 'bg-[#134E4A] text-white'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        Toutes
      </button>

      {/* Category chips */}
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onFilterChange(activeFilter === cat.id ? null : cat.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeFilter === cat.id ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          style={activeFilter === cat.id ? { backgroundColor: cat.color } : {}}
        >
          {cat.label}
        </button>
      ))}

      {/* Add category */}
      {showInput ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Nom de la catégorie…"
            className="text-xs border border-teal-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400 w-36"
          />
          <button
            onClick={handleAdd}
            className="text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer"
          >
            Créer
          </button>
          <button
            onClick={() => { setShowInput(false); setInputValue(''); setError('') }}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ✕
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="rounded-full px-3 py-1 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-teal-400 hover:text-teal-600 transition-colors duration-150 cursor-pointer"
        >
          + Catégorie
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation de FilterBar seul**

```bash
npx tsc --noEmit 2>&1 | grep "FilterBar"
```

Expected : aucune ligne (pas d'erreur sur FilterBar).

- [ ] **Step 3 : Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: add FilterBar component with category chips and inline creation"
```

---

## Task 5 — Créer CategorySection.tsx

**Files:**
- Create: `src/components/CategorySection.tsx`

- [ ] **Step 1 : Créer `src/components/CategorySection.tsx`**

```tsx
import { type Category, type Task, type Status, type Column } from '../types'
import TaskCard from './TaskCard'

interface Props {
  category: Category
  tasks: Task[]
  collapsed: boolean
  onToggle: () => void
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  allStatuses: Column[]
}

export default function CategorySection({
  category,
  tasks,
  collapsed,
  onToggle,
  onMove,
  onDelete,
  onEdit,
  allStatuses,
}: Props) {
  // Couleur avec opacité légère pour le fond du header
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 cursor-pointer w-full text-left"
        style={{ backgroundColor: hexToRgba(category.color, 0.1), borderLeft: `3px solid ${category.color}` }}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Déplier' : 'Replier'} la catégorie ${category.label}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
          <span className="text-xs font-bold" style={{ color: category.color }}>{category.label}</span>
        </div>
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ backgroundColor: hexToRgba(category.color, 0.15), color: category.color }}
        >
          {tasks.length}
        </span>
      </button>

      {/* Task cards */}
      {!collapsed && tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onMove={onMove}
          onDelete={onDelete}
          onEdit={onEdit}
          allStatuses={allStatuses}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation de CategorySection**

```bash
npx tsc --noEmit 2>&1 | grep "CategorySection"
```

Expected : aucune ligne.

- [ ] **Step 3 : Commit**

```bash
git add src/components/CategorySection.tsx
git commit -m "feat: add CategorySection collapsible component"
```

---

## Task 6 — Mettre à jour KanbanColumn.tsx

**Files:**
- Modify: `src/components/KanbanColumn.tsx`

- [ ] **Step 1 : Remplacer le contenu de `src/components/KanbanColumn.tsx`**

```tsx
import { useState } from 'react'
import { type Task, type Column, type Status, type Category } from '../types'
import CategorySection from './CategorySection'

interface Props {
  column: Column
  tasks: Task[]
  categories: Category[]
  activeFilter: string | null
  onAddTask: () => void
  onMoveTask: (id: string, status: Status) => void
  onDeleteTask: (id: string) => void
  onEditTask: (id: string) => void
  allStatuses: Column[]
}

const COLUMN_STYLE: Record<Status, {
  wrapper: string
  accent: string
  dot: string
  label: string
  count: string
  addBtn: string
}> = {
  todo: {
    wrapper: 'bg-white/70 border border-slate-200',
    accent: 'bg-slate-400',
    dot: 'bg-slate-400',
    label: 'text-slate-700',
    count: 'bg-slate-100 text-slate-500',
    addBtn: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
  },
  in_progress: {
    wrapper: 'bg-teal-50/70 border border-teal-200',
    accent: 'bg-teal-500',
    dot: 'bg-teal-500',
    label: 'text-teal-800',
    count: 'bg-teal-100 text-teal-600',
    addBtn: 'text-teal-400 hover:text-teal-700 hover:bg-teal-100',
  },
  done: {
    wrapper: 'bg-orange-50/70 border border-orange-200',
    accent: 'bg-orange-400',
    dot: 'bg-orange-400',
    label: 'text-orange-800',
    count: 'bg-orange-100 text-orange-600',
    addBtn: 'text-orange-400 hover:text-orange-700 hover:bg-orange-100',
  },
}

export default function KanbanColumn({
  column, tasks, categories, activeFilter,
  onAddTask, onMoveTask, onDeleteTask, onEditTask, allStatuses,
}: Props) {
  const style = COLUMN_STYLE[column.id]
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Filter tasks by active category filter
  const visibleTasks = activeFilter ? tasks.filter(t => t.categoryId === activeFilter) : tasks

  // Group visible tasks by categoryId, preserving category order
  const groups = categories
    .map(cat => ({ category: cat, tasks: visibleTasks.filter(t => t.categoryId === cat.id) }))
    .filter(g => g.tasks.length > 0)

  const isEmpty = visibleTasks.length === 0

  function toggleCollapse(categoryId: string) {
    setCollapsed(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  return (
    <div className="flex flex-col w-72 shrink-0 animate-slide-up">
      <div className={`rounded-2xl overflow-hidden flex flex-col flex-1 ${style.wrapper} shadow-sm`}>
        {/* Accent bar */}
        <div className={`h-1 w-full ${style.accent}`} aria-hidden="true" />

        {/* Column header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} aria-hidden="true" />
            <span className={`font-semibold text-sm ${style.label}`}>{column.label}</span>
          </div>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${style.count}`}>
            {visibleTasks.length}
          </span>
        </div>

        {/* Task groups */}
        <div className="flex flex-col gap-3 px-3 flex-1 min-h-[60px]">
          {isEmpty ? (
            <div className="flex items-center justify-center flex-1 py-8">
              <p className="text-xs text-slate-400 text-center font-medium">
                {activeFilter ? 'Aucune tâche dans cette catégorie' : 'Aucune tâche'}
              </p>
            </div>
          ) : (
            groups.map(({ category, tasks: groupTasks }) => (
              <CategorySection
                key={category.id}
                category={category}
                tasks={groupTasks}
                collapsed={!!collapsed[category.id]}
                onToggle={() => toggleCollapse(category.id)}
                onMove={onMoveTask}
                onDelete={onDeleteTask}
                onEdit={onEditTask}
                allStatuses={allStatuses}
              />
            ))
          )}
        </div>

        {/* Add task button */}
        <div className="p-3 pt-2">
          <button
            onClick={onAddTask}
            className={`w-full flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors duration-150 cursor-pointer ${style.addBtn}`}
            aria-label={`Ajouter une tâche dans ${column.label}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une tâche
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "KanbanColumn"
```

Expected : aucune ligne.

- [ ] **Step 3 : Commit**

```bash
git add src/components/KanbanColumn.tsx
git commit -m "feat: group tasks by category in KanbanColumn with collapsible sections"
```

---

## Task 7 — Mettre à jour TaskCard.tsx (badge catégorie)

**Files:**
- Modify: `src/components/TaskCard.tsx`

- [ ] **Step 1 : Ajouter `category` aux props et le badge dans le footer**

Remplacer le contenu de `src/components/TaskCard.tsx` :

```tsx
import { useState, useEffect, useRef } from 'react'
import { type Task, type Column, type Status, type Priority, type Category } from '../types'

interface Props {
  task: Task
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  allStatuses: Column[]
  category?: Category
  isDragOverlay?: boolean
}

const PRIORITY_STYLE: Record<Priority, { dot: string; text: string; bg: string; label: string }> = {
  high:   { dot: 'bg-red-500',   text: 'text-red-600',   bg: 'bg-red-50',   label: 'Haute' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Moyenne' },
  low:    { dot: 'bg-teal-500',  text: 'text-teal-600',  bg: 'bg-teal-50',  label: 'Basse' },
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(ts))
}

export default function TaskCard({ task, onMove, onDelete, onEdit, allStatuses, category, isDragOverlay }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const priority = PRIORITY_STYLE[task.priority ?? 'medium']

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  return (
    <div
      className={`bg-white rounded-xl px-4 py-3.5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative cursor-grab active:cursor-grabbing animate-scale-in ${isDragOverlay ? 'shadow-xl rotate-1 opacity-90' : ''}`}
    >
      {/* Top row: title + menu button */}
      <div className="flex items-start gap-2 justify-between">
        <p className="text-sm font-semibold text-[#134E4A] leading-snug flex-1 pr-1">{task.title}</p>
        {!isDragOverlay && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 cursor-pointer"
              aria-label="Options de la tâche"
              aria-expanded={showMenu}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-9 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-44 animate-scale-in">
                <button
                  onClick={() => { onEdit(task.id); setShowMenu(false) }}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>

                {allStatuses.filter(s => s.id !== task.status).length > 0 && (
                  <>
                    <div className="px-3.5 pt-2 pb-1">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Déplacer vers</span>
                    </div>
                    {allStatuses.filter(s => s.id !== task.status).map(s => (
                      <button
                        key={s.id}
                        onClick={() => { onMove(task.id, s.id); setShowMenu(false) }}
                        className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        {s.label}
                      </button>
                    ))}
                  </>
                )}

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => { onDelete(task.id); setShowMenu(false) }}
                    className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{task.description}</p>
      )}

      {/* Footer: category + priority + date */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {category && (
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: category.color }}
            >
              {category.label}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} aria-hidden="true" />
            {priority.label}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium shrink-0">{formatDate(task.createdAt)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Mettre à jour CategorySection.tsx pour passer `category` à TaskCard**

Dans `src/components/CategorySection.tsx`, remplacer le bloc `TaskCard` :

```tsx
// Avant:
tasks.map(task => (
  <TaskCard
    key={task.id}
    task={task}
    onMove={onMove}
    onDelete={onDelete}
    onEdit={onEdit}
    allStatuses={allStatuses}
  />
))

// Après:
tasks.map(task => (
  <TaskCard
    key={task.id}
    task={task}
    category={category}
    onMove={onMove}
    onDelete={onDelete}
    onEdit={onEdit}
    allStatuses={allStatuses}
  />
))
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -E "TaskCard|CategorySection"
```

Expected : aucune ligne.

- [ ] **Step 4 : Commit**

```bash
git add src/components/TaskCard.tsx src/components/CategorySection.tsx
git commit -m "feat: add category badge to TaskCard"
```

---

## Task 8 — Mettre à jour AddTaskModal.tsx

**Files:**
- Modify: `src/components/AddTaskModal.tsx`

- [ ] **Step 1 : Remplacer le contenu de `src/components/AddTaskModal.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import { type Column, type Status, type Priority, type Task, type Category, DEFAULT_CATEGORIES } from '../types'

interface Props {
  defaultStatus: Status
  columns: Column[]
  categories: Category[]
  task?: Task
  onSave: (title: string, description: string, status: Status, priority: Priority, categoryId: string, editId?: string) => void
  onAddCategory: (label: string) => Category | null
  onClose: () => void
}

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string; ring: string }[] = [
  { value: 'high',   label: 'Haute',   dot: 'bg-red-500',   ring: 'ring-red-400' },
  { value: 'medium', label: 'Moyenne', dot: 'bg-amber-500', ring: 'ring-amber-400' },
  { value: 'low',    label: 'Basse',   dot: 'bg-teal-500',  ring: 'ring-teal-400' },
]

export default function TaskModal({ defaultStatus, columns, categories, task, onSave, onAddCategory, onClose }: Props) {
  const isEdit = !!task
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<Status>(task?.status ?? defaultStatus)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [categoryId, setCategoryId] = useState<string>(task?.categoryId ?? DEFAULT_CATEGORIES[0].id)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatError, setNewCatError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave(title.trim(), description.trim(), status, priority, categoryId, task?.id)
    onClose()
  }

  function handleCreateCategory() {
    if (!newCatLabel.trim()) return
    const result = onAddCategory(newCatLabel)
    if (!result) {
      setNewCatError('Cette catégorie existe déjà')
      return
    }
    setCategoryId(result.id)
    setNewCatLabel('')
    setNewCatError('')
    setShowNewCat(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#134E4A]">
            {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Titre <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="task-title"
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nom de la tâche…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#134E4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-desc" className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Description
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description optionnelle…"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#134E4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <span className="block text-sm font-semibold text-[#134E4A] mb-2">Catégorie</span>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-all duration-150 cursor-pointer ${
                    categoryId === cat.id ? 'text-white border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={categoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                >
                  {cat.label}
                </button>
              ))}
              {showNewCat ? (
                <div className="flex items-center gap-1.5 w-full mt-1">
                  <input
                    autoFocus
                    type="text"
                    value={newCatLabel}
                    onChange={e => { setNewCatLabel(e.target.value); setNewCatError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() } if (e.key === 'Escape') { setShowNewCat(false); setNewCatLabel('') } }}
                    placeholder="Nom de la catégorie…"
                    className="text-xs border border-teal-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1"
                  />
                  <button type="button" onClick={handleCreateCategory} className="text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer shrink-0">
                    Créer
                  </button>
                  <button type="button" onClick={() => { setShowNewCat(false); setNewCatLabel(''); setNewCatError('') }} className="text-xs text-slate-400 cursor-pointer shrink-0">✕</button>
                  {newCatError && <span className="text-xs text-red-500">{newCatError}</span>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewCat(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors cursor-pointer"
                >
                  + Nouvelle
                </button>
              )}
            </div>
          </div>

          {/* Priority */}
          <div>
            <span className="block text-sm font-semibold text-[#134E4A] mb-2">Priorité</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Priorité">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={priority === opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    priority === opt.value
                      ? `border-transparent ring-2 ${opt.ring} bg-slate-50 text-[#134E4A]`
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.dot} shrink-0`} aria-hidden="true" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column */}
          <div>
            <label htmlFor="task-status" className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Colonne
            </label>
            <select
              id="task-status"
              value={status}
              onChange={e => setStatus(e.target.value as Status)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#134E4A] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow cursor-pointer bg-white"
            >
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
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
              className="px-5 py-2.5 text-sm font-semibold bg-[#0D9488] text-white rounded-xl hover:bg-teal-700 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
            >
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation globale**

```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur.

- [ ] **Step 3 : Build complet**

```bash
npm run build 2>&1 | tail -5
```

Expected : `✓ built in`

- [ ] **Step 4 : Vérification manuelle — lancer le dev server et tester les catégories**

```bash
npm run dev
```

Vérifier dans le navigateur :
- FilterBar visible sous le header avec les 4 catégories par défaut
- Clic sur un filtre → seules les tâches de cette catégorie apparaissent
- Accordéon repliable dans les colonnes
- Nouvelle tâche → sélecteur de catégorie fonctionnel + création inline

- [ ] **Step 5 : Commit**

```bash
git add src/components/AddTaskModal.tsx
git commit -m "feat: add category selector and inline creation to task modal"
```

---

## Task 9 — Ajouter le Drag & Drop

**Files:**
- Modify: `src/components/KanbanColumn.tsx` (useDroppable)
- Modify: `src/components/TaskCard.tsx` (useDraggable)
- Modify: `src/App.tsx` (DndContext, DragOverlay, handleDragEnd)

- [ ] **Step 1 : Ajouter `useDroppable` à KanbanColumn**

Dans `src/components/KanbanColumn.tsx`, ajouter l'import et modifier le wrapper de la colonne :

```tsx
// Ajouter en haut du fichier:
import { useDroppable } from '@dnd-kit/core'

// Dans le composant, avant le return:
const { setNodeRef, isOver } = useDroppable({ id: column.id })

// Modifier le div principal (celui avec rounded-2xl) :
<div
  ref={setNodeRef}
  className={`rounded-2xl overflow-hidden flex flex-col flex-1 ${style.wrapper} shadow-sm transition-all duration-150 ${isOver ? 'ring-2 ring-teal-400 ring-offset-2' : ''}`}
>
```

- [ ] **Step 2 : Ajouter `useDraggable` à TaskCard**

Dans `src/components/TaskCard.tsx`, ajouter l'import et le hook :

```tsx
// Ajouter en haut du fichier:
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// Dans le composant, après les useState/useEffect existants:
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: task.id,
  disabled: isDragOverlay,
})

const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined

// Modifier le div racine de la carte:
<div
  ref={setNodeRef}
  style={dragStyle}
  {...(!isDragOverlay ? listeners : {})}
  {...(!isDragOverlay ? attributes : {})}
  className={`bg-white rounded-xl px-4 py-3.5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative cursor-grab active:cursor-grabbing animate-scale-in ${isDragging ? 'opacity-40' : ''} ${isDragOverlay ? 'shadow-xl rotate-1 opacity-95' : ''}`}
>
```

- [ ] **Step 3 : Remplacer le contenu complet de `src/App.tsx` avec la version DnD intégrée**

```tsx
import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { type Task, type Status, type Priority, type Category, COLUMNS, DEFAULT_CATEGORIES, CATEGORY_COLOR_PALETTE } from './types'
import KanbanColumn from './components/KanbanColumn'
import TaskModal from './components/AddTaskModal'
import FilterBar from './components/FilterBar'
import TaskCard from './components/TaskCard'
import './index.css'

function loadTasks(): Task[] {
  try {
    const raw = JSON.parse(localStorage.getItem('kanban_tasks') || '[]')
    return raw.map((t: Task) => ({
      priority: 'medium' as Priority,
      categoryId: 'ops',
      ...t,
    }))
  } catch {
    return []
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem('kanban_tasks', JSON.stringify(tasks))
}

function loadCustomCategories(): Category[] {
  try {
    return JSON.parse(localStorage.getItem('kanban_categories') || '[]')
  } catch {
    return []
  }
}

function saveCustomCategories(custom: Category[]) {
  localStorage.setItem('kanban_categories', JSON.stringify(custom))
}

type ModalState = { open: false } | { open: true; status: Status; editId?: string }

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [customCategories, setCustomCategories] = useState<Category[]>(loadCustomCategories)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function updateTasks(next: Task[]) {
    setTasks(next)
    saveTasks(next)
  }

  function saveTask(
    title: string,
    description: string,
    status: Status,
    priority: Priority,
    categoryId: string,
    editId?: string,
  ) {
    if (editId) {
      updateTasks(tasks.map(t => t.id === editId ? { ...t, title, description, status, priority, categoryId } : t))
    } else {
      updateTasks([...tasks, {
        id: crypto.randomUUID(),
        title,
        description,
        status,
        priority,
        categoryId,
        createdAt: Date.now(),
      }])
    }
  }

  function moveTask(id: string, status: Status) {
    updateTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  function deleteTask(id: string) {
    updateTasks(tasks.filter(t => t.id !== id))
  }

  function addCategory(label: string): Category | null {
    const trimmed = label.trim()
    if (!trimmed) return null
    const isDuplicate = categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) return null
    const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const colorIndex = customCategories.length % CATEGORY_COLOR_PALETTE.length
    const color = CATEGORY_COLOR_PALETTE[colorIndex]
    const newCat: Category = { id, label: trimmed, color }
    const updatedCustom = [...customCategories, newCat]
    setCustomCategories(updatedCustom)
    saveCustomCategories(updatedCustom)
    return newCat
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTaskId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTaskId(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    const targetStatus = over.id as Status
    if (task && task.status !== targetStatus) {
      moveTask(task.id, targetStatus)
    }
  }

  const editingTask = modal.open && modal.editId ? tasks.find(t => t.id === modal.editId) : undefined
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null
  const activeTaskCategory = activeTask ? categories.find(c => c.id === activeTask.categoryId) : undefined
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

  return (
    <div className="min-h-screen bg-[#F0FDFA] font-sans">
      <header className="bg-white border-b border-teal-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#134E4A] leading-tight">Kanban Board</h1>
            {total > 0 && (
              <p className="text-xs text-teal-500 font-medium leading-tight">{done}/{total} terminées</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, status: 'todo' })}
          className="flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-500 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
          aria-label="Créer une nouvelle tâche"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle tâche
        </button>
      </header>

      <FilterBar
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddCategory={addCategory}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="p-6 flex gap-5 overflow-x-auto min-h-[calc(100vh-121px)] items-start">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks.filter(t => t.status === col.id)}
              categories={categories}
              activeFilter={activeFilter}
              onAddTask={() => setModal({ open: true, status: col.id })}
              onMoveTask={moveTask}
              onDeleteTask={deleteTask}
              onEditTask={(id) => setModal({ open: true, status: tasks.find(t => t.id === id)?.status ?? col.id, editId: id })}
              allStatuses={COLUMNS}
            />
          ))}
        </main>
        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              category={activeTaskCategory}
              onMove={() => {}}
              onDelete={() => {}}
              onEdit={() => {}}
              allStatuses={COLUMNS}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal.open && (
        <TaskModal
          defaultStatus={modal.status}
          columns={COLUMNS}
          categories={categories}
          task={editingTask}
          onSave={saveTask}
          onAddCategory={addCategory}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur.

- [ ] **Step 5 : Build complet**

```bash
npm run build 2>&1 | tail -5
```

Expected : `✓ built in`

- [ ] **Step 6 : Vérification manuelle du drag & drop**

```bash
npm run dev
```

Vérifier :
- Glisser une carte d'une colonne à une autre → le statut change
- Pendant le drag : carte source semi-transparente, overlay suit le curseur
- Colonne cible highlight (ring teal) au survol
- Drop hors colonne → aucun changement
- Menu contextuel "Déplacer vers" toujours fonctionnel

- [ ] **Step 7 : Commit final**

```bash
git add src/App.tsx src/components/KanbanColumn.tsx src/components/TaskCard.tsx
git commit -m "feat: add drag & drop between columns with @dnd-kit"
```

---

## Vérification finale

- [ ] `npm run build` sans erreur ni warning
- [ ] Tâches existantes en localStorage migrées correctement (categoryId = 'ops')
- [ ] Filtre + accordéon + drag & drop fonctionnent ensemble
- [ ] Création de catégorie custom fonctionne depuis FilterBar et depuis le modal
- [ ] Menu contextuel "Déplacer vers" toujours fonctionnel (alternative au drag)
