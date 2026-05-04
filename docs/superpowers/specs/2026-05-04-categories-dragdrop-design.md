# Design Spec — Catégories par accordéon + Drag & Drop

**Date :** 2026-05-04
**Projet :** Todo Kanban App
**Stack :** React 19 + Vite + Tailwind v4 + TypeScript
**Scope :** Usage personnel, un seul utilisateur, pas d'auth

---

## Contexte

L'app est un kanban board personnel avec 3 colonnes (À faire / En cours / Terminé), des tâches avec priorité, et un stockage localStorage. Le besoin principal identifié en discovery : trop de tâches en vrac, besoin de les organiser par catégorie sans casser la structure kanban existante. Besoin complémentaire : déplacer les tickets entre colonnes par glisser-déposer.

---

## Feature 1 — Catégories par accordéon

### Approche retenue

Groupes visuels repliables **à l'intérieur des colonnes** (pas de swimlanes horizontales, pas de sidebar). Filtre global en haut du board pour isoler une catégorie.

### Modèle de données

```ts
// types.ts — ajouts
type Category = {
  id: string       // slug unique, ex: "ops", "head-of"
  label: string    // ex: "Ops"
  color: string    // hex, ex: "#3B82F6"
}

// Catégories par défaut (non supprimables)
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'ops',     label: 'Ops',     color: '#3B82F6' },
  { id: 'head-of', label: 'Head of', color: '#8B5CF6' },
  { id: 'ia',      label: 'IA',      color: '#10B981' },
  { id: 'perso',   label: 'Perso',   color: '#F97316' },
]

// Task — ajout
interface Task {
  // ...champs existants (id, title, description, status, priority, createdAt)
  categoryId: string   // obligatoire, défaut : 'ops'
}
```

**Stockage localStorage :**
- `kanban_tasks` — existant, étendu avec `categoryId`
- `kanban_categories` — nouveau, stocke les catégories custom ajoutées par l'utilisateur

**Migration :** Au chargement, toute tâche sans `categoryId` se voit assigner `'ops'` automatiquement.

### Composants

#### Nouveau : `FilterBar.tsx`

Barre horizontale placée entre le header et le board. Contient :
- Label "FILTRE :"
- Un chip par catégorie (couleur de fond = couleur de la catégorie quand actif, gris sinon)
- Chip "Toutes" toujours présent, sélectionné par défaut
- Bouton "+ Catégorie" (dashed border) pour créer une nouvelle catégorie inline

Comportement :
- Un seul filtre actif à la fois
- Clic sur le filtre actif → revient à "Toutes"
- Quand un filtre est actif : seules les tâches de cette catégorie sont visibles dans toutes les colonnes

#### Nouveau : `CategorySection.tsx`

Groupe repliable à l'intérieur d'une colonne. Props : `category`, `tasks`, `collapsed`, `onToggle`, enfants = `TaskCard`.

Rendu :
```
[▼ Ops  2]    ← header cliquable, fond coloré léger, bordure gauche colorée
  [TaskCard]
  [TaskCard]
[▶ Head of  1]  ← replié, les cartes sont masquées
```

État collapse : géré dans `KanbanColumn` via `useState<Record<string, boolean>>`. Non persisté (reset au refresh).

#### Modifié : `KanbanColumn.tsx`

Reçoit `categories` et `activeFilter` en props. Regroupe les tâches par `categoryId`, filtre si `activeFilter` est actif, rend un `CategorySection` par groupe. Les sections vides (0 tâche après filtre) sont masquées. Si toutes les sections sont vides, affiche "Aucune tâche dans cette catégorie".

#### Modifié : `TaskCard.tsx`

Affiche un petit badge catégorie (point coloré + label) dans le footer de la carte, à côté du badge priorité existant.

#### Modifié : `AddTaskModal.tsx`

Nouveau champ "Catégorie" : grille de chips cliquables (une par catégorie). Option "+ Nouvelle" qui révèle un champ texte inline pour saisir le nom. À la création : slug généré depuis le label (lowercase, tirets), couleur assignée automatiquement en cycle sur cette palette de 8 couleurs : `#EF4444` `#F97316` `#EAB308` `#22C55E` `#14B8A6` `#6366F1` `#A855F7` `#EC4899`. Duplication bloquée si le label existe déjà (comparaison lowercase).

