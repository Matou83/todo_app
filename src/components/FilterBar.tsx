import { useState } from 'react'
import { type Category } from '../types'

interface Props {
  categories: Category[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAddCategory: (label: string) => Promise<Category | null>
}

export default function FilterBar({ categories, activeFilter, onFilterChange, onAddCategory }: Props) {
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
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onFilterChange(activeFilter === cat.id ? null : cat.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 ${
            activeFilter === cat.id ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          style={activeFilter === cat.id ? { backgroundColor: cat.color } : {}}
        >
          {cat.label}
        </button>
      ))}

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
