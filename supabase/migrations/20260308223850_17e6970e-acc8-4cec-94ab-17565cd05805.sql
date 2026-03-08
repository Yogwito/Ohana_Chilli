-- Fix bowl_rules prices to match official Ohana menu (Dec 2025)
-- Pequeño: $23,900 | Mediano: $27,900 | Grande: $32,900
-- Also fix Grande proteins: should be 3, not 2

UPDATE bowl_rules SET price_cents = 23900 WHERE size = 'small';
UPDATE bowl_rules SET price_cents = 27900 WHERE size = 'medium';
UPDATE bowl_rules SET price_cents = 32900, proteins = 3 WHERE size = 'large';