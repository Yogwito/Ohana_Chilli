# Menu photography refresh — 2026-10-05

35 visible catalog products regenerated with built-in imagegen. Original source files and Supabase data are preserved. Menu illustrations use the catalog descriptions and previous photos as references; they are not documentary photos of the delivered food.

## Format and integration

Validation: all 35 menu URLs decoded successfully in a fresh local browser session, with zero placeholders and zero console errors. Mobile verified at 390px with no horizontal overflow. Focused image, builder and customization tests: 13 passed. Production build and lint of changed TypeScript files passed. Screenshots: `output/playwright/menu-photos-desktop.png`, `output/playwright/menu-photos-mobile.png`; full asset overview: `output/menu-refresh/final-contact-sheet.jpg`.

- Landscape 4:3, exported at 1200 × 900, WebP quality 84.
- Warm off-white background, centered dishes, soft upper-left light.
- Product mappings: src/domain/menuImages.ts. These local overrides take precedence over Supabase image_url; update/remove an entry there when replacing photography through admin.
- Shared resolver: menu cards, product drawer, beverages, bowl-builder drink suggestions and extras.
- Original catalog snapshot and generation job inventory: output/menu-refresh/.
- The four hidden arma-tu-bowl catalog records are excluded; the size selector uses illustrations.

## Ingredient correction passes

Follow-up visibility audit: [menu-ingredient-audit.md](menu-ingredient-audit.md). Six dish images were corrected to expose every named ingredient and remove unrelated sauces or corn kernels; grated cheese received its own builder image. Prompts and generation provenance: `output/menu-refresh/ingredient-audit-generated.json`. The configurable Veggie bowl needs owner confirmation of its actual veggie protein and example combination.

### chilli-fries-salchipapas / Chilli

Use case: precise-object-edit. Edit this menu photograph. Remove ALL sausage slices and all shredded meat strands. The ONLY meat toppings must be browned finely crumbled ground beef and crispy bacon pieces. Keep golden French fries, cheddar sauce and chilli sauce. No sausage, no pulled pork. Preserve the same warm off-white background, white bowl or dish, camera angle, lighting, landscape 4:3 dimensions, sharp realistic food textures and centered framing. Change only the specified ingredients, no text or new props.

### chilli-hot-dogs / Chilli

Use case: precise-object-edit. Edit this menu photograph. Remove ALL bacon pieces. Replace them with a clearly visible generous layer of finely crumbled browned ground beef. Keep the whole American sausage, bun, crunchy shoestring potato sticks, honey mustard chilli sauce and cheddar sauce. No bacon. Preserve the same warm off-white background, white bowl or dish, camera angle, lighting, landscape 4:3 dimensions, sharp realistic food textures and centered framing. Change only the specified ingredients, no text or new props.

### chilli-mazorcadas-corn-bowls / Mazorcada Mixta

Use case: precise-object-edit. Edit this menu photograph. Remove the entire fresh cilantro/herb sprig garnish from the center. Replace that small area with the existing corn, cheese and bacon. Keep all other food, proportions and composition unchanged. No added herbs. Preserve the same warm off-white background, white bowl or dish, camera angle, lighting, landscape 4:3 dimensions, sharp realistic food textures and centered framing. Change only the specified ingredients, no text or new props.

### ohana-bowls-sugeridos / PULLEDPORK

Use case: precise-object-edit. Edit this menu photograph. Replace the entire shredded orange-red vegetable section at the rear of the bowl with clearly recognizable small juicy RED TOMATO CUBES, with visible tomato skin and seeds. No carrot or shredded vegetables. Keep rice, orange-glazed pulled pork, guacamole, sweet corn, grilled pineapple, paprika, peanuts and sriracha mayo unchanged. Preserve the same warm off-white background, white bowl or dish, camera angle, lighting, landscape 4:3 dimensions, sharp realistic food textures and centered framing. Change only the specified ingredients, no text or new props.

## Final assets and prompts

### chilli-adicionales / Queso Frito

ID: `12135ae7-32db-9903-7179-f48581e8b8cc`

