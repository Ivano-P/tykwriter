# PLAN — Fonctionnalité Notes (type Notion) + Auth

> Fichier de suivi. Statuts : ✅ terminé · 🔄 en cours · ⬜ à faire
> Si une session est interrompue, reprendre à la première phase 🔄 (ou ⬜ suivante).
> Chaque fonctionnalité : build → test (navigateur) → commit individuel sur `dev`.

## Décisions actées (avec Tykeno)

- **Stack data** : Postgres 18 + pgvector (`pgvector/pgvector:pg18`), Drizzle ORM, Better Auth (lib open-source, PAS le cloud `@better-auth/infra` — à retirer).
- **Dev DB locale** : conteneur Docker `tykwriter-postgres` (port 5432, db/user `tykwriter`).
- **Stockage images** : Cloudflare R2, upload direct navigateur via URL présignée (PUT), service public via domaine custom (`R2_PUBLIC_URL`).
- **Notes** : structure plate + dossiers de regroupement dans la sidebar (pas de pages imbriquées v1).
- **Rate limiting** : anonymes ~20 requêtes IA/jour/IP + kill-switch global ; **aucune limite pour les connectés** (pour l'instant). Extension Chrome : ne pas toucher (expérimental).
- **Suppression compte** : cascade totale (notes + dossiers + images R2).
- **Pas de vérification email / reset password pour l'instant** (SMTP viendra plus tard).
- **Kanban** : reporté (hors scope).
- **Dark mode** : à faire EN DERNIER (blanc→noir, garder le bleu).
- **UI** : outils d'écriture = largeur contrainte ; notes = pleine largeur. Tout responsive + localisé (next-intl).
- **Navbar** : "Notes" dans le sélecteur de mode navbar (si connecté) ; bouton connexion tout à droite → icône utilisateur + menu quand connecté.

## Variables d'environnement requises (.env — géré par Tykeno)

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

---

## Phase 1 — Fondations : DB + Auth ✅

- [x] Retirer `@better-auth/infra`, installer `drizzle-orm`, `postgres`, `drizzle-kit`
- [x] Schéma Drizzle : tables Better Auth (user, session, account, verification) + `folder` + `note`
- [x] Migrations (drizzle-kit) appliquées sur la DB locale
- [x] `lib/auth.ts` réécrit (drizzleAdapter + emailAndPassword + nextCookies)
- [x] Route `app/api/auth/[...all]/route.ts`
- [x] Page `/connexion` (login + inscription, CSS Module, FR/EN)
- [x] Navbar : bouton "Se connecter" → menu utilisateur (nom/email, déconnexion) ; entrée "Notes" visible si connecté
- [x] Page `/notes` placeholder protégée (redirect `/connexion` si non connecté)
- Testé navigateur : inscription, redirection /notes, menu utilisateur, déconnexion, erreur mot de passe invalide (FR), reconnexion. Compte de test : `test@tykwriter.local`.

## Phase 2 — Notes core 🔄

- [ ] CRUD notes + dossiers (actions → `services/NoteService`)
- [ ] Sidebar : dossiers + liste des notes (tri par dernière modif), recherche
- [ ] Autosave (debounce) du contenu TipTap (JSON) 
- [ ] Layout notes pleine largeur (vs largeur contrainte des autres modes)
- [ ] Localisation FR/EN de toute l'UI notes

## Phase 3 — Éditeur riche ⬜

(charger `.claude/skills/tiptap-skill/` avant de commencer)
- [ ] Titres 1–5 + raccourcis
- [ ] Checklists (task list)
- [ ] Blocs de code avec coloration (lowlight) + code inline
- [ ] Surlignage, souligné, gras, italique
- [ ] Bubble menu (menu flottant de sélection)
- [ ] Slash commands (menu `/`)
- [ ] Tableaux (+ menus lignes/colonnes)
- [ ] Titres dépliables (foldable headings — via Details ou node view custom)
- [ ] Images : upload R2 (URL présignée), collage/drag & drop, redimensionnement

## Phase 4 — Garde-fous ⬜

- [ ] Rate limiting anonymes (~20 req IA/jour/IP, compteurs en DB)
- [ ] Kill-switch global budget anonymes
- [ ] Message UI « limite atteinte, connectez-vous » localisé

## Phase 5 — Menu utilisateur complet ⬜

- [ ] Page compte : infos, changement nom d'utilisateur
- [ ] Changement de mot de passe
- [ ] Suppression de compte (cascade DB + purge images R2)

## Phase 6 — IA sur les notes ⬜

- [ ] Poser des questions sur la note courante
- [ ] Restructurer la note
- [ ] Correction orthographique d'une sélection (réutilise SpellcheckService)
- [ ] Traduction d'une sélection (réutilise service traduction)

## Phase 7 — Polish ⬜

- [ ] Passe responsive/mobile complète (éditeur notes inclus)
- [ ] Dark mode (variables CSS, blanc→noir, bleu conservé) — EN DERNIER

## Reporté / hors scope

- Kanban (vue board) — après v1 notes
- SMTP : vérification email + mot de passe oublié
- Embeddings pgvector pour Q&A multi-notes (v1 = note courante dans le contexte)
- Nettoyage périodique des images R2 orphelines (v1 = purge à la suppression note/compte)
