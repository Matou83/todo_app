import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type Task, type Column, type Status, type Priority, type Category } from '../types'
import DescriptionRenderer from './DescriptionRenderer'

interface Props {
  task: Task
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  allStatuses: Column[]
  category?: Category
  isDragOverlay?: boolean
  isHidden?: boolean
  searchQuery?: string
  isOverdueDimmed?: boolean
}

const PRIORITY_STYLE: Record<Priority, { dot: string; text: string; bg: string; label: string }> = {
  high:   { dot: 'bg-red-500',   text: 'text-red-600',   bg: 'bg-red-50',   label: 'Haute' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Moyenne' },
  low:    { dot: 'bg-teal-500',  text: 'text-teal-600',  bg: 'bg-teal-50',  label: 'Basse' },
}


function getDueDateBadge(dueDate: number): { label: string; className: string } {
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const due = new Date(dueDate)
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const days = Math.round((dueMidnight - todayMidnight) / 86400000)

  if (days < 0)  return { label: 'En retard', className: 'bg-red-50 text-red-600' }
  if (days === 0) return { label: 'Aujourd\'hui', className: 'bg-red-50 text-red-600' }
  if (days === 1) return { label: 'Demain', className: 'bg-orange-50 text-orange-600' }
  if (days <= 3)  return { label: `Dans ${days} jours`, className: 'bg-orange-50 text-orange-600' }
  return {
    label: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(due),
    className: 'bg-teal-50 text-teal-600',
  }
}

export default function TaskCard({ task, onMove, onDelete, onEdit, onUpdateDescription, allStatuses, category, isDragOverlay, isHidden, searchQuery, isOverdueDimmed }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuWrapperRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const priority = PRIORITY_STYLE[task.priority ?? 'medium']

  const dueDateBadge = task.dueDate != null ? getDueDateBadge(task.dueDate) : null

  const q = searchQuery?.trim().toLowerCase() ?? ''
  const isSearchMatch = !q || task.title.toLowerCase().includes(q)
  const isSearchDimmed = !!q && !isSearchMatch

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isDragOverlay,
  })
  const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const wasDragging = useRef(false)
  const menuActionTs = useRef(0)

  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      const inMenu = menuRef.current?.contains(e.target as Node)
      const inWrapper = menuWrapperRef.current?.contains(e.target as Node)
      if (!inMenu && !inWrapper) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  function handleCardClick() {
    if (completing) return
    if (isDragOverlay) return
    if (wasDragging.current) { wasDragging.current = false; return }
    // Ignore ghost clicks generated after a menu action (mobile)
    if (Date.now() - menuActionTs.current < 400) return
    onEdit(task.id)
  }

  function handleMenuAction(fn: () => void) {
    menuActionTs.current = Date.now()
    fn()
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...dragStyle,
        ...(completing ? {
          animation: 'greenFlash 0.25s ease-out, springSlideOut 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards',
          pointerEvents: 'none' as const,
        } : {}),
      }}
      {...(!isDragOverlay ? listeners : {})}
      {...(!isDragOverlay ? attributes : {})}
      onClick={handleCardClick}
      className={`bg-white rounded-xl px-4 py-3.5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative cursor-pointer active:cursor-grabbing animate-scale-in ${isDragging ? 'opacity-40' : ''} ${isDragOverlay ? 'shadow-xl rotate-1 opacity-95 cursor-grabbing' : ''} ${isHidden ? 'blur-[4px] opacity-55 pointer-events-none select-none' : ''} ${isOverdueDimmed ? 'opacity-25 pointer-events-none select-none' : ''} ${isSearchDimmed ? 'opacity-25 pointer-events-none select-none border-slate-200' : isSearchMatch && q ? 'border-teal-400 ring-2 ring-teal-400/30 border-slate-200' : 'border-slate-200'}`}
    >
      {/* Top row: title + menu button */}
      <div className="flex items-start gap-2 justify-between">
        <p className="text-sm font-semibold text-[#134E4A] leading-snug flex-1 pr-1">{task.title}</p>
        {!isDragOverlay && (
          <div ref={menuWrapperRef} className="relative shrink-0">
            <button
              ref={menuBtnRef}
              onClick={e => {
                e.stopPropagation()
                if (!showMenu && menuBtnRef.current) {
                  const rect = menuBtnRef.current.getBoundingClientRect()
                  const spaceBelow = window.innerHeight - rect.bottom
                  if (spaceBelow < 220) {
                    setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right })
                  } else {
                    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                  }
                }
                setShowMenu(v => !v)
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-all duration-150 cursor-pointer"
              aria-label="Options de la tâche"
              aria-expanded={showMenu}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>

            {showMenu && menuPos && createPortal(
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right, zIndex: 9999 }}
                className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-44 animate-scale-in"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => handleMenuAction(() => { onEdit(task.id); setShowMenu(false) })}
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
                        onClick={() => handleMenuAction(() => { onMove(task.id, s.id); setShowMenu(false) })}
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
                    onClick={() => handleMenuAction(() => { onDelete(task.id); setShowMenu(false) })}
                    className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <DescriptionRenderer
          html={task.description}
          onToggleCheckbox={isDragOverlay ? undefined : newHtml => onUpdateDescription(task.id, newHtml)}
        />
      )}

      {/* Subtasks progress bar + badge */}
      {task.subtasks.length > 0 && (() => {
        const total = task.subtasks.length
        const done = task.subtasks.filter(s => s.done).length
        const pct = Math.round((done / total) * 100)
        const allDone = done === total
        return (
          <div className="mt-2.5">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: allDone ? '#16a34a' : '#14b8a6' }}
              />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${allDone ? 'text-green-600' : 'text-slate-400'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {allDone ? `${total}/${total} terminées` : `${done}/${total} sous-tâches`}
            </div>
          </div>
        )
      })()}

      {/* Footer: category + priority + date + complete button */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {category && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: category.color }}
            >
              {category.label}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} aria-hidden="true" />
            {priority.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {dueDateBadge && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${dueDateBadge.className}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {dueDateBadge.label}
            </span>
          )}
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
        </div>
      </div>
    </div>
  )
}