Asset: `public/images/menu/adicionales-queso-frito.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: A small white ceramic ramekin containing golden breaded fried cheese bites, one broken open to show the soft cheese interior.. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Use a small plain off-white ceramic ramekin; elevated three-quarter view showing contents.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-adicionales / Queso

ID: `178e8c3b-d5c8-8faf-271f-8b785a801e07`

Asset: `public/images/menu/adicionales-queso.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: A small white ceramic ramekin of smooth yellow cheddar cheese sauce, matching the existing product reference.. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Use a small plain off-white ceramic ramekin; elevated three-quarter view showing contents.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-adicionales / Pepinillos

ID: `978c1802-ff11-1e54-8ea9-7995664d91a9`

Asset: `public/images/menu/adicionales-pepinillos.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: A small white ceramic ramekin of sliced pickled cucumbers.. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Use a small plain off-white ceramic ramekin; elevated three-quarter view showing contents.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-adicionales / Guacamole

ID: `23e44c1b-fe27-251a-0759-74f798d65e53`

Asset: `public/images/menu/adicionales-guacamole.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: A small white ceramic ramekin of fresh chunky guacamole with the same small tomato pieces as the reference.. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Use a small plain off-white ceramic ramekin; elevated three-quarter view showing contents.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-adicionales / Papa Francesa

ID: `3d9f5e71-d95c-7b13-5898-33a0c9e8e04e`

Asset: `public/images/menu/adicionales-papa-francesa.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: A small white ceramic ramekin containing a single side portion of golden French fries.. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Use a small plain off-white ceramic ramekin; elevated three-quarter view showing contents.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-adicionales / Tocineta

ID: `7e9a2544-4712-8633-f844-0766c82a2a01`

Asset: `public/images/menu/adicionales-tocineta.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: A small white ceramic ramekin of crisp cooked bacon pieces.. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Use a small plain off-white ceramic ramekin; elevated three-quarter view showing contents.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-burgers / Doble Chilli

ID: `10f70e4e-febc-7e30-5b18-82247596262b`

Asset: `public/images/menu/burgers-doble-chilli.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Doble Chilli. Doble porción de carne de res premium y tocineta en pan brioche con queso, tomate, lechuga y sala de la casa. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One burger, no plate, front three-quarter view at burger height showing layers, no side dishes. No stamped bun logos.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-burgers / Chilli

ID: `abf6980b-d497-990b-fc8b-20803dbddb4f`

Asset: `public/images/menu/burgers-chilli.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Chilli. 100% carne de res premium, tocineta en pan brioche con queso, tomate, lechuga y sala de la casa. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One burger, no plate, front three-quarter view at burger height showing layers, no side dishes. No stamped bun logos.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-burgers / VEGGIE

ID: `446beb63-71b7-7242-3797-db75472451d9`

Asset: `public/images/menu/burgers-veggie.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: VEGGIE. Croqueta de lenteja en pan brioche, queso, lechuga, tomate con salsa chilli y salsa de piña. Create the correct dish from its ingredient description; no stock-image reference is supplied. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One burger, no plate, front three-quarter view at burger height showing layers, no side dishes. No stamped bun logos.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-burgers / Americana

ID: `c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a`

Asset: `public/images/menu/burgers-americana.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Americana. 100% carne de res premium y extra tocineta en pan brioche con queso, salsa de queso cheddar y papa crujiente. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One burger, no plate, front three-quarter view at burger height showing layers, no side dishes. No stamped bun logos.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-combos / Papas + Bretaña

ID: `a6a7b74e-8cc4-6f8e-32ce-889b317fe54d`

Asset: `public/images/menu/combos-papas-bretana.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Papas + Bretaña. . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Show ONLY a white ceramic bowl of plain golden French fries and the single beverage named in the product. No burger, no extra food. Preserve original beverage brand and packaging from reference. Camera at a slight elevated three-quarter angle.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-combos / Papas + Cerveza

ID: `4191c0dd-132f-f886-3492-6bcbe585de6f`

Asset: `public/images/menu/combos-papas-cerveza.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Papas + Cerveza. . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Show ONLY a white ceramic bowl of plain golden French fries and the single beverage named in the product. No burger, no extra food. Preserve original beverage brand and packaging from reference. Camera at a slight elevated three-quarter angle.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-combos / Papas + Hatssu

ID: `757dedc2-0103-e0b7-437d-d9c5a0a989f2`

