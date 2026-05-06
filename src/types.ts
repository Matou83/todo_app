export type Status = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Category {
  id: string
  label: string
  color: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: Status
  priority: Priority
  categoryId: string
  createdAt: number
  dueDate?: number
}

export interface Column {
  id: Status
  label: string
}

export const COLUMNS: Column[] = [
  { id: 'todo', label: 'À faire' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'ops',     label: 'Ops',     color: '#3B82F6' },
  { id: 'head-of', label: 'Head of', color: '#8B5CF6' },
  { id: 'ia',      label: 'IA',      color: '#10B981' },
  { id: 'perso',   label: 'Perso',   color: '#F97316' },
]

// Palette pour les catégories créées par l'utilisateur (cycle)
export const CATEGORY_COLOR_PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#6366F1', '#A855F7', '#EC4899',
]
