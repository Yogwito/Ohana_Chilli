# Ingredient visibility audit

The customer-facing descriptions in `output/menu-refresh/catalog.json` are the recipe source for these illustrative images. Public ingredient metadata was also read; some old customization defaults conflict with descriptions (for example, Americana lists vegetables in defaults but not in its description). No recipes or database records were changed to fit the photographs.

Each fixed-recipe photograph was visually compared with its description at full resolution. Sauces and seasonings are represented by their visible coatings, drizzles or specks; a photograph cannot establish their actual flavor or composition.

| Dish | Visible ingredients / correction |
| --- | --- |
| Chilli burger | Brioche, one beef patty, bacon, cheese, tomato, lettuce, house sauce |
| Doble Chilli burger | Brioche, two beef patties, bacon, cheese, tomato, lettuce, house sauce |
| Veggie burger | Lentil croquette, brioche, cheese, lettuce, tomato, red chilli and golden pineapple sauces |
| Americana burger | Beef, extra bacon, brioche, cheese, orange cheddar sauce, crispy potato |
| Salchipapa | French fries, American sausage slices, bacon, cheddar sauce |
| Chilli fries | French fries, BBQ ground beef, bacon, cheddar and chilli sauces |
| Pulled Pork fries | French fries, pulled pork, bacon, cheddar, guacamole, sour cream |
| Chilli hot dog | Sausage, BBQ ground beef, crispy potato, honey mustard chilli and cheddar; removed unrelated white sauce |
| Americano hot dog | Sausage, cheese, bacon, crispy potato, chilli sauce; removed unrelated yellow sauce |
| Mazorcada Mixta | Corn, lettuce, breaded chicken, burger meat, bacon, cheese, house sauce |
| Mazorcada Costillas | Corn, lettuce, shredded BBQ ribs, bacon, cheese, guacamole, sour cream, house sauce; separated cheese, cream and sauces |
| Nachos | Tortilla chips, ground beef, orange pork, black beans, pico de gallo, grated cheese, guacamole, sour cream |
| Teriyaki bowl | Wok rice, sweet-sour chicken, zucchini, sweet-sour pepper, grilled pineapple, caramelized onion, crushed Choclitos, sesame, black pepper, BBQ Honey; replaced incorrect whole corn kernels |
| Paisa bowl | Rice, beans, ground beef, chicharrón, pico de gallo, guacamole, ripe plantain, sour cream, corn, crushed Doritos, paprika, chimichurri; exposed rice |
| Pulledpork bowl | Rice, orange pork, guacamole, tomato, corn, grilled pineapple, paprika, peanuts, sriracha mayo; exposed rice and recognizable peanut halves |

The six additional products, five combinations and eight beverages have empty ingredient descriptions; their product names and supplied references define their imagery. They cannot be certified against an unspecified recipe.

The customizable Veggie bowl remains unresolved: its description specifies one veggie protein, one base, six sides, two sauces and two complements but names none. The existing image includes tofu, which is not explicitly identified by the live `Proteína veggie` entry. Owner clarification was requested before asserting a matching recipe or generating another assumed combination.

The builder's `Queso rallado` now has a separate grated white cheese image instead of reusing the additional cheese-sauce image. Generation mode: built-in imagegen edits for six dishes, new generation for grated cheese. Full prompts and output provenance: `output/menu-refresh/ingredient-audit-generated.json`. Original versions: `output/menu-refresh/before-ingredient-audit/`.

Validation: all seven changed assets decoded in the local browser at 1200 × 900. Seven image-resolution tests passed, ESLint passed for changed domain/test files, and the production build passed after copying final assets. Updated overview: `output/menu-refresh/final-contact-sheet.jpg`. Changes remain local and have not been deployed.
