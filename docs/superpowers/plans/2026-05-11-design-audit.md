# Design Audit — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer la lisibilité, la cohérence visuelle et l'expérience utilisateur de l'app Kanban sur desktop et mobile, en 4 phases indépendantes.

**Architecture:** Modifications CSS et JSX uniquement (pas de changement de données ou d'API). Chaque phase est un commit autonome et déployable.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite

---

## Phase A — Couleurs et contrastes

**Problèmes :**
- La colonne "Terminé" utilise l'orange (warning) au lieu du vert (succès) — contre-intuitif
- Le bouton check (cercle vide gris clair) est quasi invisible
- La barre d'environnement duplique l'info du header

**Files:**
- Modify: `src/components/KanbanColumn.tsx` (COLUMN_STYLE, lignes 23-55)
- Modify: `src/App.tsx` (env banner lignes 723-730, mobile tab bar lignes 803-828)

### Task A1 : Colonne "Terminé" en vert

- [ ] **Step 1 : Changer le style de la colonne done**

Dans `src/components/KanbanColumn.tsx`, remplacer le bloc `done` du `COLUMN_STYLE` (lignes 47-54) :

```ts
done: {
  wrapper: 'bg-emerald-50/70 border border-emerald-200',
  accent: 'bg-emerald-500',
  dot: 'bg-emerald-500',
  label: 'text-emerald-800',
  count: 'bg-emerald-100 text-emerald-600',
  addBtn: 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100',
},
```

- [ ] **Step 2 : Mettre à jour les styles du tab bar mobile**

Dans `src/App.tsx`, remplacer les styles orange de l'onglet "Terminé" dans le tab bar mobile (lignes 807-814). Chercher ces 2 lignes :

```ts
'text-orange-600 border-orange-500'
```
Remplacer par :
```ts
'text-emerald-600 border-emerald-500'
```

Et :
```ts
'bg-orange-100 text-orange-600'
```
Remplacer par :
```ts
'bg-emerald-100 text-emerald-600'
```

- [ ] **Step 3 : Vérifier le build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 4 : Commit**

```bash
git add src/components/KanbanColumn.tsx src/App.tsx
git commit -m "fix(design): colonne Terminé en vert au lieu d'orange"
```

### Task A2 : Supprimer la barre d'environnement redondante

La bannière env (lignes 723-730 de App.tsx) duplique l'info déjà dans le header (env toggle + compteur). Sur mobile ça prend de la place verticale précieuse.

- [ ] **Step 1 : Supprimer le bloc env banner**

Dans `src/App.tsx`, supprimer le bloc complet (lignes 723-730) :

```tsx
{/* Env banner */}
<div className={`${envConf.bg} px-6 py-2 flex items-center gap-2`} role="status" aria-live="polite">
  <span className="text-base leading-none" aria-hidden="true">{envConf.icon}</span>
  <span className={`text-xs font-bold ${envConf.text}`}>Environnement {envConf.label}</span>
  {total > 0 && (
    <span className={`text-xs ${envConf.subtext} ml-auto`}>{done}/{total} terminées</span>
  )}
</div>
```

- [ ] **Step 2 : Ajuster le sticky top du FilterBar**

Comme le banner supprimé faisait ~36px, mettre à jour le `top` sticky dans `src/components/FilterBar.tsx` (ligne 48). Changer `top-[73px]` en `top-[57px]` :

```tsx
<div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto flex-nowrap sm:flex-wrap sticky top-[57px] z-10 scrollbar-none">
```

- [ ] **Step 3 : Ajuster le sticky top du tab bar mobile**

Dans `src/App.tsx`, la tab bar mobile (ligne 803) a `top-[113px]`. Mettre à jour en `top-[93px]` :

```tsx
<div className="bg-white border-b border-slate-200 flex sticky top-[93px] z-10">
```

- [ ] **Step 4 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx src/components/FilterBar.tsx
git commit -m "fix(design): supprimer la barre d'environnement redondante"
```

---

## Phase B — Densité et lisibilité des cartes

**Problèmes :**
- Le footer (catégorie + priorité + date + check) est trop chargé
- Les headers de catégorie manquent de contraste
- Le bouton check est trop discret

**Files:**
- Modify: `src/components/TaskCard.tsx`
- Modify: `src/components/CategorySection.tsx`

### Task B1 : Rendre le bouton check plus visible

- [ ] **Step 1 : Améliorer le style du bouton check**

Dans `src/components/TaskCard.tsx`, remplacer le bouton check (lignes 250-258) :

```tsx
{!isDragOverlay && task.status !== 'done' && (
  <button
    onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
    className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-transparent hover:border-teal-400 hover:text-teal-400 hover:bg-teal-50 transition-all duration-150 cursor-pointer shrink-0"
    aria-label="Marquer comme terminée"
  >
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </button>
)}
```

Par :

```tsx
{!isDragOverlay && task.status !== 'done' && (
  <button
    onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
    className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 hover:scale-110 transition-all duration-150 cursor-pointer shrink-0"
    aria-label="Marquer comme terminée"
  >
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </button>
)}
```

Changements : légèrement plus gros (w-7 h-7), border plus visible (slate-300), icône check toujours visible (text-slate-300), hover en vert (emerald-500), micro-animation scale.

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/TaskCard.tsx
git commit -m "fix(design): bouton check plus visible avec hover vert"
```

### Task B2 : Aérer le footer des cartes

- [ ] **Step 1 : Restructurer le footer**

Dans `src/components/TaskCard.tsx`, remplacer le bloc footer (lignes 224-261) par un layout sur 2 lignes quand le badge date est présent :

```tsx
{/* Footer: category + priority */}
<div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 gap-2">
  <div className="flex items-center gap-1.5 flex-wrap">
    {category && (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
        style={{ backgroundColor: category.color }}
      >
        {category.label}
      </span>
    )}
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} aria-hidden="true" />
      {priority.label}
    </span>
  </div>
  <div className="flex items-center gap-2 shrink-0">
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
        onClick={e => { e.stopPropagation(); onMove(task.id, 'done') }}
        className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 hover:scale-110 transition-all duration-150 cursor-pointer shrink-0"
        aria-label="Marquer comme terminée"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    )}
  </div>
</div>
```

Changements : taille des badges réduite à `text-[11px]` pour plus de respiration, layout inchangé mais plus léger visuellement.

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/TaskCard.tsx
git commit -m "fix(design): aérer le footer des cartes, badges plus compacts"
```

### Task B3 : Renforcer les headers de catégorie

- [ ] **Step 1 : Lire le composant CategorySection**

Vérifier le contenu actuel de `src/components/CategorySection.tsx`.

- [ ] **Step 2 : Améliorer le contraste du header**

Dans `src/components/CategorySection.tsx`, trouver le bouton de toggle catégorie. Remplacer les classes du label pour ajouter plus de poids visuel. Changer `text-slate-500` (ou équivalent) en `text-slate-600 font-bold` et ajouter un fond léger au header :

Le header de section devrait avoir ce style :
```tsx
className="flex items-center justify-between w-full py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
```

Le label de catégorie :
```tsx
className="text-xs font-bold text-slate-600 tracking-wide"
```

Le compteur :
```tsx
className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-slate-100 text-slate-500"
```

- [ ] **Step 3 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/CategorySection.tsx
git commit -m "fix(design): headers de catégorie plus lisibles"
```

---

## Phase C — Polish mobile

**Problèmes :**
- Header surchargé sur 393px
- La barre d'env (supprimée en A2) libère de l'espace
- La modale manque de séparation visuelle entre sections

**Files:**
- Modify: `src/App.tsx` (header section)
- Modify: `src/components/AddTaskModal.tsx`

### Task C1 : Simplifier le header mobile

- [ ] **Step 1 : Masquer le compteur dans le titre sur mobile**

Dans `src/App.tsx`, le bloc titre (lignes 556-561) affiche toujours le compteur. L'envelopper dans `hidden sm:block` :

```tsx
<div>
  <h1 className="text-base font-bold text-[#134E4A] leading-tight">Kanban Board</h1>
  {total > 0 && (
    <p className="text-xs text-teal-500 font-medium leading-tight hidden sm:block">{done}/{total} terminées</p>
  )}
</div>
```

Le compteur reste visible dans le tab bar mobile (chaque onglet a son count).

- [ ] **Step 2 : Réduire le padding header sur mobile**

Dans `src/App.tsx` ligne 493, changer `py-3 sm:py-4` en `py-2 sm:py-4` pour gagner 8px sur mobile :

```tsx
<header className="bg-white border-b border-teal-100 px-4 sm:px-6 py-2 sm:py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
```

- [ ] **Step 3 : Recalculer les sticky tops**

Avec le header plus compact (~49px mobile), ajuster :
- FilterBar : `top-[49px]` (était `top-[57px]` après A2)
- Tab bar mobile : `top-[85px]` (était `top-[93px]` après A2)

- [ ] **Step 4 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx src/components/FilterBar.tsx
git commit -m "fix(design): header mobile plus compact"
```

### Task C2 : Aérer la modale d'édition

- [ ] **Step 1 : Ajouter des séparateurs entre sections**

Dans `src/components/AddTaskModal.tsx`, ajouter des `border-t border-slate-100 pt-4` sur les sections à partir de "Sous-tâches" (ligne 216). 

Modifier le `<form>` (ligne 187) pour augmenter le gap :

```tsx
<form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
```

Ajouter une classe de séparation au bloc sous-tâches (ligne 217) :

```tsx
<div className="border-t border-slate-100 pt-4">
```

Au bloc date d'échéance (ligne 302) :

```tsx
<div className="border-t border-slate-100 pt-4">
```

Au bloc catégorie (ligne 334) — pas de séparateur (même groupe que date).

Au bloc priorité (ligne 380) :

```tsx
<div className="border-t border-slate-100 pt-4">
```

Au bloc colonne (ligne 404) — pas de séparateur (même groupe que priorité).

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/AddTaskModal.tsx
git commit -m "fix(design): aérer la modale avec des séparateurs entre sections"
```

---

## Phase D — Micro-interactions et feedback

**Problèmes :**
- Pas d'animation quand on complète une tâche
- Empty states froids ("Aucune tâche")
- Pas de barre de progression visuelle globale

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/KanbanColumn.tsx`
- Modify: `src/App.tsx`

### Task D1 : Animation de complétion de tâche

- [ ] **Step 1 : Ajouter l'animation CSS**

Dans `src/index.css`, ajouter après les keyframes existants :

```css
@keyframes completeTask {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.97); background-color: #ecfdf5; }
  100% { opacity: 0; transform: scale(0.95) translateX(20px); }
}
```

Et dans le bloc `@theme` ajouter :

```css
--animate-complete: completeTask 0.4s ease-out forwards;
```

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/index.css
git commit -m "feat(design): ajouter animation CSS de complétion de tâche"
```

