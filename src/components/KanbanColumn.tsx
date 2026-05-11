import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
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
  onUpdateDescription: (id: string, description: string) => void
  allStatuses: Column[]
  hiddenCategories: Set<string>
  searchQuery?: string
  overdueFilter?: boolean
  overdueTaskIds?: Set<string>
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
  column, tasks, categories, activeFilter, hiddenCategories, searchQuery,
  onAddTask, onMoveTask, onDeleteTask, onEditTask, onUpdateDescription, allStatuses,
  overdueFilter, overdueTaskIds,
}: Props) {
  const style = COLUMN_STYLE[column.id]
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  // Filter tasks by active category filter
  const visibleTasks = activeFilter ? tasks.filter(t => t.categoryId === activeFilter) : tasks

  // Count matching tasks for the badge when searching
  const q = searchQuery?.trim().toLowerCase() ?? ''
  const matchingCount = q ? visibleTasks.filter(t => t.title.toLowerCase().includes(q)).length : visibleTasks.length

  // Group visible tasks by categoryId, preserving category order
  const groups = categories
    .map(cat => ({ category: cat, tasks: visibleTasks.filter(t => t.categoryId === cat.id) }))
    .filter(g => g.tasks.length > 0)

  const isEmpty = visibleTasks.length === 0

  const allCollapsed = groups.length > 0 && groups.every(g => collapsed[g.category.id])

  function toggleCollapse(categoryId: string) {
    setCollapsed(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed({})
    } else {
      setCollapsed(Object.fromEntries(groups.map(g => [g.category.id, true])))
    }
  }

  const isDoneDimmed = overdueFilter && column.id === 'done'

  return (
    <div className={`flex flex-col w-full sm:flex-1 sm:min-w-0 animate-slide-up transition-opacity duration-200 ${isDoneDimmed ? 'opacity-35 pointer-events-none' : ''}`}>
      <div
          ref={setNodeRef}
          className={`rounded-2xl overflow-hidden flex flex-col flex-1 ${style.wrapper} shadow-sm transition-all duration-150 ${isOver ? 'ring-2 ring-teal-400 ring-offset-2' : ''}`}
        >
        {/* Accent bar */}
        <div className={`h-1 w-full ${style.accent}`} aria-hidden="true" />

        {/* Column header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} aria-hidden="true" />
            <span className={`font-semibold text-sm ${style.label}`}>{column.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {groups.length > 1 && (
              <button
                onClick={toggleAll}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={allCollapsed ? 'Tout déplier' : 'Tout replier'}
                aria-label={allCollapsed ? 'Tout déplier' : 'Tout replier'}
              >
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${allCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            )}
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${style.count}`}>
              {matchingCount}
            </span>
          </div>
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
                onUpdateDescription={onUpdateDescription}
                allStatuses={allStatuses}
                isHidden={hiddenCategories.has(category.id)}
                searchQuery={searchQuery}
                overdueFilter={overdueFilter}
                overdueTaskIds={overdueTaskIds}
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
