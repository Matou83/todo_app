# Responsive Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapter l'app kanban pour mobile — onglets de navigation, DnD désactivé sur mobile, bottom sheet pour le formulaire, chips de filtre en scroll horizontal.

**Architecture:** Un hook `useIsMobile` détecte le breakpoint `< 768px`. `App.tsx` conditionne le rendu board (onglets vs 3 colonnes) et les capteurs DnD. Les autres composants utilisent uniquement des classes Tailwind responsive (`sm:` préfixe) sans logique JS.

**Tech Stack:** React 19, TypeScript, Tailwind v4, @dnd-kit/core

---

## Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `src/hooks/useIsMobile.ts` | Créé | Détection breakpoint mobile |
| `src/App.tsx` | Modifié | Onglets, DnD conditionnel, header compact |
| `src/components/KanbanColumn.tsx` | Modifié | `w-full` sur mobile |
| `src/components/TaskCard.tsx` | Modifié | Menu `⋯` toujours visible sur mobile |
| `src/components/AddTaskModal.tsx` | Modifié | Bottom sheet sur mobile |
| `src/components/FilterBar.tsx` | Modifié | Scroll horizontal sur mobile |

---

## Task 1 — Créer le hook useIsMobile

**Files:**
- Create: `src/hooks/useIsMobile.ts`

- [ ] **Step 1 : Créer le dossier et le fichier**

```bash
mkdir -p /Users/mathieu/Documents/Claude/Projects/todo_app/src/hooks
```

Créer `src/hooks/useIsMobile.ts` avec ce contenu exact :

```ts
import { useState, useEffect } from 'react'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 767px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "useIsMobile"
```

Expected : aucune ligne.

- [ ] **Step 3 : Commit**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && git add src/hooks/useIsMobile.ts && git commit -m "feat: add useIsMobile hook"
```

---

## Task 2 — FilterBar : scroll horizontal sur mobile

**Files:**
- Modify: `src/components/FilterBar.tsx`

- [ ] **Step 1 : Lire le fichier actuel**

Lire `/Users/mathieu/Documents/Claude/Projects/todo_app/src/components/FilterBar.tsx` pour repérer les lignes exactes.

- [ ] **Step 2 : Modifier le wrapper div de la FilterBar**

Trouver la ligne :
```tsx
<div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center gap-2 flex-wrap sticky top-[73px] z-10">
```

Remplacer par :
```tsx
<div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto flex-nowrap sm:flex-wrap sticky top-[73px] z-10 scrollbar-none">
```

- [ ] **Step 3 : Ajouter `shrink-0` sur tous les boutons chips**

Trouver le bouton "Toutes" :
```tsx
className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
  activeFilter === null
    ? 'bg-[#134E4A] text-white'
    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
}`}
```

Remplacer par (ajouter `shrink-0`) :
```tsx
className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer shrink-0 ${
  activeFilter === null
    ? 'bg-[#134E4A] text-white'
    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
}`}
```

Trouver le bouton de catégorie (dans le `.map`) :
```tsx
className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer ${
  activeFilter === cat.id ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
}`}
```

