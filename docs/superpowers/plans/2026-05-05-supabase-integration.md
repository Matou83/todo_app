# Supabase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer localStorage par Supabase (Auth email+password + PostgreSQL avec RLS) pour permettre l'accès multi-appareils.

**Architecture:** Supabase Auth gère la session (persistée automatiquement). Deux tables PostgreSQL (`tasks`, `categories`) avec RLS assurent que chaque utilisateur ne voit que ses données. `App.tsx` passe d'un modèle synchrone localStorage à des appels async Supabase. Un écran `AuthForm` s'affiche quand l'utilisateur n'est pas connecté.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, @supabase/supabase-js, @dnd-kit/core

---

## Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `package.json` | Modifié | Installation @supabase/supabase-js |
| `.env` | Modifié | Ajout VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |
| `src/lib/supabase.ts` | Créé | Instance unique du client Supabase |
| `src/components/AuthForm.tsx` | Créé | Formulaire login/register |
| `src/components/FilterBar.tsx` | Modifié | onAddCategory devient async |
| `src/components/AddTaskModal.tsx` | Modifié | onAddCategory devient async |
| `src/App.tsx` | Remplacé | Auth + fetch async + CRUD Supabase |

---

## Task 1 — Installer @supabase/supabase-js et préparer les variables d'environnement

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env`

- [ ] **Step 1 : Installer la dépendance**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app
npm install @supabase/supabase-js
```

Expected : `added 1 package` (ou similaire), exit 0.

- [ ] **Step 2 : Ajouter les variables dans `.env`**

Ajouter ces deux lignes dans `/Users/mathieu/Documents/Claude/Projects/todo_app/.env`, après les variables existantes :

```
# ─────────────────────────────────────────────────────────────────────────────
# SUPABASE — récupère ces valeurs sur https://supabase.com/dashboard
# Settings → API → Project URL et anon public key
# ─────────────────────────────────────────────────────────────────────────────
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3 : Vérifier que le build passe toujours**

```bash
npm run build 2>&1 | tail -3
```

Expected : `✓ built in`

- [ ] **Step 4 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js"
```

---

## Task 2 — Configurer le projet Supabase (étape manuelle)

**Files:** Aucun — étapes réalisées sur le dashboard Supabase et dans `.env`

> ⚠️ Cette tâche est entièrement manuelle. L'implémenteur doit guider l'utilisateur ou lui demander de la réaliser avant de continuer.

- [ ] **Step 1 : Créer le projet Supabase**

Aller sur https://supabase.com/dashboard → "New project" :
- Name : `todo-kanban`
- Password : choisir un mot de passe fort (le noter)
- Region : Europe West (ou la plus proche)

Attendre que le projet soit prêt (~1 minute).

- [ ] **Step 2 : Exécuter le schéma SQL**

Dans le dashboard → "SQL Editor" → "New query", coller et exécuter :

```sql
-- Table tasks
CREATE TABLE tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  priority    text        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category_id text        NOT NULL DEFAULT 'ops',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Table categories (custom uniquement)
CREATE TABLE categories (
  id          text        NOT NULL,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text        NOT NULL,
  color       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() = user_id);
```

Expected : "Success. No rows returned"

- [ ] **Step 3 : Récupérer les credentials**

Dashboard → Settings → API :
- Copier **Project URL** → coller dans `.env` à la valeur `VITE_SUPABASE_URL`
- Copier **anon public** (sous "Project API keys") → coller dans `.env` à la valeur `VITE_SUPABASE_ANON_KEY`

- [ ] **Step 4 : Vérifier le `.env`**

```bash
grep "VITE_SUPABASE" /Users/mathieu/Documents/Claude/Projects/todo_app/.env
```

Expected : deux lignes avec des valeurs non vides (URL commence par `https://`, clé commence par `eyJ`).

---

## Task 3 — Créer src/lib/supabase.ts

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1 : Créer le dossier et le fichier**

```bash
mkdir -p /Users/mathieu/Documents/Claude/Projects/todo_app/src/lib
```

Créer `src/lib/supabase.ts` avec ce contenu exact :

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "supabase"
```

Expected : aucune ligne (pas d'erreur sur ce fichier).

- [ ] **Step 3 : Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client"
```

---

## Task 4 — Créer src/components/AuthForm.tsx

**Files:**
- Create: `src/components/AuthForm.tsx`

- [ ] **Step 1 : Créer `src/components/AuthForm.tsx`**

```tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onAuth: () => void
}

export default function AuthForm({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else onAuth()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else onAuth()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-700 rounded-2xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#134E4A] text-center mb-1">Kanban Board</h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          {mode === 'login' ? 'Connecte-toi pour accéder à ton board' : 'Crée ton compte pour commencer'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#134E4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-semibold text-[#134E4A] mb-1.5">
              Mot de passe
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#134E4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D9488] text-white font-semibold py-2.5 rounded-xl hover:bg-teal-700 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-4">
          {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-teal-600 font-semibold hover:text-teal-800 cursor-pointer"
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "AuthForm"
```

Expected : aucune ligne.

- [ ] **Step 3 : Commit**

```bash
git add src/components/AuthForm.tsx
git commit -m "feat: add AuthForm component with login and register"
```

---

## Task 5 — Mettre à jour FilterBar.tsx et AddTaskModal.tsx (onAddCategory async)

**Files:**
- Modify: `src/components/FilterBar.tsx`
- Modify: `src/components/AddTaskModal.tsx`

`addCategory` dans `App.tsx` devient async (appel Supabase). Les deux composants qui appellent `onAddCategory` doivent mettre à jour le type de prop et leurs handlers.

- [ ] **Step 1 : Mettre à jour FilterBar.tsx**

Dans `src/components/FilterBar.tsx`, faire ces deux modifications :

**1a — Changer le type de prop** (ligne ~8) :

```tsx
// Avant :
onAddCategory: (label: string) => Category | null

// Après :
onAddCategory: (label: string) => Promise<Category | null>
```

**1b — Rendre `handleAdd` async** (ligne ~16) :

```tsx
// Avant :
function handleAdd() {
  if (!inputValue.trim()) return
  const result = onAddCategory(inputValue)

// Après :
async function handleAdd() {
  if (!inputValue.trim()) return
  const result = await onAddCategory(inputValue)
```

- [ ] **Step 2 : Mettre à jour AddTaskModal.tsx**

Dans `src/components/AddTaskModal.tsx`, faire ces deux modifications :

**2a — Changer le type de prop** (ligne ~10) :

```tsx
// Avant :
onAddCategory: (label: string) => Category | null

// Après :
onAddCategory: (label: string) => Promise<Category | null>
```

**2b — Rendre `handleCreateCategory` async** (ligne ~67) :

```tsx
// Avant :
function handleCreateCategory() {
  if (!newCatLabel.trim()) return
  const result = onAddCategory(newCatLabel)

// Après :
async function handleCreateCategory() {
  if (!newCatLabel.trim()) return
  const result = await onAddCategory(newCatLabel)
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "error TS"
```

Expected : des erreurs sur `App.tsx` (normal, pas encore mis à jour). Aucune erreur sur `FilterBar` ou `AddTaskModal`.

- [ ] **Step 4 : Commit**

```bash
git add src/components/FilterBar.tsx src/components/AddTaskModal.tsx
git commit -m "feat: make onAddCategory async in FilterBar and AddTaskModal"
```

---

## Task 6 — Réécrire src/App.tsx avec Supabase

**Files:**
- Replace: `src/App.tsx`

C'est le changement central : suppression de tous les helpers localStorage, ajout de l'auth, passage de toutes les fonctions CRUD en async avec Supabase.

