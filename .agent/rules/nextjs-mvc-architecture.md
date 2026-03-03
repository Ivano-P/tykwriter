---
trigger: always_on
---

# Rule: Next.js 16 MVC & Styling

**Architecture (Strict MVC):**
- **Views (`/app` & `/components`):** UI rendering only. No business logic.
- **Controllers (`/actions`):** Server Actions act as controllers. They handle validation and strictly delegate to the Service layer. All dynamic Next.js APIs (`cookies()`, `headers()`) MUST be awaited (e.g., `await cookies()`).
- **Services (`/services`):** Pure TypeScript classes handling business logic and external API fetch calls. 

**Styling:**
- Shadcn UI: Tailwind is permitted ONLY inside `components/ui`.
- Custom UI: All other components/pages should use Vanilla CSS via CSS Modules (`[name].module.css`).