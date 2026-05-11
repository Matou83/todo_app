import { type Category, type Task, type Status, type Column } from '../types'
import TaskCard from './TaskCard'

interface Props {
  category: Category
  tasks: Task[]
  collapsed: boolean
  onToggle: () => void
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  allStatuses: Column[]
  isHidden?: boolean
  searchQuery?: string
  overdueFilter?: boolean
  overdueTaskIds?: Set<string>
}

export default function CategorySection({
  category,
  tasks,
  collapsed,
  onToggle,
  onMove,
  onDelete,
  onEdit,
  onUpdateDescription,
  allStatuses,
  isHidden,
  searchQuery,
  overdueFilter,
  overdueTaskIds,
}: Props) {
  // Couleur avec opacité légère pour le fond du header
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 cursor-pointer w-full text-left"
        style={{ backgroundColor: hexToRgba(category.color, 0.1), borderLeft: `3px solid ${category.color}` }}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Déplier' : 'Replier'} la catégorie ${category.label}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
          <span className="text-xs font-bold" style={{ color: category.color, ...(isHidden ? { filter: 'blur(4px)', userSelect: 'none' } : {}) }}>{category.label}</span>
        </div>
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ backgroundColor: hexToRgba(category.color, 0.15), color: category.color }}
        >
          {tasks.length}
        </span>
      </button>

      {/* Task cards */}
      {!collapsed && tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          category={category}
          onMove={onMove}
          onDelete={onDelete}
          onEdit={onEdit}
          onUpdateDescription={onUpdateDescription}
          allStatuses={allStatuses}
          isHidden={isHidden}
          searchQuery={searchQuery}
          isOverdueDimmed={overdueFilter && !overdueTaskIds?.has(task.id)}
        />
      ))}
    </div>
  )
}
