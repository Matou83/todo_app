import { useState } from 'react'
import { type Category } from '../types'

interface Props {
  categories: Category[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAddCategory: (label: string) => Promise<Category | null>
  hiddenCategories: Set<string>
  onToggleHideCategory: (id: string) => void
}

export default function FilterBar({ categories, activeFilter, onFilterChange, onAddCategory, hiddenCategories, onToggleHideCategory }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!inputValue.trim()) return
    const result = await onAddCategory(inputValue)
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
    <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto flex-nowrap sm:flex-wrap sticky top-[73px] z-10 scrollbar-none">
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
  return (
    <div key={cat.id} className="relative group/cat shrink-0 flex items-center">
      <button
        onClick={() => onFilterChange(isActive ? null : cat.id)}
        className={`rounded-full pl-3 pr-7 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
      <button
        onClick={e => { e.stopPropagation(); onToggleHideCategory(cat.id) }}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 transition-opacity duration-150 cursor-pointer ${
          isHidden ? 'opacity-100' : 'opacity-0 group-hover/cat:opacity-100'
        }`}
        aria-label={isHidden ? `Afficher ${cat.label}` : `Masquer ${cat.label}`}
        title={isHidden ? `Afficher ${cat.label}` : `Masquer ${cat.label}`}
      >
        {isHidden ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: cat.color }}>
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
})}

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
          className="rounded-full px-3 py-1 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-teal-400 hover:text-teal-600 transition-colors duration-150 cursor-pointer shrink-0"
        >
          + Catégorie
        </button>
      )}
    </div>
  )
}
