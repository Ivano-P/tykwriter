---
trigger: always_on
---

# Rule: Next.js 16 MVC & Styling

**Architecture (Strict MVC):**
- **Views (`/app` & `/components`):** UI rendering only. No business logic.
- **Controllers (`/actions`):** Server Actions act as controllers. They handle validation and strictly delegate to the Service layer. All dynamic Next.js APIs (`cookies()`, `headers()`, `params`) MUST be awaited (e.g., `await cookies()`).
- **Services (`/services`):** Pure TypeScript classes handling business logic and external API fetch calls. 

**Styling (Strict Boundaries):**
- **Shadcn UI:** Tailwind is permitted ONLY inside the `components/ui` directory.
- **Custom UI:** All other components and pages MUST use Vanilla CSS via CSS Modules (`[name].module.css`). Do not use Tailwind utility classes on standard DOM elements.

**Responsive Design (Mobile-First CSS Modules):**
- All custom CSS must be written using a Mobile-First approach.
- Tablet and larger screen adjustments must be grouped and separated at the bottom of the CSS module file.
- You MUST use the following structure and commenting style for media queries:

```css
/* Mobile-first base styles */
.a-propos-hero {
    background-color: var(--cleardark);
    text-align: center;
    padding: 10rem 0rem;
}

/************** Larger screens adjustments *****************************/
@media (min-width: 768px) {
    .a-propos-hero {
        text-align: center;
        padding: 3rem 1rem;
    }

    .a-propos-illustration-image {
        width: 75%;
        margin-top: 40px;
    }
}