### Task D2 : Empty states engageants

- [ ] **Step 1 : Améliorer l'empty state dans KanbanColumn**

Dans `src/components/KanbanColumn.tsx`, remplacer le bloc empty (lignes 132-137) :

```tsx
{isEmpty ? (
  <div className="flex items-center justify-center flex-1 py-8">
    <p className="text-xs text-slate-400 text-center font-medium">
      {activeFilter ? 'Aucune tâche dans cette catégorie' : 'Aucune tâche'}
    </p>
  </div>
) : (
```

Par :

```tsx
{isEmpty ? (
  <div className="flex flex-col items-center justify-center flex-1 py-10 gap-2">
    <span className="text-2xl" aria-hidden="true">
      {column.id === 'todo' ? '📋' : column.id === 'in_progress' ? '🚀' : '🎉'}
    </span>
    <p className="text-xs text-slate-400 text-center font-medium leading-relaxed">
      {activeFilter
        ? 'Aucune tâche dans cette catégorie'
        : column.id === 'todo'
          ? 'Rien à faire pour le moment'
          : column.id === 'in_progress'
            ? 'Rien en cours — prêt à démarrer ?'
            : 'Aucune tâche terminée'}
    </p>
  </div>
) : (
```

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/KanbanColumn.tsx
git commit -m "feat(design): empty states avec emojis et messages contextuels"
```

### Task D3 : Barre de progression globale dans le header

- [ ] **Step 1 : Ajouter une barre de progression sous le header**

Dans `src/App.tsx`, juste après la fermeture du `</header>` (ligne 649), ajouter une barre de progression fine :

```tsx
{/* Progress bar */}
{total > 0 && (
  <div className="h-0.5 bg-slate-100">
    <div
      className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500 ease-out"
      style={{ width: `${Math.round((done / total) * 100)}%` }}
    />
  </div>
)}
```

C'est une ligne très fine (2px) qui remplace visuellement le compteur textuel et donne un feedback immédiat de progression globale.

- [ ] **Step 2 : Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/App.tsx
git commit -m "feat(design): barre de progression globale sous le header"
```

---

## Résumé des phases

| Phase | Scope | Fichiers | Commits |
|-------|-------|----------|---------|
| **A** | Couleurs & contrastes | KanbanColumn, App, FilterBar | 2 |
| **B** | Densité & lisibilité cartes | TaskCard, CategorySection | 3 |
| **C** | Polish mobile | App, AddTaskModal, FilterBar | 2 |
| **D** | Micro-interactions | index.css, KanbanColumn, App | 3 |

**Total : 10 commits, 7 fichiers modifiés, 0 fichiers créés.**

Chaque phase est indépendante et déployable séparément. L'ordre A → B → C → D est recommandé car chaque phase construit sur les améliorations précédentes (notamment A2 qui supprime la barre env et impacte les sticky tops de C1).
