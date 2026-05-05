# Design Spec — Intégration Supabase (Auth + Base de données)

**Date :** 2026-05-05
**Projet :** Todo Kanban App
**Stack :** React 19 + Vite + Tailwind v4 + TypeScript + Supabase
**Scope :** Usage personnel, un seul utilisateur, multi-appareils

---

## Contexte

L'app est un kanban board personnel avec localStorage comme seul système de persistance. L'objectif est de migrer vers Supabase pour permettre l'accès depuis plusieurs appareils via une authentification email + mot de passe. localStorage est remplacé complètement — pas de mode offline, pas de migration des données existantes.

---

## Architecture générale

**Supabase Auth** gère l'authentification email + mot de passe. La session est persistée automatiquement par le SDK Supabase (pas de gestion manuelle).

**Supabase PostgreSQL** stocke les tâches et les catégories custom. Les 4 catégories par défaut (Ops, Head of, IA, Perso) restent hardcodées dans `src/types.ts` — elles ne sont pas en base.

**Row Level Security (RLS)** activé sur toutes les tables. Chaque ligne appartient à un `user_id`. Les politiques garantissent qu'un utilisateur ne peut lire, modifier ou supprimer que ses propres données.

**Pas de realtime** — fetch au chargement + mise à jour immédiate à chaque action CRUD.

**Pas de routing** — un simple `if (!session) return <AuthForm />` dans `App.tsx` suffit.

---

## Schéma de base de données

### Table `tasks`

```sql
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
```

### Table `categories`

Stocke uniquement les catégories custom créées par l'utilisateur. Les catégories par défaut restent dans le code.

```sql
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

---

## Composants et fichiers

### Nouveaux fichiers

#### `src/lib/supabase.ts`

Instance unique du client Supabase partagée dans toute l'app.

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

#### `src/components/AuthForm.tsx`

Formulaire email + mot de passe. Bascule entre mode "Connexion" et "Créer un compte". Erreurs affichées inline. À la connexion ou création réussie, `onAuth` est appelé — `App.tsx` met à jour son état `session`.

Props : `{ onAuth: () => void }`

Comportements :
- **Register** : `supabase.auth.signUp()` → connecte automatiquement → appelle `onAuth()`
- **Login** : `supabase.auth.signInWithPassword()` → appelle `onAuth()`
- **Erreurs inline** : email déjà utilisé, mot de passe incorrect, champs vides

### Fichiers modifiés

#### `src/App.tsx`

**États ajoutés :**
- `session: Session | null` — null = non connecté
- `loading: boolean` — true pendant le fetch initial

**Flux de démarrage :**
1. `supabase.auth.getSession()` au montage
2. Abonnement à `supabase.auth.onAuthStateChange` pour détecter login/logout
3. Si session active → fetch tasks + categories → afficher le board
4. Si pas de session → afficher `<AuthForm />`

**Remplacement des helpers localStorage :**

| Avant | Après |
|---|---|
| `loadTasks()` | `supabase.from('tasks').select('*')` |
| `saveTasks()` | supprimé — chaque action fait son propre upsert/delete |
| `loadCustomCategories()` | `supabase.from('categories').select('*')` |
| `saveCustomCategories()` | supprimé — chaque action fait son propre insert/delete |

**Fonctions CRUD mises à jour :**
- `saveTask()` → `supabase.from('tasks').upsert()`
- `deleteTask()` → `supabase.from('tasks').delete().eq('id', id)`
- `moveTask()` → `supabase.from('tasks').update({ status }).eq('id', id)`
- `addCategory()` → `supabase.from('categories').insert()`

**Header** : bouton "Se déconnecter" ajouté, appelle `supabase.auth.signOut()`.

#### `.env`

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Flux utilisateur

```
App démarre
  → supabase.auth.getSession()
  → pas de session  → <AuthForm onAuth={...} />
  → session active  → fetch tasks + categories → <Board />

AuthForm
  → register : signUp → connexion auto → board
  → login    : signInWithPassword → board
  → erreur   : message inline, formulaire reste affiché

Board
  → fetch initial (loading skeleton)
  → chaque action CRUD → appel Supabase immédiat
  → logout → signOut → retour AuthForm
```

---

## Gestion des erreurs et cas limites

| Situation | Comportement |
|---|---|
| Réseau coupé | L'action échoue — état local non modifié, pas de retry automatique |
| Token expiré | Supabase renouvelle automatiquement la session |
| Email déjà utilisé | Message d'erreur inline dans AuthForm |
| Mot de passe incorrect | Message d'erreur inline dans AuthForm |
| Données localStorage existantes | Abandonnées — pas de migration |
| Première connexion (base vide) | Board vide, l'utilisateur repart de zéro |

---

## Variables d'environnement

| Variable | Description | Où trouver |
|---|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon | Settings → API → anon public |

Ces deux variables sont publiques (anon key) et peuvent être exposées côté client — c'est le fonctionnement normal de Supabase avec RLS activé.

---

## Mapping snake_case / camelCase

Supabase retourne les colonnes en snake_case (`category_id`, `created_at`). Les types TypeScript de l'app utilisent camelCase (`categoryId`, `createdAt`). Le mapping se fait au moment du fetch — chaque résultat Supabase est transformé avant d'alimenter le state React :

```ts
// Exemple pour tasks
const mapped: Task = {
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: row.status as Status,
  priority: row.priority as Priority,
  categoryId: row.category_id,
  createdAt: new Date(row.created_at).getTime(),
}
```

---

## Hors scope

- Mode offline / sync localStorage + Supabase
- Migration des données localStorage existantes
- Realtime (mise à jour automatique entre onglets/appareils ouverts simultanément)
- Réinitialisation du mot de passe
- Suppression de compte
- Multi-utilisateurs / partage de board
