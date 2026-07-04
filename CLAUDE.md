# CLAUDE.md — Tykwriter

## Project overview

Tykwriter is a French (target: FR/EN localized) writing assistant. Stack: Next.js 16 (App Router, Turbopack), React 19, TipTap 3, Tailwind 4 (restricted, see Styling), Mistral AI.

Three modes under `app/(workspace)/`, sharing text via `TextProvider` (`lib/TextContext.tsx`):
- `/correcteur` — LanguageTool-style inline error checking (underline + apply/ignore corrections)
- `/assistant-redacteur` — invisible auto-correction while the user writes
- `/traduction` — translation mode (not built yet)

## Working rules

- Call the user **Tykeno** when asking questions or giving instructions.
- Work on the `dev` branch. `test-deploy` holds the latest deployed production test version.

## Environment variables (STRICT)

- You are strictly FORBIDDEN from reading or modifying the `.env` file.
- If code requires a new environment variable, add the key with a dummy value to `.env.example`, and explicitly notify Tykeno in chat so he can copy it to his secure `.env`.

## Next.js 16+ strict standards

1. **The Async Trap:** all dynamic APIs (`cookies()`, `headers()`, `params`, `searchParams`) are strictly asynchronous — always `await` them (e.g. `const c = await cookies()`).
2. **Middleware:** legacy `middleware.ts` is deprecated. Use `proxy.ts` for edge routing/middleware logic.
3. **Caching:** prioritize the `use cache` directive and Partial Pre-Rendering (PPR) patterns over older caching strategies.
4. **Bundler:** Turbopack by default. Do not generate or modify legacy Webpack configurations.

## Architecture (strict MVC)

- **Views (`/app` & `/components`):** UI rendering only. No business logic.
- **Controllers (`/actions`):** Server Actions act as controllers. They handle validation and strictly delegate to the Service layer.
- **Services (`/services`):** pure TypeScript classes handling business logic and external API calls (Mistral, Ollama).

## Styling (strict boundaries)

- **Shadcn UI:** Tailwind utility classes are permitted ONLY inside `components/ui/`.
- **Everything else:** components and pages MUST use vanilla CSS via CSS Modules (`[name].module.css`). No Tailwind utility classes on standard DOM elements.
- **Mobile-first CSS Modules:** base styles are mobile; tablet/desktop adjustments are grouped at the bottom of the module file under a banner comment:

```css
/* Mobile-first base styles */
.example {
    padding: 10rem 0rem;
}

/************** Larger screens adjustments *****************************/
@media (min-width: 768px) {
    .example {
        padding: 3rem 1rem;
    }
}
```

## Skills

- `.claude/skills/tiptap-skill/` — TipTap/ProseMirror rules; use for any editor work.
- `.claude/skills/dokploy-skill/` — Dokploy VPS deployment prep.

(Source of truth for other AI tools remains in `.agent/`; keep both in sync when rules change.)