Remplacer par (ajouter `shrink-0`) :
```tsx
className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 ${
  activeFilter === cat.id ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
}`}
```

Trouver le bouton "+ Catégorie" (hors mode input) :
```tsx
className="rounded-full px-3 py-1 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-teal-400 hover:text-teal-600 transition-colors duration-150 cursor-pointer"
```

Remplacer par (ajouter `shrink-0`) :
```tsx
className="rounded-full px-3 py-1 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-teal-400 hover:text-teal-600 transition-colors duration-150 cursor-pointer shrink-0"
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && git add src/components/FilterBar.tsx && git commit -m "feat: FilterBar horizontal scroll on mobile"
```

---

## Task 3 — TaskCard : menu ⋯ toujours visible sur mobile

**Files:**
- Modify: `src/components/TaskCard.tsx`

- [ ] **Step 1 : Lire le fichier actuel**

Lire `/Users/mathieu/Documents/Claude/Projects/todo_app/src/components/TaskCard.tsx` pour repérer la ligne exacte du bouton menu.

- [ ] **Step 2 : Modifier la classe du bouton menu**

Trouver la ligne contenant `opacity-0 group-hover:opacity-100` (bouton `⋯`) :
```tsx
className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 cursor-pointer"
```

Remplacer par (`opacity-100` sur mobile, caché sur desktop jusqu'au hover) :
```tsx
className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-all duration-150 cursor-pointer"
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && git add src/components/TaskCard.tsx && git commit -m "feat: TaskCard menu always visible on mobile"
```

---

## Task 4 — AddTaskModal : bottom sheet sur mobile

**Files:**
- Modify: `src/components/AddTaskModal.tsx`

- [ ] **Step 1 : Lire le fichier actuel**

Lire `/Users/mathieu/Documents/Claude/Projects/todo_app/src/components/AddTaskModal.tsx` pour repérer les lignes exactes.

- [ ] **Step 2 : Modifier l'overlay (div externe)**

Trouver :
```tsx
<div
  className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
  onClick={e => { if (e.target === e.currentTarget) onClose() }}
  role="dialog"
  aria-modal="true"
  aria-label={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
>
```

Remplacer par :
```tsx
<div
  className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in"
  onClick={e => { if (e.target === e.currentTarget) onClose() }}
  role="dialog"
  aria-modal="true"
  aria-label={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
>
```

- [ ] **Step 3 : Modifier le conteneur du modal**

Trouver :
```tsx
<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
```

Remplacer par :
```tsx
<div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
```

- [ ] **Step 4 : Ajouter la handle bar mobile juste après le div du conteneur**

Ajouter cette ligne immédiatement après l'ouverture du `<div>` du conteneur (avant le `{/* Header */}`) :

```tsx
{/* Handle bar — mobile only */}
<div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
  <div className="w-10 h-1 bg-slate-200 rounded-full" />
</div>
```

- [ ] **Step 5 : Vérifier la compilation**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && git add src/components/AddTaskModal.tsx && git commit -m "feat: AddTaskModal bottom sheet on mobile"
```

---

## Task 5 — App.tsx : onglets + DnD conditionnel + KanbanColumn width

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/KanbanColumn.tsx`

- [ ] **Step 1 : Modifier KanbanColumn.tsx — width responsive**

Lire `/Users/mathieu/Documents/Claude/Projects/todo_app/src/components/KanbanColumn.tsx`.

Trouver :
```tsx
<div className="flex flex-col w-72 shrink-0 animate-slide-up">
```

Remplacer par :
```tsx
<div className="flex flex-col w-full sm:w-72 sm:shrink-0 animate-slide-up">
```

- [ ] **Step 2 : Modifier App.tsx — imports**

Lire `/Users/mathieu/Documents/Claude/Projects/todo_app/src/App.tsx`.

Trouver la ligne :
```tsx
import { useState, useEffect } from 'react'
```

Remplacer par :
```tsx
import { useState, useEffect } from 'react'
import { useIsMobile } from './hooks/useIsMobile'
```

- [ ] **Step 3 : App.tsx — ajouter `isMobile` et `activeTab` dans le composant**

Trouver (dans le corps du composant, après les autres états) :
```tsx
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
```

Remplacer par :
```tsx
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<Status>('todo')
```

- [ ] **Step 4 : App.tsx — DnD conditionnel**

Trouver :
```tsx
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )
```

Remplacer par :
```tsx
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const sensors = useSensors(...(isMobile ? [] : [pointerSensor]))
```

- [ ] **Step 5 : App.tsx — bouton header compact sur mobile**

Trouver :
```tsx
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
```

Remplacer par :
```tsx
          <button
            onClick={() => setModal({ open: true, status: isMobile ? activeTab : 'todo' })}
            className="flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-3 sm:px-4 py-2.5 rounded-xl hover:bg-orange-500 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
            aria-label="Créer une nouvelle tâche"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </button>
```

- [ ] **Step 6 : App.tsx — remplacer le bloc Board par le rendu conditionnel mobile/desktop**

Trouver ce bloc entier (du commentaire `{/* Board */}` jusqu'à la fermeture `</DndContext>` incluse, soit les lignes 229–260 environ) :

```tsx
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
```

Remplacer par :

```tsx
      {/* Board */}
      {isMobile ? (
        <>
          {/* Tab bar */}
          <div className="bg-white border-b border-slate-200 flex sticky top-[113px] z-10">
            {COLUMNS.map(col => {
              const count = tasks.filter(t => t.status === col.id).length
              const isActive = activeTab === col.id
              const activeStyle =
                col.id === 'todo' ? 'text-slate-700 border-slate-700' :
                col.id === 'in_progress' ? 'text-teal-700 border-teal-600' :
                'text-orange-600 border-orange-500'
              const activeBadge =
                col.id === 'todo' ? 'bg-slate-100 text-slate-600' :
                col.id === 'in_progress' ? 'bg-teal-100 text-teal-700' :
                'bg-orange-100 text-orange-600'
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${isActive ? activeStyle : 'text-slate-400 border-transparent'}`}
                >
                  {col.label}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? activeBadge : 'bg-slate-100 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Active column */}
          <main className="p-4">
            <KanbanColumn
              column={COLUMNS.find(c => c.id === activeTab)!}
              tasks={tasks.filter(t => t.status === activeTab)}
              categories={categories}
              activeFilter={activeFilter}
              onAddTask={() => setModal({ open: true, status: activeTab })}
              onMoveTask={moveTask}
              onDeleteTask={deleteTask}
              onEditTask={(id) => setModal({ open: true, status: tasks.find(t => t.id === id)?.status ?? activeTab, editId: id })}
              allStatuses={COLUMNS}
            />
          </main>
        </>
      ) : (
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
      )}
```

- [ ] **Step 7 : Vérifier la compilation complète**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "error TS"
```

Expected : aucune erreur. Si des erreurs apparaissent, lis-les et corrige-les.

- [ ] **Step 8 : Build complet**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && npm run build 2>&1 | tail -5
```

Expected : `✓ built in`

- [ ] **Step 9 : Commit**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app && git add src/App.tsx src/components/KanbanColumn.tsx && git commit -m "feat: mobile tab navigation and conditional DnD"
```

---

## Task 6 — Pousser sur GitHub et déployer

**Files:** aucun — push git uniquement

- [ ] **Step 1 : Pousser sur GitHub**

```bash
cd /Users/mathieu/Documents/Claude/Projects/todo_app
source .env
git push "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/Matou83/todo_app.git" main
```

Expected : `Branch 'main' set up to track remote branch 'main' from origin.` ou `Everything up-to-date`.

Vercel redéploie automatiquement depuis le push GitHub. Attendre ~1 minute puis vérifier le déploiement.

---

## Self-Review

**Couverture spec :**
- ✅ Hook `useIsMobile` → Task 1
- ✅ FilterBar scroll horizontal → Task 2
- ✅ Menu `⋯` toujours visible sur mobile → Task 3
- ✅ Bottom sheet modal → Task 4
- ✅ Onglets navigation → Task 5 (App.tsx)
- ✅ DnD désactivé sur mobile → Task 5 (App.tsx)
- ✅ Header bouton compact → Task 5 (App.tsx)
- ✅ `KanbanColumn` pleine largeur → Task 5 (KanbanColumn.tsx)
- ✅ Déploiement → Task 6

**Vérification types :** `useIsMobile` retourne `boolean`, utilisé directement dans les conditions de App.tsx. `activeTab` est `Status`, compatible avec les props de `KanbanColumn`. `COLUMNS.find(c => c.id === activeTab)!` — assertion non-null valide car `activeTab` est toujours une valeur présente dans `COLUMNS`.

**Placeholder scan :** aucun TBD, tous les steps ont du code complet.