Asset: `public/images/menu/combos-papas-hatssu.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Papas + Hatssu. . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Show ONLY a white ceramic bowl of plain golden French fries and the single beverage named in the product. No burger, no extra food. Preserve original beverage brand and packaging from reference. Camera at a slight elevated three-quarter angle.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-combos / Papas + Soda Hatsu

ID: `7e822e94-6abd-9200-4f30-0ea75bce9ba2`

Asset: `public/images/menu/combos-papas-soda-hatsu.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Papas + Soda Hatsu. . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Show ONLY a white ceramic bowl of plain golden French fries and the single beverage named in the product. No burger, no extra food. Preserve original beverage brand and packaging from reference. Camera at a slight elevated three-quarter angle.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-combos / Papas + Gaseosa 250

ID: `3ee32c8a-6094-00d9-463b-2f90a15d3abf`

Asset: `public/images/menu/combos-papas-gaseosa-250.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Papas + Gaseosa 250. . Create the correct dish from its ingredient description; no stock-image reference is supplied. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Show ONLY a white ceramic bowl of plain golden French fries and the single beverage named in the product. No burger, no extra food. Preserve original beverage brand and packaging from reference. Camera at a slight elevated three-quarter angle. The beverage is one Coca-Cola original 250 ml bottle with red cap and red label. No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-fries-salchipapas / Salchipapa

ID: `1232c37b-9b66-78d2-43af-285c23ddcd7b`

Asset: `public/images/menu/fries-salchipapas-salchipapa.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Salchipapa. Papas a la francesa, salchicha americana con tocineta y salsa de queso cheddar. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-fries-salchipapas / Chilli

ID: `9f0aade8-f57c-b4b5-fb79-20d18c28300a`

Asset: `public/images/menu/fries-salchipapas-chilli.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Chilli. Papas a la francesa con carne de res molida tipo barbacoa, tocineta, salsa de queso cheddar y salsa chilli. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-fries-salchipapas / Pulled Pork

ID: `f2a45986-aaf1-99be-dec5-ef0266dc77fb`

Asset: `public/images/menu/fries-salchipapas-pulled-pork.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Pulled Pork. Papas a la francesa con carne pulled pork, tocineta, salsa de queso cheddar, guacamole y crema agria. Create the correct dish from its ingredient description; no stock-image reference is supplied. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-hot-dogs / Chilli

ID: `7b30fcd1-3614-a851-de5d-41f88318070f`

Asset: `public/images/menu/hot-dogs-chilli.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Chilli. Salchicha Super Americana, carne de res molida premium tipo barbacoa, papa crujiente, miel mostaza chilli y salsa cheddar. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One complete hot dog in an unbranded plain off-white shallow oval dish, three-quarter view showing toppings, no side dishes.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-hot-dogs / Americano

ID: `2422e354-e353-b8ca-626d-a97d577ca8cc`

Asset: `public/images/menu/hot-dogs-americano.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Americano. Salchicha Super Americana, queso, tocineta, papa crujiente, y salsa chilli. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One complete hot dog in an unbranded plain off-white shallow oval dish, three-quarter view showing toppings, no side dishes.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-mazorcadas-corn-bowls / Mazorcada Mixta

ID: `fcf4f05b-26ba-08a5-cc65-eb993db78e95`

Asset: `public/images/menu/mazorcadas-corn-bowls-mazorcada-mixta.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Mazorcada Mixta. Mazorca desgranada, lechuga, pollo apanado, carne de hamburguesa, tocineta, queso y salsa de la casa. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-mazorcadas-corn-bowls / Mazorcada Costillas Barbacoa

ID: `5aa7e78f-c8fa-7fea-ed5e-336b33c84f60`

Asset: `public/images/menu/mazorcadas-corn-bowls-mazorcada-costillas-barbacoa.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Mazorcada Costillas Barbacoa. Mazorca desgranada, lechuga, costilla desmechada en salsa barbacoa, tocineta, queso, guacamole, crema agria, salsa de la casa. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### chilli-nachos / Nachos para compartir

ID: `cc24c60a-0a37-c3cf-83fc-5457548e8e88`

Asset: `public/images/menu/nachos-nachos-para-compartir.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Nachos para compartir. Nachos, res molida, cerdo a la naranja, frijol negro, pico de gallo, queso rallado, guacamole, sour cream. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Cerveza Heineken

ID: `38650db9-cf3c-1027-10fd-a4fc7e3e0a91`

Asset: `public/images/menu/bebidas-cerveza-heineken.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Cerveza Heineken. . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Cocacola original (250 ml)

