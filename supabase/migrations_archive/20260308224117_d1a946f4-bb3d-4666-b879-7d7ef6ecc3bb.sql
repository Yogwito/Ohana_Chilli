-- Update Ohana premade bowl descriptions to match official menu
UPDATE products SET description = 'Arroz al Wok, Pollo agridulce, Zucchini, pimentón agridulce, piña asada, cebolla caramelizada, choclitos triturados, ajonjolí, pimienta negra, salsa BBQ Honey.' WHERE id = 'ohana-teriyaki';

UPDATE products SET description = 'Arroz, frijoles, res molida, chicharrón, pico de gallo, guacamole, maduritos, crema agria, maicitos, doritos triturados, páprika, salsa Chimichurri.' WHERE id = 'ohana-paisa';

UPDATE products SET description = 'Arroz, frijoles, pollo agridulce, pollo al Panko, tomate, pimentón agridulce, queso rallado, crutones de pan, páprika, ajonjolí, salsa BBQ Honey.' WHERE id = 'ohana-chicago';

UPDATE products SET description = 'Arroz, cerdo a la naranja, guacamole, maicitos, tomate, piña asada, páprika, maní, siracha mayo.' WHERE id = 'ohana-pulled-pork';

UPDATE products SET description = 'Bowl vegetariano: 1 proteína veggie, 1 base, 6 acompañantes, 2 salsas, 2 complementos.' WHERE id = 'ohana-veggie';

-- Fix Teriyaki price - PDF shows it alongside other bowls, likely $26,900
UPDATE products SET price_cents = 26900 WHERE id = 'ohana-teriyaki';