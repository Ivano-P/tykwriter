# Skill: Ship-to-Dokploy (Next.js 16 Standalone)

**Context:** You are preparing a Next.js 16 application for production on a VPS managed by Dokploy.

**Step 1: Next.js Config Validation**
- Verify that `next.config.ts` (or .js) contains `output: 'standalone'`. 
- If missing, add it. This is mandatory for VPS resource optimization.

**Step 2: Generate .dockerignore**
- Create a `.dockerignore` that excludes `node_modules`, `.next`, `.git`, `.env`, and `README.md`.

**Step 3: Multi-Stage Dockerfile Generation**
- Create a `Dockerfile` using `node:22-alpine` (2026 standard for stability/size).
- **Stage 1 (Deps):** Install dependencies using `npm ci`.
- **Stage 2 (Builder):** Build the app.
- **Stage 3 (Runner):** - Copy only the `.next/standalone` folder and `.next/static`.
    - Set `NODE_ENV` to `production`.
    - Expose port 3000.
    - Command: `node server.js`.

**Step 4: Environment Check**
- Remind the user to set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` in Dokploy.
- Ensure `OLLAMA_URL`, `OLLAMA_USERNAME`, and `OLLAMA_PASSWORD` are configured in the Dokploy environment dashboard.