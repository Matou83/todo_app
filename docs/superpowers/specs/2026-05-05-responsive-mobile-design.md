# Design Spec — Responsive Mobile

**Date :** 2026-05-05
**Projet :** Todo Kanban App
**Stack :** React 19 + Vite + Tailwind v4 + TypeScript
**Scope :** Adaptation de l'app existante pour usage mobile (< 768px)

---

## Contexte

L'app est un kanban board utilisé à la fois sur desktop et sur mobile. Le layout actuel (3 colonnes fixes `w-72` côte à côte) est inutilisable sur téléphone. L'objectif est d'adapter l'interface mobile sans casser le comportement desktop existant.

---

## Décisions de design

**Navigation mobile :** onglets (tabs) — une colonne visible à la fois, navigation par tap. Recommandé pour sa simplicité et sa familiarité mobile.

**DnD sur mobile :** désactivé — les capteurs PointerSensor ne sont initialisés que sur desktop. Le déplacement de tâches se fait via le menu `⋯` → "Déplacer vers".

**Formulaire de tâche :** bottom sheet sur mobile (glisse depuis le bas), modal centré sur desktop (inchangé).

---

## Composants et fichiers

### Nouveau fichier

#### `src/hooks/useIsMobile.ts`

Hook basé sur `window.matchMedia('(max-width: 767px)')` avec listener `change` pour le resize. Retourne `boolean`.

### Fichiers modifiés

#### `src/App.tsx`

- Import `useIsMobile`
- État `activeTab: Status` (défaut `'todo'`) — colonne affichée sur mobile
- `pointerSensor` déclaré via `useSensor` inconditionnellement, passé à `useSensors` uniquement sur desktop (`isMobile ? [] : [pointerSensor]`)
- Bouton header : texte "Nouvelle tâche" masqué sur mobile (`hidden sm:inline`), padding réduit (`px-3 sm:px-4`)
- Board : rendu conditionnel — mobile → tab bar + `KanbanColumn` unique ; desktop → `DndContext` + 3 colonnes + `DragOverlay` (inchangé)

#### `src/components/KanbanColumn.tsx`

Classe du wrapper : `w-72 shrink-0` → `w-full sm:w-72 sm:shrink-0` pour occuper toute la largeur sur mobile.

#### `src/components/TaskCard.tsx`

Bouton menu `⋯` : `opacity-0 group-hover:opacity-100 focus:opacity-100` → `opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100`. Toujours visible sur mobile.

#### `src/components/AddTaskModal.tsx`

- Overlay : `items-center sm:items-end` → `items-end sm:items-center` (aligné en bas sur mobile)
- Conteneur : `rounded-2xl max-w-md` → `rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md` (pleine largeur en bas sur mobile)
- Handle bar : `<div className="sm:hidden ...">` affiché uniquement sur mobile
- Pas d'import de `useIsMobile` — tout en Tailwind responsive

#### `src/components/FilterBar.tsx`

- `flex-wrap` → `flex-nowrap overflow-x-auto sm:flex-wrap` — scroll horizontal sur mobile
- `shrink-0` ajouté sur tous les boutons chips pour éviter la compression

---

## Breakpoint

`768px` (Tailwind `md:`) est la frontière desktop/mobile. En-dessous : onglets, DnD désactivé, bottom sheet. Au-dessus : layout actuel inchangé.

---

## Hors scope

- Réordonnancement des tâches dans une colonne (drag within column)
- Animations de transition entre onglets (swipe)
- Navigation bottom bar native
- Support des gestes tactiles avancés (long press, swipe to delete)
