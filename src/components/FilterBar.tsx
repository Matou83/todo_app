import { useState } from 'react'
import { type Category, CATEGORY_COLOR_PALETTE, DEFAULT_CATEGORIES } from '../types'

const DEFAULT_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map(c => c.id))

interface Props {
  categories: Category[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAddCategory: (label: string, color?: string) => Promise<Category | null>
  onDeleteCategory: (id: string) => Promise<void>
  hiddenCategories: Set<string>
  onToggleHideCategory: (id: string) => void
  showArchive: boolean
  onToggleArchive: () => void
  archiveCount: number
  showOverdue: boolean
  onToggleOverdue: () => void
  overdueCount: number
}

export default function FilterBar({ categories, activeFilter, onFilterChange, onAddCategory, onDeleteCategory, hiddenCategories, onToggleHideCategory, showArchive, onToggleArchive, archiveCount, showOverdue, onToggleOverdue, overdueCount }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLOR_PALETTE[0])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleAdd() {
    if (!inputValue.trim()) return
    const result = await onAddCategory(inputValue, selectedColor)
    if (!result) {
      setError('Cette catégorie existe déjà')
      return
    }
    setInputValue('')
    setError('')
    setShowInput(false)
    setSelectedColor(CATEGORY_COLOR_PALETTE[0])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); setError('') }
  }

  return (
    <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto flex-nowrap sm:flex-wrap sticky top-[57px] z-10 scrollbar-none">
      <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">FILTRE</span>

      {/* "Toutes" chip */}
      <button
        onClick={() => onFilterChange(null)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer shrink-0 ${
          activeFilter === null
            ? 'bg-[#134E4A] text-white'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        Toutes
      </button>

      {/* Category chips */}
      {categories.map(cat => {
        const isHidden = hiddenCategories.has(cat.id)
        const isActive = activeFilter === cat.id
        const isCustom = !DEFAULT_CATEGORY_IDS.has(cat.id)

        // Inline confirm state
        if (confirmDeleteId === cat.id) {
          return (
            <div key={cat.id} className="shrink-0 flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
              <span className="text-[10px] font-semibold text-red-600">Supprimer ?</span>
              <button
                onClick={async () => { await onDeleteCategory(cat.id); setConfirmDeleteId(null) }}
                className="text-[10px] font-bold text-red-600 hover:text-red-800 cursor-pointer"
              >
                Oui
              </button>
              <span className="text-slate-300 text-[10px]">·</span>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Non
              </button>
            </div>
          )
        }

        return (
          <div key={cat.id} className="relative group/cat shrink-0 flex items-center">
            <button
              onClick={() => onFilterChange(isActive ? null : cat.id)}
              className={`rounded-full pl-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isCustom ? 'pr-11' : 'pr-7'
              } ${
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

            {/* Hide button */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleHideCategory(cat.id) }}
              className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-150 cursor-pointer ${
                isCustom ? 'right-6' : 'right-1.5'
              } ${
                isHidden ? 'opacity-100' : 'opacity-0 group-hover/cat:opacity-100 sm:opacity-0 max-sm:opacity-100'
              }`}
              aria-label={isHidden ? `Afficher ${cat.label}` : `Masquer ${cat.label}`}
              title={isHidden ? `Afficher ${cat.label}` : `Masquer ${cat.label}`}
            >
              {isHidden ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: cat.color }}>
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>

            {/* Delete button (custom categories only) */}
            {isCustom && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setConfirmDeleteId(cat.id) }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 transition-opacity duration-150 cursor-pointer opacity-0 group-hover/cat:opacity-100 sm:opacity-0 max-sm:opacity-100"
                aria-label={`Supprimer ${cat.label}`}
                title={`Supprimer ${cat.label}`}
              >
                <svg className="w-3 h-3 text-red-400 hover:text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            )}
          </div>
        )
      })}

      {/* Overdue chip */}
      {overdueCount > 0 && (
        <button
          onClick={onToggleOverdue}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 flex items-center gap-1.5 ${
            showOverdue
              ? 'bg-red-600 text-white ring-2 ring-red-300'
              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
          }`}
        >
          🔥 En retard
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showOverdue ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'}`}>
            {overdueCount}
          </span>
        </button>
      )}

      {/* Archive chip */}
      <button
        onClick={onToggleArchive}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 flex items-center gap-1.5 ${
          showArchive
            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
            : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700 border border-dashed border-slate-300 hover:border-amber-300'
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"/>
        </svg>
        Archive
        {archiveCount > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showArchive ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-500'}`}>
            {archiveCount}
          </span>
        )}
      </button>

      {/* Add category */}
      {showInput ? (
        <div className="flex flex-col gap-1.5">
          {/* Input row with color dot */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: selectedColor }}
            />
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Nom de la catégorie…"
              className="text-xs border border-teal-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400 w-32"
            />
            <button
              onClick={handleAdd}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer"
            >
              Créer
            </button>
            <button
              onClick={() => { setShowInput(false); setInputValue(''); setError(''); setSelectedColor(CATEGORY_COLOR_PALETTE[0]) }}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
          {/* Color swatches row */}
          <div className="flex items-center gap-1.5 pl-5">
            {CATEGORY_COLOR_PALETTE.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className="w-4 h-4 rounded-full shrink-0 transition-transform duration-100 cursor-pointer hover:scale-110"
                style={{
                  backgroundColor: color,
                  outline: selectedColor === color ? `2.5px solid ${color}` : 'none',
                  outlineOffset: '2px',
                  boxShadow: selectedColor === color ? '0 0 0 1px white inset' : 'none',
                }}
                aria-label={`Couleur ${color}`}
                aria-pressed={selectedColor === color}
              />
            ))}
            {inputValue.trim() && (
              <>
                <span className="text-slate-300 text-xs mx-0.5">→</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0 max-w-[80px] truncate"
                  style={{ backgroundColor: selectedColor }}
                >
                  {inputValue.trim()}
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="rounded-full px-3 py-1 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-teal-400 hover:text-teal-600 transition-colors duration-150 cursor-pointer shrink-0"
        >
          + Catégorie
        </button>
      )}
    </div>
  )
}