ID: `4ee1bd89-86b1-8def-a5a5-796e8a89cb7f`

Asset: `public/images/menu/bebidas-cocacola-original-250-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Cocacola original (250 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Soda Hatsu (300 ml)

ID: `14e103af-d4f3-fc8d-ff66-b6824460b578`

Asset: `public/images/menu/bebidas-soda-hatsu-300-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Soda Hatsu (300 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Bretaña (300 ml)

ID: `d631af2e-93d7-44a9-0789-7cf0c824e773`

Asset: `public/images/menu/bebidas-bretana-300-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Bretaña (300 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Cerveza 3 cordilleras rosada (300 ml)

ID: `a220d553-a3cc-aaf9-ee72-2f2536987f92`

Asset: `public/images/menu/bebidas-cerveza-3-cordilleras-rosada-300-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Cerveza 3 cordilleras rosada (300 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Hatsu (400 ml)

ID: `8148b008-1231-e549-2fc6-dac5dec7c685`

Asset: `public/images/menu/bebidas-hatsu-400-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Hatsu (400 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Agua Hatsu (300 ml)

ID: `b56d1e2e-39be-7471-350f-172ad123e560`

Asset: `public/images/menu/bebidas-agua-hatsu-300-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Agua Hatsu (300 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bebidas / Cocacola Zero (250 ml)

ID: `a224968d-1f25-bf83-321d-50f7c417a2a7`

Asset: `public/images/menu/bebidas-cocacola-zero-250-ml.webp`

Use case: product-mockup. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: Cocacola Zero (250 ml). . Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. Upright full bottle photographed at label height, intact cap and base, preserve exact original brand label, packaging, flavor and bottle shape, remove only distracting background. No invented lettering or altered branding.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bowls-sugeridos / VEGGIE

ID: `edfc2bdb-d986-d364-5080-a7868f942bf4`

Asset: `public/images/menu/bowls-sugeridos-veggie.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: VEGGIE. Arma tu Bowl Veggie!!! 1 Proteína Veggie, 1 Base, 6 Acompañantes, 2 Salsas, 2 Complementos. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bowls-sugeridos / TERIYAKI

ID: `be1fa199-5029-433f-7ccf-8fce38116665`

Asset: `public/images/menu/bowls-sugeridos-teriyaki.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: TERIYAKI. Arroz al Wok, Pollo agridulce, Zucchini, pimentón agridulce, piña asada, cebolla caramelizada, Choclitos triturados, ajonjolí, pimienta negra, salsa BBQ Honey. Create the correct dish from its ingredient description; no stock-image reference is supplied. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bowls-sugeridos / PAISA

ID: `7460dcd8-cfe1-e147-4be0-2b66c4d1da62`

Asset: `public/images/menu/bowls-sugeridos-paisa.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: PAISA. Arroz, frijoles, res molida, chicharrón, pico de gallo, guacamole, maduritos, crema agria, maicitos, doritos triturados, páprika, salsa Chimichurri. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.

### ohana-bowls-sugeridos / PULLEDPORK

ID: `2eb0b812-0be0-9912-8e34-ac26513276cf`

Asset: `public/images/menu/bowls-sugeridos-pulledpork.webp`

Use case: photorealistic-natural. Asset type: standardized Ohana restaurant menu photography. Produce one high-resolution landscape 4:3 photograph, 1536x1152. Subject: PULLEDPORK. Arroz, cerdo a la naranja, guacamole, tomate, maicitos, piña asada, páprika, maní, siracha mayo. Input image: dish/product reference and edit target. Preserve recognizable food identity, ingredients and realistic portions from the reference; where the catalog description specifies ingredients, it takes precedence. All images in this series must have an identical seamless matte warm off-white background (#f4f1eb), softly lit from upper left with natural contact shadows, crisp appetizing textures, realistic restrained colors, no props or surrounding ingredients. Center the complete subject within the central 72 percent of the frame with equal breathing room on all sides; nothing cropped. One plain off-white ceramic bowl, elevated three-quarter view showing every main ingredient, no branded paper liners.  No watermark, overlay text, signage, collage, decorative cutlery, hands, or ingredients absent from the menu description. This is a single finished commercial food photograph, not a layout.
