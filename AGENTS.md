# Site development rules

- Keep styling clean, adaptable, and CSS driven. Use CSS for layout, responsive behavior, colors, typography, and visual effects.
- Edit the existing component rules instead of appending overriding patches. Consolidate superseded declarations during each change.
- Keep styles in `dist/styles.css`, markup in `dist/index.html`, and interaction logic in `dist/app.js`.
- Use shared CSS custom properties for recurring colors, typography, radii, and glass effects. Scope selectors to components; avoid broad selectors that couple unrelated UI.
- Use JavaScript only for interaction state and behavior. Toggle classes, data attributes, or accessibility attributes; do not assign inline visual styles. For continuous pointer tracking and native-scroll progress only, JavaScript may supply coordinate custom properties; CSS must still own geometry, appearance, and transitions.
- Preserve desktop and mobile behavior, keyboard focus, and reduced-motion support when editing styles.
- Keep this buildless site simple; do not introduce a framework or styling dependency for ordinary UI changes.
- Current workflow is local preview with automatic reload at http://localhost:8766 via `preview.py`. Do not publish local iterations unless the user asks.

- Write all visible copy as finished product language. Never expose development labels such as "sample", "placeholder", "demo", or "pending" to visitors. Identify mock data in source comments instead. Describe unavailable features honestly; do not imply signups, tickets, or playback work before they are connected.

- R2 follows the October 29 client feedback: Design 2 only, portal trailer interaction, and native document scrolling. Do not restore the bullet/paper effect or design switcher.
- Navigation must use section anchors, support browser history, and reflect the visible section. Never intercept wheel/touch scrolling or hide entire content sections for navigation.
- The original four-design project is preserved at ../run-amok-site-2026. Never edit it as part of R2 work.
- Keep the approved press wording in assets/press/quotes.json aligned with the rendered HTML. Do not invent or paraphrase quoted reviews.
- Belanosima remains in place pending the client's answer about production typography.
