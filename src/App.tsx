import { useState, useEffect } from 'react'
import { type Session } from '@supabase/supabase-js'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { type Task, type Status, type Priority, type Category, COLUMNS, DEFAULT_CATEGORIES, CATEGORY_COLOR_PALETTE } from './types'
import { supabase } from './lib/supabase'
import KanbanColumn from './components/KanbanColumn'
import TaskModal from './components/AddTaskModal'
import FilterBar from './components/FilterBar'
import TaskCard from './components/TaskCard'
import AuthForm from './components/AuthForm'
import './index.css'

// ── DB row → TS type mappers ──────────────────────────────────────────────────

type TaskRow = {
  id: string; title: string; description: string | null
  status: string; priority: string; category_id: string; created_at: string
}

type CategoryRow = { id: string; label: string; color: string }

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Status,
    priority: row.priority as Priority,
    categoryId: row.category_id,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, label: row.label, color: row.color }
}

// ── Component ─────────────────────────────────────────────────────────────────

type ModalState = { open: false } | { open: true; status: Status; editId?: string }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Auth + fetch initial ──────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchData()
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session)
        fetchData()
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setTasks([])
        setCustomCategories([])
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    setLoading(true)
    const [{ data: tasksData }, { data: catsData }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: true }),
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
    ])
    setTasks((tasksData ?? []).map(r => mapTask(r as TaskRow)))
    setCustomCategories((catsData ?? []).map(r => mapCategory(r as CategoryRow)))
    setLoading(false)
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async function saveTask(
    title: string,
    description: string,
    status: Status,
    priority: Priority,
    categoryId: string,
    editId?: string,
  ) {
    if (editId) {
      const { error } = await supabase.from('tasks').update({
        title, description, status, priority, category_id: categoryId,
      }).eq('id', editId)
      if (!error) setTasks(prev => prev.map(t => t.id === editId ? { ...t, title, description, status, priority, categoryId } : t))
    } else {
      const { data, error } = await supabase.from('tasks').insert({
        title, description, status, priority, category_id: categoryId,
        user_id: session!.user.id,
      }).select().single()
      if (!error && data) setTasks(prev => [...prev, mapTask(data as TaskRow)])
    }
  }

  async function moveTask(id: string, status: Status) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(prev => prev.filter(t => t.id !== id))
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async function addCategory(label: string): Promise<Category | null> {
    const trimmed = label.trim()
    if (!trimmed) return null
    const isDuplicate = categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) return null
    const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const colorIndex = customCategories.length % CATEGORY_COLOR_PALETTE.length
    const color = CATEGORY_COLOR_PALETTE[colorIndex]
    const { error } = await supabase.from('categories').insert({
      id, label: trimmed, color, user_id: session!.user.id,
    })
    if (error) return null
    const newCat: Category = { id, label: trimmed, color }
    setCustomCategories(prev => [...prev, newCat])
    return newCat
  }

  // ── DnD ────────────────────────────────────────────────────────────────────

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

  // ── Derived ───────────────────────────────────────────────────────────────

  const editingTask = modal.open && modal.editId ? tasks.find(t => t.id === modal.editId) : undefined
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null
  const activeTaskCategory = activeTask ? categories.find(c => c.id === activeTask.categoryId) : undefined
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

  // ── Loading / Auth gate ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <AuthForm onAuth={() => {}} />
  }

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
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* FilterBar */}
      <FilterBar
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddCategory={addCategory}
      />

      {/* Board */}
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
