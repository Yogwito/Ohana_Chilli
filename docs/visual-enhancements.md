# Ohana visual enhancements

Implemented the six approved enhancements on the existing feature branch:

1. Product details have a larger recipe heading, full ingredient description, grouped removal/extra/note controls, selected states and a fixed total/action footer. Desktop uses a right-side sheet; phones use a bottom sheet. Closing restores focus to its originating control.
2. “Favoritos de Ohana” shows up to three active dishes, popular catalog entries first, followed by editorial defaults Paisa, Teriyaki and Americana. Drinks, combos, extras and builder entries are excluded. Missing products are never recreated. Mobile uses a snapping horizontal carousel.
3. Featured, main-menu and legacy product cards share `MenuProductCard`, including live prices, category accents, explicit ingredient details and existing customization/cart/analytics behavior. Featured images declare their larger responsive size.
4. Cart and checkout show product thumbnails or a custom-bowl illustration. Checkout groups contact, fulfillment and payment; the mobile summary is expandable and desktop remains visible/sticky. Confirmation scrolls into view. Existing fees, terms, order RPC and WhatsApp rules are preserved.
5. Four lightweight decorative SVG motifs (bowl, leaf, corn, sauce) bring the same palette to builder, story, empty states and `/nosotros`. No fictional team/restaurant photos were created. Existing food photographs and catalog recipes were preserved.
6. Short selection/checkmark transitions and cart feedback respect reduced motion. Precise-pointer hover effects remain restrained; touch and keyboard controls stay accessible.

No new dependencies, database changes, schema changes or environment variables. The Veggie recipe still needs owner confirmation; this work does not invent one.

## Verification

- Full existing suite plus featured-selection tests: 28 passed. Three additional shared-card regression tests passed after focus restoration was added (31 tests verified total).
- Changed TypeScript files passed ESLint. Production build and TypeScript check passed; existing bundle-size/Browserslist warnings remain.
- Main menu and about page have no horizontal overflow at 320, 390, 768 and 1280px. Light/dark themes and reduced motion checked. Observed browser console errors: zero.
- Product → paid extra → kitchen note → cart retained a COP 30,900 total for Paisa plus COP 3,000 bacon. Mock pickup RPC preserved extras, note and total; mock delivery used COP 5,000 beverage plus live canonical COP 8,500 fee = COP 13,500. Order creation responses and WhatsApp window opening were intercepted: no real orders or messages were sent.
- Keyboard Tab/Enter toggled ingredient removal; Escape closed the sheet and returned focus to “Ver detalles de PAISA” in the real browser. Focus restoration also has a regression test. Medium bowl selection, rice selection and advancement to proteins verified.
- Screenshots: `output/playwright/polish-favorites-{mobile,desktop,dark}.png`, `polish-product-mobile.png`, `polish-product-desktop-dark.png`, `polish-cart-mobile.png`, `polish-checkout-mobile.png`, `polish-order-success-mobile.png`, `polish-about-mobile.png`.

Changes are local and have not been committed, merged or deployed.