La nouvelle catégorie est sauvegardée dans localStorage ET ajoutée immédiatement dans les chips.

#### Modifié : `App.tsx`

- État `categories: Category[]` = DEFAULT_CATEGORIES + catégories custom chargées depuis localStorage
- État `activeFilter: string | null` = null par défaut
- Fonction `addCategory(label: string): Category`
- Passe `categories`, `activeFilter`, `onFilterChange`, `onAddCategory` aux composants concernés

### Cas limites

| Situation | Comportement |
|---|---|
| Tâche sans `categoryId` au chargement | Assignée à `'ops'` automatiquement |
| Création de catégorie en doublon | Bloquée, message "Cette catégorie existe déjà" |
| Colonne vide après filtre actif | Affiche "Aucune tâche dans cette catégorie" (colonne visible) |
| Suppression de catégorie | Non implémenté (hors scope) |
| Ordre des catégories | Ordre de création, fixe |

---

## Feature 2 — Drag & Drop entre colonnes

### Approche retenue

Bibliothèque **`@dnd-kit/core`** — légère (~10kb gzip), moderne, accessible, pas de dépendance à ReactDOM.findDOMNode (compatible React 19). `@dnd-kit/sortable` non requis (pas de réordonnancement intra-colonne).

Scope : déplacer une tâche d'une colonne à une autre (changement de `status`). Pas de réordonnancement à l'intérieur d'une colonne (hors scope, complexité/valeur faible pour usage perso).

### Architecture dnd-kit

```
<DndContext onDragEnd={handleDragEnd}>        ← App.tsx
  <KanbanColumn>                              ← useDroppable(column.id)
    <CategorySection>
      <TaskCard>                              ← useDraggable(task.id)
```

**`handleDragEnd`** dans `App.tsx` :
```ts
function handleDragEnd({ active, over }: DragEndEvent) {
  if (!over || active.id === over.id) return
  const task = tasks.find(t => t.id === active.id)
  const targetStatus = over.id as Status   // over.id = column id
  if (task && task.status !== targetStatus) {
    moveTask(task.id as string, targetStatus)
  }
}
```

### Comportement visuel

- **Pendant le drag :** la carte devient semi-transparente (`opacity-50`) à sa position d'origine. Un overlay (`DragOverlay`) rend une copie flottante de la carte sous le curseur.
- **Survol d'une colonne cible :** la colonne reçoit un highlight (fond légèrement coloré, bordure accentuée).
- **Drop réussi :** la carte apparaît dans la nouvelle colonne avec l'animation `animate-scale-in` existante.
- **Drop annulé** (relâché hors colonne) : la carte revient à sa position initiale, pas de changement d'état.

### Accessibilité

`@dnd-kit` fournit le support clavier natif (espace pour saisir, flèches pour déplacer, entrée pour déposer). Le menu contextuel existant ("Déplacer vers →") reste disponible comme alternative pour les utilisateurs sans souris.

### Installation

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

---

## Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `src/types.ts` | Modifié | Ajout `Category`, `Priority` (existant), `DEFAULT_CATEGORIES`, `categoryId` sur `Task` |
| `src/App.tsx` | Modifié | États catégories + filtre, `DndContext`, `handleDragEnd`, `addCategory` |
| `src/components/FilterBar.tsx` | Nouveau | Chips de filtre + création catégorie |
| `src/components/CategorySection.tsx` | Nouveau | Groupe repliable par catégorie |
| `src/components/KanbanColumn.tsx` | Modifié | `useDroppable`, groupement par catégorie |
| `src/components/TaskCard.tsx` | Modifié | `useDraggable`, badge catégorie |
| `src/components/AddTaskModal.tsx` | Modifié | Sélecteur catégorie + création inline |

---

## Hors scope

- Réordonnancement des tâches au sein d'une colonne
- Suppression de catégories
- Persistance de l'état collapse
- Drag & drop entre catégories (changement de `categoryId`)
- Drag & drop sur mobile (touch events — peut être ajouté avec `@dnd-kit/sensors` plus tard)
