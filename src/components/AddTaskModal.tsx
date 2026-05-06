import { useState, useRef, useEffect } from 'react'
import { type Column, type Status, type Priority, type Task, type Category, DEFAULT_CATEGORIES } from '../types'
import DescriptionEditor from './DescriptionEditor'

interface Props {
  defaultStatus: Status
  columns: Column[]
  categories: Category[]
  task?: Task
  onSave: (title: string, description: string, status: Status, priority: Priority, categoryId: string, editId?: string, dueDate?: number) => Promise<boolean>
  onAddCategory: (label: string) => Promise<Category | null>
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
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
  )
  const inputRef = useRef<HTMLInputElement>(null)

  // Snapshot of original values for auto-save comparison (edit mode only)
  const snapshot = useRef({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: (task?.status ?? defaultStatus) as Status,
    priority: (task?.priority ?? 'medium') as Priority,
    categoryId: task?.categoryId ?? DEFAULT_CATEGORIES[0].id,
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
  })

  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  function hasChanges(): boolean {
    if (!isEdit) return false
    const s = snapshot.current
    return (
      title !== s.title ||
      description !== s.description ||
      status !== s.status ||
      priority !== s.priority ||
      categoryId !== s.categoryId ||
      dueDate !== s.dueDate
    )
  }

  const hasChangesRef = useRef(false)
  hasChangesRef.current = hasChanges()

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleCloseRef = useRef<() => Promise<void>>(async () => {})

  async function handleClose() {
    if (saving) return
    if (isEdit && hasChanges()) {
      setSaving(true)
      setSaveError('')
      const dueDateTs = dueDate ? new Date(dueDate).getTime() : undefined
      const ok = await onSave(title.trim(), description.trim(), status, priority, categoryId, task?.id, dueDateTs)
      setSaving(false)
      if (!ok) { setSaveError('Erreur lors de la sauvegarde.'); return }
    }
    onClose()
  }

  handleCloseRef.current = handleClose

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isEdit && hasChangesRef.current) {
        e.preventDefault()
        e.returnValue = true
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setSaveError('')
    const dueDateTs = dueDate ? new Date(dueDate).getTime() : undefined
    const ok = await onSave(title.trim(), description.trim(), status, priority, categoryId, task?.id, dueDateTs)
    if (!isMounted.current) return
    setSaving(false)
    if (ok) onClose()
    else setSaveError('Erreur lors de la sauvegarde. Réessayez.')
  }

  async function handleCreateCategory() {
    if (!newCatLabel.trim()) return
    const result = await onAddCategory(newCatLabel)
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Handle bar — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#134E4A]">
            {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            onClick={handleClose}
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
            <label className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Description
            </label>
            <DescriptionEditor
              value={description}
              onChange={setDescription}
            />
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="task-due-date" className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Date d'échéance
            </label>
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#134E4A] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="absolute right-3 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                  aria-label="Effacer la date"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
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
          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            {!isEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold bg-[#0D9488] text-white rounded-xl hover:bg-teal-700 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Sauvegarde…' : 'Ajouter'}
              </button>
            )}
            {isEdit && (
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="sm:hidden px-5 py-2.5 text-sm font-semibold bg-[#0D9488] text-white rounded-xl hover:bg-teal-700 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            )}
            {isEdit && saving && (
              <span className="hidden sm:block px-4 py-2.5 text-sm text-slate-400">Sauvegarde…</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
