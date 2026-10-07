# Mobile optimization

- Mobile menu uses readable 13px descriptions and 15px prices, larger category tabs and 46px add controls. Screens narrower than 380px use one column; larger phones retain two columns.
- Product names open full details and ingredients. Product customization and cart quantities use 44px touch targets. Product notes, menu search and checkout inputs use 16px mobile text to avoid input zoom.
- Product sheets use dynamic viewport height, scroll containment and safe-area footer padding. Cart scroll space can shrink while checkout actions remain accessible.
- Bowl steps and actions stay visible between the header and bottom navigation. Step scrolling waits for the new layout and clears the sticky step tabs. Ingredient cards and size choices have tighter mobile spacing.
- Confirmation notifications sit above bottom navigation and are hidden behind open sheets so they cannot cover cart or product actions.
- All 36 full menu/ingredient photos have 480 × 360 WebP variants selected with `srcSet`/`sizes`; original 1200 × 900 assets remain available. Mobile variants total 543,892 bytes versus 2,763,594 bytes for originals (80% smaller at the asset level; actual selection depends on viewport and pixel density).

Browser verification: no horizontal overflow at 320, 390, 768 or 1280px. Opened Paisa details, added to cart, increased quantity, reached checkout without submitting an order, selected a medium bowl and rice, and advanced to proteins. All observed browser sessions had zero console errors. Image, product-customization and builder tests: 14 passed; builder tests rerun after scroll changes. ESLint of changed TypeScript files and production build passed.

Screenshots: `output/playwright/mobile-menu-320.png`, `mobile-menu-390.png`, `mobile-product-320.png`, `mobile-builder-390.png`, `mobile-builder-proteins.png`. Changes remain local, not deployed.
