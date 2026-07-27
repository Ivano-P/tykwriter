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

## Phase 2 — Notes core ✅

- [x] CRUD notes + dossiers (actions → `services/NoteService`, scopé par userId)
- [x] Sidebar : dossiers + liste des notes (tri par dernière modif), recherche
- [x] Autosave (debounce 800 ms) du contenu TipTap (JSON) + indicateur Enregistrement/Enregistré
- [x] Layout notes pleine largeur, sidebar overlay sur mobile (bouton toggle)
- [x] Localisation FR/EN de toute l'UI notes
- Testé navigateur : création note, autosave titre+contenu, persistance après reload, création dossier, déplacement note vers dossier, recherche. (NB : les events `keydown` ne sont pas délivrés par l'outil navigateur de test — vérifié que c'est une limite de l'outil, pas un bug appli.)

## Phase 3 — Éditeur riche ✅

(charger `.claude/skills/tiptap-skill/` avant de commencer)
- [x] Titres 1–5 + raccourcis (StarterKit levels 1-5)
- [x] Checklists (task list, imbrication OK)
- [x] Blocs de code avec coloration (lowlight/common) + code inline
- [x] Surlignage, souligné, gras, italique, barré
- [x] Bubble menu (menu flottant de sélection — gras/italique/souligné/barré/surlignage/code)
- [x] Slash commands (menu `/` localisé, filtrage, nav clavier, groupes)
- [x] Tableaux (insertion 3x3 avec en-tête, colonnes redimensionnables) — menus lignes/colonnes à enrichir plus tard
- [x] Titres dépliables (extension Details v3, chevron animé, état persisté)
- [x] Images : upload R2 (URL présignée, testé avec le vrai bucket + domaine public), collage/drag & drop, `/image` (sélecteur), redimensionnement par poignée, purge R2 à la suppression de note
- NB : TipTap aligné en 3.29 (upgrade depuis 3.20) — correcteur re-testé OK.
- NB : le contenu TipTap transite en chaîne JSON vers les Server Actions (`contentJson`) — la sérialisation RSC supprime silencieusement les objets `attrs` de ProseMirror. Ne pas revenir à un passage d'objet.

## Phase 4 — Garde-fous ✅

- [x] Rate limiting anonymes (20 req IA/jour/IP, compteurs Postgres `anon_usage`, jour UTC)
- [x] Kill-switch global : 300 req IA anonymes/jour toutes IP confondues
- [x] Bannière « limite atteinte, connectez-vous » localisée (RateLimitBanner) sur correcteur, assistant, traduction
- [x] Connectés : aucune limite ; extension Chrome : inchangée (apiGuard existant)
- Points d'entrée gardés : actions spellcheck/checkSpellingIssues/translate + routes /api/assistant et /api/traduction (429)
- Testé : 429 anonyme à quota atteint (les 2 routes), bannière anonyme sur correcteur, bypass connecté vérifié

## Phase 5 — Menu utilisateur complet ✅

- [x] Page `/compte` : email affiché, changement de nom (updateUser)
- [x] Changement de mot de passe (changePassword + révocation des autres sessions)
- [x] Suppression de compte : mot de passe requis + confirmation, cascade FK (notes/dossiers/sessions/comptes) + purge R2 `notes/{userId}/` via hook afterDelete
- [x] Lien « Mon compte » dans le menu utilisateur (desktop + mobile)
- Testé navigateur : renommage, changement de mdp (vérifié en l'utilisant pour la suppression), suppression → toutes les tables à 0, compte de test recréé (`test@tykwriter.local` / voir mdp phase 1 +456 → recréé avec mdp initial)

## Phase 6 — IA sur les notes ✅

- [x] Panneau « Assistant IA » dans l'éditeur de note (bouton IA du header, panneau latéral)
- [x] Poser des questions sur la note courante (AiProService.askNote, rôle 'assistant')
- [x] Restructurer la note (HTML → HTML restreint, setContent avec emitUpdate → autosave, annulable Ctrl+Z)
- [x] Correction orthographique d'une sélection (réutilise autoCheckSpellingAndFormat)
- [x] Traduction d'une sélection (réutilise translate, sélecteur de langue via Intl.DisplayNames)
- Actions réservées aux connectés (pas de rate limiting nécessaire)
- Testé navigateur : Q&A (réponse correcte), restructuration (H1/H2 + listes), correction de sélection — tout autosauvegardé en DB

## Phase 7 — Polish ✅

- [x] Passe responsive/mobile : sidebar notes en overlay (fix sélecteur), /connexion, /compte, pas de débordement horizontal
- [x] Dark mode : variables sémantiques (`--surface`, `--surface-soft`, `--border-soft/strong`, `--page-bg`, `--soft-card-bg`) surchargées par `.dark` ; blanc→noir, bleu conservé (éclairci `#4d8be8`)
- [x] Bascule ThemeToggle (navbar desktop + mobile), persistée en cookie `tyk-theme`, classe posée côté serveur (pas de flash)
- [x] Sweep de tous les CSS Modules (blancs/crèmes/bordures en dur → variables) + variantes `dark:` du menu mobile
- Testé navigateur : bascule sombre/clair, persistance après reload, notes/correcteur/compte/pages statiques lisibles ; `pnpm build` OK

---

**TOUTES LES PHASES SONT TERMINÉES.** Reste (hors scope v1, voir section Reporté) : kanban, SMTP (vérif email + reset mdp), embeddings pgvector, nettoyage R2 périodique.

## Reporté / hors scope

- Kanban (vue board) — après v1 notes
- SMTP : vérification email + mot de passe oublié
- Embeddings pgvector pour Q&A multi-notes (v1 = note courante dans le contexte)
- Nettoyage périodique des images R2 orphelines (v1 = purge à la suppression note/compte)