- [ ] **Step 1 : Remplacer le contenu de `src/App.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { type Session } from '@supabase/supabase-js'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { type Task, type Status, type Priority, type Category, COLUMNS, DEFAULT_CATEGORIES, CATEGORY_COLOR_PALETTE } from './types'
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
  }
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, label: row.label, color: row.color }
}

// ── Component ─────────────────────────────────────────────────────────────────

type ModalState = { open: false } | { open: true; status: Status; editId?: string }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Auth + fetch initial ──────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchData()
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session)
        fetchData()
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setTasks([])
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
  ) {
    if (editId) {
      const { error } = await supabase.from('tasks').update({
        title, description, status, priority, category_id: categoryId,
      }).eq('id', editId)
      if (!error) setTasks(prev => prev.map(t => t.id === editId ? { ...t, title, description, status, priority, categoryId } : t))
    } else {
      const { data, error } = await supabase.from('tasks').insert({
        title, description, status, priority, category_id: categoryId,
        user_id: session!.user.id,
      }).select().single()
      if (!error && data) setTasks(prev => [...prev, mapTask(data as TaskRow)])
    }
  }

  async function moveTask(id: string, status: Status) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(prev => prev.filter(t => t.id !== id))
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async function addCategory(label: string): Promise<Category | null> {
    const trimmed = label.trim()
    if (!trimmed) return null
    const isDuplicate = categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) return null
    const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const colorIndex = customCategories.length % CATEGORY_COLOR_PALETTE.length
    const color = CATEGORY_COLOR_PALETTE[colorIndex]
    const { error } = await supabase.from('categories').insert({
      id, label: trimmed, color, user_id: session!.user.id,
    })
    if (error) return null
    const newCat: Category = { id, label: trimmed, color }
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const editingTask = modal.open && modal.editId ? tasks.find(t => t.id === modal.editId) : undefined
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null
  const activeTaskCategory = activeTask ? categories.find(c => c.id === activeTask.categoryId) : undefined
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

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
      <header className="bg-white border-b border-teal-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#134E4A] leading-tight">Kanban Board</h1>
            {total > 0 && (
              <p className="text-xs text-teal-500 font-medium leading-tight">{done}/{total} terminées</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModal({ open: true, status: 'todo' })}
            className="flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-500 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
            aria-label="Créer une nouvelle tâche"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle tâche
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* FilterBar */}
      <FilterBar
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddCategory={addCategory}
      />

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="p-6 flex gap-5 overflow-x-auto min-h-[calc(100vh-121px)] items-start">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks.filter(t => t.status === col.id)}
              categories={categories}
              activeFilter={activeFilter}
              onAddTask={() => setModal({ open: true, status: col.id })}
              onMoveTask={moveTask}
              onDeleteTask={deleteTask}
              onEditTask={(id) => setModal({ open: true, status: tasks.find(t => t.id === id)?.status ?? col.id, editId: id })}
              allStatuses={COLUMNS}
            />
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
              allStatuses={COLUMNS}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal */}
      {modal.open && (
        <TaskModal
          defaultStatus={modal.status}
          columns={COLUMNS}
          categories={categories}
          task={editingTask}
          onSave={saveTask}
          onAddCategory={addCategory}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation complète**

```bash
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur.

- [ ] **Step 3 : Build complet**

```bash
npm run build 2>&1 | tail -3
```

Expected : `✓ built in`

- [ ] **Step 4 : Test dev — vérifier que l'écran de login s'affiche**

```bash
npm run dev
```

Ouvrir http://localhost:5173 (ou le port affiché). Vérifier :
- L'écran de login s'affiche (fond teal clair, formulaire centré)
- La bascule login/register fonctionne
- La connexion avec un compte valide affiche le board
- Le bouton "Déconnexion" dans le header fonctionne
- Créer une tâche → vérifier dans Supabase dashboard → Table Editor → tasks qu'une ligne apparaît

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace localStorage with Supabase auth and CRUD"
```

---

## Task 7 — Configurer Vercel et déployer

**Files:**
- Modify: variables d'environnement Vercel (via CLI)

- [ ] **Step 1 : Ajouter les variables d'environnement sur Vercel**

```bash
source /Users/mathieu/Documents/Claude/Projects/todo_app/.env
npx vercel env add VITE_SUPABASE_URL production --token "$VERCEL_TOKEN" --scope matou83s-projects <<< "$VITE_SUPABASE_URL"
npx vercel env add VITE_SUPABASE_ANON_KEY production --token "$VERCEL_TOKEN" --scope matou83s-projects <<< "$VITE_SUPABASE_ANON_KEY"
```

Expected : `Added Environment Variable VITE_SUPABASE_URL` (et idem pour ANON_KEY).

- [ ] **Step 2 : Pousser sur GitHub pour déclencher le redéploiement**

```bash
git push origin main
```

Vercel redéploie automatiquement depuis le push GitHub.

- [ ] **Step 3 : Vérifier le déploiement**

Attendre ~1 minute, puis ouvrir https://todoapp-cyan-alpha.vercel.app et vérifier :
- L'écran de login s'affiche
- La connexion fonctionne
- Les tâches créées persistent et sont visibles depuis un autre navigateur/appareil

---

## Self-Review

**Couverture spec :**
- ✅ Auth email + password → Tasks 4 + 6
- ✅ Tables tasks + categories avec RLS → Task 2
- ✅ Mapping snake_case/camelCase → Task 6 (`mapTask`, `mapCategory`)
- ✅ Loading state → Task 6 (`if (loading) return <spinner>`)
- ✅ Bouton déconnexion → Task 6 (header)
- ✅ addCategory async → Task 5 + 6
- ✅ Erreurs inline AuthForm → Task 4
- ✅ Variables Vercel → Task 7
- ✅ localStorage complètement supprimé → Task 6 (plus aucune référence)
