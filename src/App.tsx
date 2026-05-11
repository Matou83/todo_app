import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { createPortal } from 'react-dom'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
import { useIsMobile } from './hooks/useIsMobile'
import { useSwipe } from './hooks/useSwipe'
import { type Session } from '@supabase/supabase-js'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { type Task, type Status, type Priority, type Category, type Subtask, COLUMNS, DEFAULT_CATEGORIES, CATEGORY_COLOR_PALETTE } from './types'
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
  due_date: string | null; completed_at: string | null
  subtasks: Subtask[] | null
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
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
    subtasks: row.subtasks ?? [],
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
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [showArchive, setShowArchive] = useState(false)
  const [showOverdue, setShowOverdue] = useState(false)
  const streakCountRef = useRef(0)
  const [streakToast, setStreakToast] = useState<string | null>(null)
  const streakToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function hiddenCatsKey(userId: string) { return `hidden_cats_${userId}` }

  function loadHiddenCategories(userId: string) {
    try {
      const raw = localStorage.getItem(hiddenCatsKey(userId))
      if (raw) setHiddenCategories(new Set(JSON.parse(raw)))
    } catch {}
  }

  function toggleHideCategory(id: string) {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (session) localStorage.setItem(hiddenCatsKey(session.user.id), JSON.stringify([...next]))
      return next
    })
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [notifOpen, setNotifOpen] = useState(false)
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set())
  const notifBtnRef = useRef<HTMLButtonElement>(null)
  const notifPanelRef = useRef<HTMLDivElement>(null)
  const [notifPanelPos, setNotifPanelPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e: MouseEvent) {
      if (!notifPanelRef.current?.contains(e.target as Node) && !notifBtnRef.current?.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  function openSearch() { setSearchOpen(true) }
  function closeSearch() { setSearchOpen(false); setSearchQuery('') }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchOpen ? closeSearch() : openSearch()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  const [modal, setModal] = useState<ModalState>({ open: false })
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [env, setEnv] = useState<Env>('pro')
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<Status>('todo')

  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories]

  const envCategories = categories.filter(c =>
    env === 'perso' ? PERSO_CATEGORY_IDS.has(c.id) : !PERSO_CATEGORY_IDS.has(c.id)
  )
  const ARCHIVE_THRESHOLD = 15 * 24 * 60 * 60 * 1000
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const envTasks = tasks
    .filter(t => envCategories.some(c => c.id === t.categoryId))
    .filter(t => !(t.status === 'done' && t.completedAt != null && Date.now() - t.completedAt > ARCHIVE_THRESHOLD))
    .sort((a, b) => {
      const aHas = a.dueDate != null
      const bHas = b.dueDate != null
      if (aHas !== bHas) return aHas ? -1 : 1
      if (aHas && bHas) {
        const dateDiff = a.dueDate! - b.dueDate!
        if (dateDiff !== 0) return dateDiff
      }
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    })

  function switchEnv(next: Env) {
    setEnv(next)
    setActiveFilter(null)
    setShowArchive(false)
    setShowOverdue(false)
  }

  function toggleArchive() {
    setShowArchive(v => !v)
    setActiveFilter(null)
    setShowOverdue(false)
  }

  function toggleOverdue() {
    setShowOverdue(v => !v)
    setActiveFilter(null)
    setShowArchive(false)
  }

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

  useEffect(() => {
    // Check if event was already captured before React mounted
    const early = (window as unknown as Record<string, unknown>).__installPrompt
    if (early) {
      installPromptRef.current = early as BeforeInstallPromptEvent
      setCanInstall(true)
      return
    }
    // Otherwise listen for it
    function onReady() {
      const prompt = (window as unknown as Record<string, unknown>).__installPrompt
      if (prompt) {
        installPromptRef.current = prompt as BeforeInstallPromptEvent
        setCanInstall(true)
      }
    }
    window.addEventListener('installpromptready', onReady)
    return () => window.removeEventListener('installpromptready', onReady)
  }, [])

  async function handleInstall() {
    if (!installPromptRef.current) return
    await installPromptRef.current.prompt()
    const { outcome } = await installPromptRef.current.userChoice
    if (outcome === 'accepted') {
      installPromptRef.current = null
      setCanInstall(false)
    }
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
      if (session) { loadHiddenCategories(session.user.id); fetchData() }
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session)
        if (session) loadHiddenCategories(session.user.id)
        fetchData()
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setTasks([])
        setHiddenCategories(new Set())
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
    subtasks?: Subtask[],
  ): Promise<boolean> {
    const due_date = dueDate ? new Date(dueDate).toISOString() : null
    if (editId) {
      const prevTask = tasks.find(t => t.id === editId)
      const becomingDone = status === 'done' && prevTask?.status !== 'done'
      const leavingDone = status !== 'done' && prevTask?.status === 'done'
      const completed_at = becomingDone
        ? new Date().toISOString()
        : leavingDone ? null : prevTask?.completedAt ? new Date(prevTask.completedAt).toISOString() : null
      const mergedSubtasks = subtasks ?? prevTask?.subtasks ?? []
      const { error } = await supabase.from('tasks').update({
        title, description, status, priority, category_id: categoryId, due_date, completed_at,
        subtasks: mergedSubtasks,
      }).eq('id', editId)
      if (error) { console.error('saveTask update error:', error); return false }
      const completedAt = completed_at ? new Date(completed_at).getTime() : undefined
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, title, description, status, priority, categoryId, dueDate, completedAt, subtasks: mergedSubtasks } : t))
    } else {
      const completed_at = status === 'done' ? new Date().toISOString() : null
      const { data, error } = await supabase.from('tasks').insert({
        title, description, status, priority, category_id: categoryId,
        due_date, completed_at, user_id: session!.user.id,
        subtasks: subtasks ?? [],
      }).select().single()
      if (error) { console.error('saveTask insert error:', error); return false }
      if (data) setTasks(prev => [...prev, mapTask(data as TaskRow)])
    }
    return true
  }

  async function updateTaskSubtasks(id: string, subtasks: Subtask[]) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, subtasks } : t))
    await supabase.from('tasks').update({ subtasks }).eq('id', id)
  }

  async function moveTask(id: string, status: Status) {
    const task = tasks.find(t => t.id === id)
    const completed_at = status === 'done' ? new Date().toISOString() : null
    const { error } = await supabase.from('tasks').update({ status, completed_at }).eq('id', id)
    if (!error) {
      setTasks(prev => prev.map(t => t.id === id
        ? { ...t, status, completedAt: completed_at ? new Date(completed_at).getTime() : undefined }
        : t))

      if (status === 'done' && task) {
        streakCountRef.current += 1
        showStreakToast(streakCountRef.current)

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

  async function updateTaskDescription(id: string, description: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, description } : t))
    await supabase.from('tasks').update({ description }).eq('id', id)
  }

  const [pendingDelete, setPendingDelete] = useState<{ task: Task; timeoutId: ReturnType<typeof setTimeout> } | null>(null)

  async function commitDelete(task: Task) {
    await supabase.from('tasks').delete().eq('id', task.id)
  }

  function deleteTask(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // If another delete is pending, commit it immediately
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId)
      commitDelete(pendingDelete.task)
    }

    // Optimistically remove from UI
    setTasks(prev => prev.filter(t => t.id !== id))

    const timeoutId = setTimeout(() => {
      commitDelete(task)
      setPendingDelete(null)
    }, 5000)

    setPendingDelete({ task, timeoutId })
  }

  function undoDelete() {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timeoutId)
    setTasks(prev => {
      const next = [...prev, pendingDelete.task]
      return next.sort((a, b) => a.createdAt - b.createdAt)
    })
    setPendingDelete(null)
  }

  useEffect(() => {
    if (!pendingDelete) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); undoDelete() }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [pendingDelete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Categories ─────────────────────────────────────────────────────────────

  async function deleteCategory(id: string) {
    // Fallback: first category that isn't the one being deleted
    const fallback = envCategories.find(c => c.id !== id)
    if (!fallback) return

    // Optimistic update
    setTasks(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: fallback.id } : t))
    setCustomCategories(prev => prev.filter(c => c.id !== id))
    if (activeFilter === id) setActiveFilter(null)

    // Persist to DB
    await supabase.from('tasks').update({ category_id: fallback.id }).eq('category_id', id)
    await supabase.from('categories').delete().eq('id', id)
  }

  async function addCategory(label: string, color?: string): Promise<Category | null> {
    const trimmed = label.trim()
    if (!trimmed) return null
    const isDuplicate = categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) return null
    const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const chosenColor = color ?? CATEGORY_COLOR_PALETTE[customCategories.length % CATEGORY_COLOR_PALETTE.length]
    const { error } = await supabase.from('categories').insert({
      id, label: trimmed, color: chosenColor, user_id: session!.user.id,
    })
    if (error) return null
    const newCat: Category = { id, label: trimmed, color: chosenColor }
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

  // ── Notifications ─────────────────────────────────────────────────────────

  const urgentTasks = (() => {
    const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    return tasks
      .filter(t => t.dueDate != null && t.status !== 'done')
      .map(t => {
        const due = new Date(t.dueDate!)
        const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
        const days = Math.round((dueMidnight - todayMidnight) / 86400000)
        return { task: t, days }
      })
      .filter(({ days }) => days <= 3)
      .sort((a, b) => a.days - b.days)
  })()

  const notifBadgeCount = urgentTasks.filter(({ days, task }) => days <= 0 && !readNotifIds.has(task.id)).length

  function markAllRead() {
    setReadNotifIds(new Set(urgentTasks.map(({ task }) => task.id)))
  }

  function openNotif() {
    if (!notifBtnRef.current) return
    const rect = notifBtnRef.current.getBoundingClientRect()
    const panelWidth = Math.min(320, window.innerWidth - 16)
    const naturalRight = window.innerWidth - rect.right
    // Clamp so the panel never overflows the left edge
    const right = Math.min(naturalRight, window.innerWidth - panelWidth - 8)
    setNotifPanelPos({ top: rect.bottom + 8, right })
    setNotifOpen(true)
  }

  function getDaysLabel(days: number): { label: string; color: string; dot: string } {
    if (days < 0) return { label: 'En retard', color: 'text-red-600', dot: 'bg-red-500' }
    if (days === 0) return { label: 'Aujourd\'hui', color: 'text-red-600', dot: 'bg-red-500' }
    if (days === 1) return { label: 'Demain', color: 'text-orange-600', dot: 'bg-orange-400' }
    return { label: `Dans ${days} jours`, color: 'text-amber-600', dot: 'bg-amber-400' }
  }

  async function restoreTask(id: string) {
    const { error } = await supabase.from('tasks').update({ status: 'todo', completed_at: null }).eq('id', id)
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'todo' as Status, completedAt: undefined } : t))
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
  const overdueTaskIds = new Set(
    envTasks
      .filter(t => t.status !== 'done' && t.dueDate != null && t.dueDate < todayMidnight)
      .map(t => t.id)
  )
  const overdueCount = overdueTaskIds.size

  const archivedTasks = tasks
    .filter(t => envCategories.some(c => c.id === t.categoryId))
    .filter(t => t.status === 'done' && t.completedAt != null && Date.now() - t.completedAt > ARCHIVE_THRESHOLD)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  const editingTask = modal.open && modal.editId ? tasks.find(t => t.id === modal.editId) : undefined
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null
  const activeTaskCategory = activeTask ? categories.find(c => c.id === activeTask.categoryId) : undefined
  const done = envTasks.filter(t => t.status === 'done').length
  const total = envTasks.length

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
      <header className="bg-white border-b border-teal-100 px-4 sm:px-6 py-2 sm:py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">

        {/* Mobile: full-width search mode */}
        {searchOpen && (
          <div className="sm:hidden flex items-center gap-2 w-full">
            <button
              onClick={closeSearch}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Fermer la recherche"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex items-center gap-2 flex-1 bg-slate-50 border-2 border-teal-400 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') closeSearch() }}
                placeholder="Chercher une tâche…"
                className="flex-1 min-w-0 bg-transparent text-sm text-[#134E4A] placeholder-slate-400 outline-none"
                aria-label="Rechercher une tâche"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 cursor-pointer shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Left: logo + title / desktop search */}
        <div className={`${searchOpen ? 'hidden sm:flex' : 'flex'} items-center gap-3 flex-1 min-w-0`}>
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          {searchOpen ? (
            /* Desktop: inline search in title area */
            <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0 bg-slate-50 border-2 border-teal-400 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') closeSearch() }}
                placeholder="Chercher une tâche…"
                className="flex-1 min-w-0 bg-transparent text-sm text-[#134E4A] placeholder-slate-400 outline-none"
                aria-label="Rechercher une tâche"
              />
              <span className="text-[10px] text-slate-400 bg-slate-200 rounded px-1.5 py-0.5 shrink-0 font-mono hidden sm:inline">Esc</span>
            </div>
          ) : (
            <div>
              <h1 className="text-base font-bold text-[#134E4A] leading-tight">Kanban Board</h1>
              {total > 0 && (
                <p className="text-xs text-teal-500 font-medium leading-tight hidden sm:block">{done}/{total} terminées</p>
              )}
            </div>
          )}
        </div>

        {/* Right: actions (hidden on mobile when search is open) */}
        <div className={`${searchOpen ? 'hidden sm:flex' : 'flex'} items-center gap-2 sm:gap-3 shrink-0`}>
          {/* Search button */}
          <button
            onClick={searchOpen ? closeSearch : openSearch}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${searchOpen ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            aria-label={searchOpen ? 'Fermer la recherche' : 'Rechercher'}
          >
            {searchOpen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            )}
          </button>
          {/* Notification bell */}
          <button
            ref={notifBtnRef}
            onClick={() => notifOpen ? setNotifOpen(false) : openNotif()}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer relative ${notifOpen ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            aria-label="Notifications"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                {notifBadgeCount}
              </span>
            )}
          </button>

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
          {canInstall && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 border border-teal-300 px-3 py-2 rounded-xl hover:bg-teal-50 active:scale-95 transition-all duration-150 cursor-pointer"
              aria-label="Installer l'application"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
              </svg>
              <span className="hidden sm:inline">Installer</span>
            </button>
          )}
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
            className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      )}

      {/* Notification panel */}
      {notifOpen && notifPanelPos && createPortal(
        <div
          ref={notifPanelRef}
          style={{ position: 'fixed', top: notifPanelPos.top, right: notifPanelPos.right, zIndex: 9999, width: 'min(320px, calc(100vw - 16px))' }}
          className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-scale-in"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-800">
              Notifications
              {urgentTasks.length > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-slate-400">· {urgentTasks.length}</span>
              )}
            </span>
            {urgentTasks.length > 0 && notifBadgeCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Panel body */}
          {urgentTasks.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm font-semibold text-slate-600">Tout est à jour</p>
              <p className="text-xs text-slate-400 mt-1">Aucune tâche urgente</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {urgentTasks.map(({ task, days }) => {
                const { label, color, dot } = getDaysLabel(days)
                const isUnread = days <= 0 && !readNotifIds.has(task.id)
                const cat = categories.find(c => c.id === task.categoryId)
                return (
                  <button
                    key={task.id}
                    onClick={() => {
                      setNotifOpen(false)
                      setReadNotifIds(prev => new Set([...prev, task.id]))
                      setModal({ open: true, status: task.status, editId: task.id })
                    }}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isUnread ? dot : 'bg-slate-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isUnread ? 'text-slate-800' : 'text-slate-500'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-semibold ${color}`}>{label}</span>
                        {cat && (
                          <span className="text-xs text-slate-400 truncate">{cat.label}</span>
                        )}
                      </div>
                    </div>
                    <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                )
              })}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* FilterBar */}
      <FilterBar
        categories={envCategories}
        activeFilter={activeFilter}
        onFilterChange={id => { setActiveFilter(id); setShowArchive(false); setShowOverdue(false) }}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        hiddenCategories={hiddenCategories}
        onToggleHideCategory={toggleHideCategory}
        showArchive={showArchive}
        onToggleArchive={toggleArchive}
        archiveCount={archivedTasks.length}
        showOverdue={showOverdue}
        onToggleOverdue={toggleOverdue}
        overdueCount={overdueCount}
      />

      {/* Archive view */}
      {showArchive && (
        <main className="p-4 sm:p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"/>
            </svg>
            <h2 className="text-sm font-bold text-amber-800">Archive — {archivedTasks.length} tâche{archivedTasks.length > 1 ? 's' : ''}</h2>
            <span className="text-xs text-amber-600 ml-1">(terminées il y a plus de 15 jours)</span>
          </div>
          {archivedTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Aucune tâche archivée</p>
          ) : (
            <div className="flex flex-col gap-2">
              {archivedTasks.map(task => {
                const cat = categories.find(c => c.id === task.categoryId)
                const daysAgo = task.completedAt ? Math.floor((Date.now() - task.completedAt) / 86400000) : 0
                return (
                  <div key={task.id} className="bg-white border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-400 line-through truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {cat && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>
                            {cat.label}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Terminé il y a {daysAgo} jour{daysAgo > 1 ? 's' : ''}
                          {task.completedAt && ` · ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(task.completedAt))}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => restoreTask(task.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                      </svg>
                      Restaurer
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      )}

      {/* Board */}
      {!showArchive && (isMobile ? (
        <>
          {/* Tab bar */}
          <div className="bg-white border-b border-slate-200 flex sticky top-[85px] z-10">
            {COLUMNS.map(col => {
              const count = envTasks.filter(t => t.status === col.id).length
              const isActive = activeTab === col.id
              const activeStyle =
                col.id === 'todo' ? 'text-slate-700 border-slate-700' :
                col.id === 'in_progress' ? 'text-teal-700 border-teal-600' :
                'text-emerald-600 border-emerald-500'
              const activeBadge =
                col.id === 'todo' ? 'bg-slate-100 text-slate-600' :
                col.id === 'in_progress' ? 'bg-teal-100 text-teal-700' :
                'bg-emerald-100 text-emerald-600'
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
            <div ref={el => { columnRefs.current[activeTab] = el }}>
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
                hiddenCategories={hiddenCategories}
                searchQuery={searchQuery}
                overdueFilter={showOverdue}
                overdueTaskIds={overdueTaskIds}
              />
            </div>
          </main>
        </>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <main className="p-6 flex gap-5 overflow-x-auto min-h-[calc(100vh-121px)] items-start">
            {COLUMNS.map(col => (
              <div key={col.id} ref={el => { columnRefs.current[col.id] = el }} className="flex-1 min-w-0 flex flex-col">
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
      ))}

      {/* Undo delete snackbar */}
      {pendingDelete && (
        <div
          key={pendingDelete.task.id}
          style={{ animation: 'slideUpFade 0.25s cubic-bezier(0.16,1,0.3,1)' }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(360px,calc(100vw-32px))]"
          role="status"
          aria-live="polite"
          data-testid="undo-snackbar"
        >
          <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-base" aria-hidden="true">🗑</span>
              <span className="flex-1 text-sm text-slate-200 font-medium truncate">
                &ldquo;{pendingDelete.task.title}&rdquo; supprimée
              </span>
              <button
                onClick={undoDelete}
                className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer shrink-0 ml-1"
              >
                ↩ Annuler
              </button>
            </div>
            <div className="h-1 bg-slate-700">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ animation: 'shrink 5s linear forwards' }}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Modal */}
      {modal.open && (
        <TaskModal
          defaultStatus={modal.status}
          columns={COLUMNS}
          categories={envCategories}
          task={editingTask}
          onSave={saveTask}
          onAddCategory={addCategory}
          onUpdateSubtasks={updateTaskSubtasks}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  )
}
