---
trigger: always_on
---

# Rule: Next.js 16+ Strict Standards

You are operating in a Next.js 16+ environment. You MUST adhere to the following breaking changes and modern standards:

1. **The Async Trap:** All dynamic APIs (`cookies()`, `headers()`, `params`, `searchParams`) are strictly asynchronous. You MUST `await` them (e.g., `const c = await cookies()`).
2. **Middleware:** The legacy `middleware.ts` file is deprecated. You MUST use `proxy.ts` for all edge routing and middleware logic.
3. **Caching:** Prioritize the `use cache` directive and Partial Pre-Rendering (PPR) patterns over older caching strategies.
4. **Bundler:** We are using Turbopack by default. Do not generate or modify legacy Webpack configurations.