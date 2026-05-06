import { useState, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
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

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isDragOverlay,
  })
  const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const wasDragging = useRef(false)

  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

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

  function handleCardClick() {
    if (isDragOverlay) return
    if (wasDragging.current) { wasDragging.current = false; return }
    onEdit(task.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...(!isDragOverlay ? listeners : {})}
      {...(!isDragOverlay ? attributes : {})}
      onClick={handleCardClick}
      className={`bg-white rounded-xl px-4 py-3.5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative cursor-pointer active:cursor-grabbing animate-scale-in ${isDragging ? 'opacity-40' : ''} ${isDragOverlay ? 'shadow-xl rotate-1 opacity-95 cursor-grabbing' : ''}`}
    >
      {/* Top row: title + menu button */}
      <div className="flex items-start gap-2 justify-between">
        <p className="text-sm font-semibold text-[#134E4A] leading-snug flex-1 pr-1">{task.title}</p>
        {!isDragOverlay && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
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
