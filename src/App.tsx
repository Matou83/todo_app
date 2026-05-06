import { useState, useEffect } from 'react'
import { useIsMobile } from './hooks/useIsMobile'
import { useSwipe } from './hooks/useSwipe'
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
  due_date: string | null
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
    dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined,
  }
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, label: row.label, color: row.color }
}

// ── Component ─────────────────────────────────────────────────────────────────

type ModalState = { open: false } | { open: true; status: Status; editId?: string }
type Env = 'pro' | 'perso'

const PERSO_CATEGORY_IDS = new Set(['perso'])

const ENV_CONFIG: Record<Env, { label: string; icon: string; bg: string; text: string; subtext: string }> = {
  pro:   { label: 'Pro',   icon: '💼', bg: 'bg-[#134E4A]', text: 'text-teal-100',  subtext: 'text-teal-300' },
  perso: { label: 'Perso', icon: '🏠', bg: 'bg-[#EA580C]', text: 'text-orange-50', subtext: 'text-orange-200' },
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [env, setEnv] = useState<Env>('pro')
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<Status>('todo')

  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories]

  const envCategories = categories.filter(c =>
    env === 'perso' ? PERSO_CATEGORY_IDS.has(c.id) : !PERSO_CATEGORY_IDS.has(c.id)
  )
  const envTasks = tasks.filter(t => envCategories.some(c => c.id === t.categoryId))

  function switchEnv(next: Env) {
    setEnv(next)
    setActiveFilter(null)
  }

  const swipeRef = useSwipe(
    () => switchEnv('perso'),
    () => switchEnv('pro'),
  )

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const sensors = useSensors(...(isMobile ? [] : [pointerSensor]))

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
    dueDate?: number,
  ): Promise<boolean> {
    const due_date = dueDate ? new Date(dueDate).toISOString() : null
    if (editId) {
      const { error } = await supabase.from('tasks').update({
        title, description, status, priority, category_id: categoryId, due_date,
      }).eq('id', editId)
      if (error) { console.error('saveTask update error:', error); return false }
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, title, description, status, priority, categoryId, dueDate } : t))
    } else {
      const { data, error } = await supabase.from('tasks').insert({
        title, description, status, priority, category_id: categoryId,
        due_date, user_id: session!.user.id,
      }).select().single()
      if (error) { console.error('saveTask insert error:', error); return false }
      if (data) setTasks(prev => [...prev, mapTask(data as TaskRow)])
    }
    return true
  }

  async function moveTask(id: string, status: Status) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function updateTaskDescription(id: string, description: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, description } : t))
    await supabase.from('tasks').update({ description }).eq('id', id)
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
  const done = envTasks.filter(t => t.status === 'done').length
  const total = envTasks.length
  const envConf = ENV_CONFIG[env]

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
          {/* Env pill switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1" role="group" aria-label="Environnement">
            {(['pro', 'perso'] as Env[]).map(e => (
              <button
                key={e}
                onClick={() => switchEnv(e)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  env === e
                    ? e === 'pro'
                      ? 'bg-[#134E4A] text-white shadow-sm'
                      : 'bg-[#EA580C] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                aria-pressed={env === e}
              >
                <span aria-hidden="true">{ENV_CONFIG[e].icon}</span>
                <span className="hidden sm:inline">{ENV_CONFIG[e].label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal({ open: true, status: isMobile ? activeTab : 'todo' })}
            className="flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-3 sm:px-4 py-2.5 rounded-xl hover:bg-orange-500 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
            aria-label="Créer une nouvelle tâche"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Env banner */}
      <div className={`${envConf.bg} px-6 py-2 flex items-center gap-2`} role="status" aria-live="polite">
        <span className="text-base leading-none" aria-hidden="true">{envConf.icon}</span>
        <span className={`text-xs font-bold ${envConf.text}`}>Environnement {envConf.label}</span>
        {total > 0 && (
          <span className={`text-xs ${envConf.subtext} ml-auto`}>{done}/{total} terminées</span>
        )}
      </div>

      {/* FilterBar */}
      <FilterBar
        categories={envCategories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddCategory={addCategory}
      />

      {/* Board */}
      {isMobile ? (
        <>
          {/* Tab bar */}
          <div className="bg-white border-b border-slate-200 flex sticky top-[113px] z-10">
            {COLUMNS.map(col => {
              const count = envTasks.filter(t => t.status === col.id).length
              const isActive = activeTab === col.id
              const activeStyle =
                col.id === 'todo' ? 'text-slate-700 border-slate-700' :
                col.id === 'in_progress' ? 'text-teal-700 border-teal-600' :
                'text-orange-600 border-orange-500'
              const activeBadge =
                col.id === 'todo' ? 'bg-slate-100 text-slate-600' :
                col.id === 'in_progress' ? 'bg-teal-100 text-teal-700' :
                'bg-orange-100 text-orange-600'
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${isActive ? activeStyle : 'text-slate-400 border-transparent'}`}
                >
                  {col.label}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? activeBadge : 'bg-slate-100 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Active column */}
          <main ref={swipeRef} className="p-4">
            <KanbanColumn
              column={COLUMNS.find(c => c.id === activeTab)!}
              tasks={envTasks.filter(t => t.status === activeTab)}
              categories={envCategories}
              activeFilter={activeFilter}
              onAddTask={() => setModal({ open: true, status: activeTab })}
              onMoveTask={moveTask}
              onDeleteTask={deleteTask}
              onEditTask={(id) => setModal({ open: true, status: tasks.find(t => t.id === id)?.status ?? activeTab, editId: id })}
              onUpdateDescription={updateTaskDescription}
              allStatuses={COLUMNS}
            />
          </main>
        </>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <main className="p-6 flex gap-5 overflow-x-auto min-h-[calc(100vh-121px)] items-start">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
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
                onUpdateDescription={() => {}}
                allStatuses={COLUMNS}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal */}
      {modal.open && (
        <TaskModal
          defaultStatus={modal.status}
          columns={COLUMNS}
          categories={envCategories}
          task={editingTask}
          onSave={saveTask}
          onAddCategory={addCategory}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  )
}
