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
      ...t,
      priority: t.priority ?? ('medium' as Priority),
      categoryId: t.categoryId ?? 'ops',
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
