# Shared teaching-app interface

These rules apply to all existing and future apps in this repository.

- Keep app paths, titles, categories and overview order in `src/appRegistry.ts`.
- The shared sticky `SiteHeader` contains the text brand and the four category links. On app pages highlight the app's category; category links open the corresponding overview list. A direct visit to `/` selects Labor. Preserve all existing app URLs.
- Every app starts with one large `h1`, immediately followed by a native `details.program-description` labelled exactly **Programmbeschreibung**, collapsed by default. Then render the working application. Do not insert decorative topic labels, subtitles, input controls or download links before the description.
- Retain all existing explanations, formulas and limitations. Group model assumptions and limits under a subsection within Programmbeschreibung. Keep input-specific and result-specific warnings near the relevant controls/results as well. Never hide safety-critical or validity warnings solely in the description.
- Reuse shared components and styles. Follow the title → description → program hierarchy on desktop, tablet and mobile. Native details and navigation must work by keyboard. Sticky navigation must remain visible without obscuring focused controls.
- Render mathematical equations using native MathML (shared MathNotation/MathFormula or existing app notation), with actual fractions, indices, powers, roots, integral limits and centered over-dots. Do not display raw LaTeX, underscore indices, or slash fractions as equations. Static MathML must not interpolate untrusted input. Plain text CSV and accessible labels may use linear notation; printed/visual exports should preserve mathematical notation where supported.
- Keep calculation logic independent of rendering. Do not round intermediate values. Display at most one decimal place, using scientific notation where more precision is needed. Preserve unrounded spreadsheet data.
- Before publishing, run `npm run build` (tests, TypeScript, production and offline builds). A failing check blocks publication. Check the shared navigation, description defaults and narrow-screen layout; verify existing reference tests whenever changing math presentation. Do not overwrite Streamlit reference sources.
