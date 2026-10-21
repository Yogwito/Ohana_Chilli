
-- =============================================
-- FASE 1: Schema completo Ohana & Chilli
-- =============================================

-- Drop existing orders table (no production data yet)
DROP TABLE IF EXISTS public.orders CASCADE;

-- 1. BRANDS
CREATE TABLE public.brands (
  id text PRIMARY KEY,
  name text NOT NULL
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);

-- 2. CATEGORIES
CREATE TABLE public.categories (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  icon text
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE INDEX idx_categories_brand ON public.categories(brand_id);

-- 3. PRODUCTS
CREATE TABLE public.products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  brand_id text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  calories integer,
  is_vegan boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_popular boolean DEFAULT false,
  is_new boolean DEFAULT false,
  ingredients_list text[]
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active);

-- 4. INGREDIENTS
CREATE TABLE public.ingredients (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('base','protein','acompanante','sauce','topping')),
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  calories integer,
  is_vegan boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active ingredients" ON public.ingredients FOR SELECT USING (is_active = true);
CREATE INDEX idx_ingredients_type ON public.ingredients(type);

-- 5. BOWL_RULES
CREATE TABLE public.bowl_rules (
  size text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  bases integer NOT NULL DEFAULT 1,
  proteins integer NOT NULL DEFAULT 1,
  accompaniments integer NOT NULL DEFAULT 4
);
ALTER TABLE public.bowl_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bowl_rules" ON public.bowl_rules FOR SELECT USING (true);

-- 6. ORDERS (new schema)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('pickup','delivery')),
  address text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','delivered','cancelled')),
  total_cents integer NOT NULL DEFAULT 0,
  whatsapp_sent boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Anon can insert orders (guest checkout)
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
-- No public SELECT for orders (admin only later)

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. ORDER_ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  brand_id text REFERENCES public.brands(id),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
-- Anon can insert order items
CREATE POLICY "Anyone can create order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- 8. SETTINGS
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read whatsapp_number" ON public.settings FOR SELECT USING (key = 'whatsapp_number');

-- =============================================
-- SEED DATA
-- =============================================

-- Brands
INSERT INTO public.brands (id, name) VALUES
  ('ohana', 'Ohana'),
  ('chilli', 'Chilli');

-- Categories
INSERT INTO public.categories (id, brand_id, name, slug, icon) VALUES
  ('ohana-premade', 'ohana', 'Bowls Preparados', 'premade', '🥗'),
  ('ohana-custom', 'ohana', 'Arma tu Bowl', 'custom', '✨'),
  ('chilli-burgers', 'chilli', 'Hamburguesas', 'burgers', '🍔'),
  ('chilli-hotdogs', 'chilli', 'Hot Dogs', 'hotdogs', '🌭'),
  ('chilli-fries', 'chilli', 'Papas Fritas', 'fries', '🍟'),
  ('chilli-mazorcadas', 'chilli', 'Mazorcadas', 'mazorcadas', '🌽'),
  ('chilli-nachos', 'chilli', 'Nachos', 'nachos', '🧀'),
  ('beverages-sodas', 'ohana', 'Refrescos', 'sodas', '🥤'),
  ('beverages-juices', 'ohana', 'Jugos Naturales', 'juices', '🧃'),
  ('beverages-water', 'ohana', 'Agua', 'water', '💧');

-- Ohana Products
INSERT INTO public.products (id, brand_id, category_id, name, description, price_cents, image_url, calories, is_popular, is_new, is_gluten_free, is_vegan, ingredients_list) VALUES
  ('ohana-1','ohana','ohana-premade','Bowl Hawaiano','Salmón fresco, arroz de sushi, aguacate, mango, edamame y salsa de ajonjolí',32900,'bowl-hawaiano.jpg',520,true,false,false,false,ARRAY['Salmón','Arroz','Aguacate','Mango','Edamame']),
  ('ohana-2','ohana','ohana-premade','Bowl Mediterráneo','Pollo a la plancha, quinoa, pepino, tomate cherry, garbanzos y aderezo cítrico',28900,'bowl-mediterraneo.jpg',450,false,false,true,false,ARRAY['Pollo','Quinoa','Pepino','Tomate','Garbanzos']),
  ('ohana-3','ohana','ohana-premade','Bowl Vegano Power','Tofu marinado, arroz integral, aguacate, edamame, col morada y salsa teriyaki',26900,'bowl-vegano.jpg',380,false,true,true,true,ARRAY['Tofu','Arroz Integral','Aguacate','Edamame','Col']),
  ('ohana-4','ohana','ohana-premade','Bowl Tropical','Camarones al limón, arroz blanco, mango, piña, zanahoria y salsa chipotle',34900,'bowl-tropical.jpg',420,true,false,false,false,ARRAY['Camarones','Arroz','Mango','Piña','Zanahoria']),
  ('ohana-5','ohana','ohana-premade','Bowl Tex-Mex','Carne asada, arroz, frijoles negros, elote, aguacate y salsa chipotle',30900,'bowl-texmex.jpg',580,false,false,true,false,ARRAY['Carne','Arroz','Frijoles','Elote','Aguacate']),
  ('ohana-6','ohana','ohana-premade','Bowl Atún Spicy','Atún sellado, mix de lechugas, pepino, wakame, mango y sriracha mayo',32900,'bowl-atun.jpg',390,false,true,false,false,ARRAY['Atún','Lechugas','Pepino','Wakame','Mango']);

-- Chilli Products
INSERT INTO public.products (id, brand_id, category_id, name, description, price_cents, image_url, calories, is_popular, is_new) VALUES
  ('chilli-burger-1','chilli','chilli-burgers','Chilli Burger Clásica','Carne de res 150g, queso cheddar, lechuga, tomate, cebolla y nuestra salsa especial',18900,'burger-clasica.jpg',650,true,false),
  ('chilli-burger-2','chilli','chilli-burgers','Doble Chilli','Doble carne 300g, doble queso, tocino crujiente, jalapeños y salsa BBQ',26900,'burger-doble.jpg',980,true,false),
  ('chilli-burger-3','chilli','chilli-burgers','Burger Crispy Chicken','Pechuga empanizada, queso suizo, lechuga, tomate y mayonesa de chipotle',19900,'burger-chicken.jpg',720,false,false),
  ('chilli-burger-4','chilli','chilli-burgers','Mushroom Swiss','Carne de res, champiñones salteados, queso suizo y salsa de la casa',22900,'burger-mushroom.jpg',680,false,true),
  ('chilli-hotdog-1','chilli','chilli-hotdogs','Hot Dog Clásico','Salchicha jumbo, mostaza, ketchup y cebolla picada',9900,'hotdog-clasico.jpg',380,false,false),
  ('chilli-hotdog-2','chilli','chilli-hotdogs','Chilli Dog','Salchicha jumbo, chili con carne, queso fundido y jalapeños',13900,'hotdog-chilli.jpg',520,true,false),
  ('chilli-hotdog-3','chilli','chilli-hotdogs','Hot Dog Bacon Lover','Salchicha jumbo envuelta en tocino, queso y cebolla caramelizada',15900,'hotdog-bacon.jpg',580,false,false),
  ('chilli-fries-1','chilli','chilli-fries','Papas Clásicas','Crujientes papas fritas con sal',7900,'papas-clasicas.jpg',320,false,false),
  ('chilli-fries-2','chilli','chilli-fries','Chilli Cheese Fries','Papas con chili con carne, queso cheddar fundido y jalapeños',13900,'papas-chilli.jpg',580,true,false),
  ('chilli-fries-3','chilli','chilli-fries','Loaded Fries','Papas con tocino, queso, crema y cebollín',15900,'papas-loaded.jpg',620,false,false),
  ('chilli-mazorcada-1','chilli','chilli-mazorcadas','Mazorcada Clásica','Elote asado con mayonesa, queso cotija, chile y limón',8900,'mazorcada-clasica.jpg',280,true,false),
  ('chilli-mazorcada-2','chilli','chilli-mazorcadas','Mazorcada Chilli','Elote asado con chili, queso fundido y chipotle',10900,'mazorcada-chilli.jpg',340,false,false),
  ('chilli-nachos-1','chilli','chilli-nachos','Nachos Clásicos','Totopos con queso fundido, jalapeños, crema y guacamole',15900,'nachos-clasicos.jpg',680,false,false),
  ('chilli-nachos-2','chilli','chilli-nachos','Nachos Supremos','Totopos con carne, pollo, queso, frijoles, crema, guacamole y pico de gallo',24900,'nachos-supremos.jpg',920,true,false);

-- Beverages
INSERT INTO public.products (id, brand_id, category_id, name, description, price_cents, image_url, calories, is_vegan) VALUES
  ('bev-1','ohana','beverages-sodas','Coca-Cola','Refresco 355ml',4500,'bev-cocacola.jpg',140,false),
  ('bev-2','ohana','beverages-sodas','Coca-Cola Zero','Refresco sin azúcar 355ml',4500,'bev-cocacola-zero.jpg',0,false),
  ('bev-3','ohana','beverages-sodas','Sprite','Refresco de lima-limón 355ml',4500,'bev-sprite.jpg',130,false),
  ('bev-4','ohana','beverages-sodas','Fanta Naranja','Refresco de naranja 355ml',4500,'bev-fanta.jpg',150,false),
  ('bev-5','ohana','beverages-juices','Jugo Verde','Espinaca, manzana, pepino, jengibre y limón',10900,'bev-jugo-verde.jpg',120,true),
  ('bev-6','ohana','beverages-juices','Jugo de Naranja','Naranja natural recién exprimida',8900,'bev-jugo-naranja.jpg',110,true),
  ('bev-7','ohana','beverages-juices','Limonada Natural','Limón fresco, agua y un toque de menta',6900,'bev-limonada.jpg',80,true),
  ('bev-8','ohana','beverages-juices','Smoothie Tropical','Mango, piña, plátano y leche de coco',12900,'bev-smoothie.jpg',220,true),
  ('bev-9','ohana','beverages-water','Agua Natural','Botella 500ml',3500,'bev-agua.jpg',0,false),
  ('bev-10','ohana','beverages-water','Agua Mineral','Topo Chico 355ml',4500,'bev-mineral.jpg',0,false);

-- Ingredients
INSERT INTO public.ingredients (id, type, name, price_cents, calories, is_vegan, is_gluten_free) VALUES
  ('base-rice','base','Arroz Blanco',0,130,false,false),
  ('base-brown-rice','base','Arroz Integral',0,110,false,true),
  ('base-quinoa','base','Quinoa',0,120,true,true),
  ('base-lettuce','base','Mix de Lechugas',0,15,true,true),
  ('base-spinach','base','Espinaca Baby',0,20,true,true),
  ('protein-chicken','protein','Pollo a la Plancha',0,165,false,true),
  ('protein-salmon','protein','Salmón',5000,180,false,true),
  ('protein-tuna','protein','Atún Sellado',4000,150,false,true),
  ('protein-shrimp','protein','Camarones',6000,100,false,true),
  ('protein-tofu','protein','Tofu Marinado',0,80,true,true),
  ('protein-beef','protein','Carne Asada',3000,200,false,true),
  ('acc-avocado','acompanante','Aguacate',0,80,true,true),
  ('acc-corn','acompanante','Elote',0,40,true,true),
  ('acc-edamame','acompanante','Edamame',0,60,true,true),
  ('acc-cucumber','acompanante','Pepino',0,10,true,true),
  ('acc-tomato','acompanante','Tomate Cherry',0,15,true,true),
  ('acc-carrot','acompanante','Zanahoria Rallada',0,25,true,true),
  ('acc-cabbage','acompanante','Col Morada',0,15,true,true),
  ('acc-mango','acompanante','Mango',0,35,true,true),
  ('acc-beans','acompanante','Frijoles Negros',0,70,true,true),
  ('acc-chickpeas','acompanante','Garbanzos',0,65,true,true),
  ('acc-seaweed','acompanante','Alga Wakame',0,5,true,true),
  ('acc-pineapple','acompanante','Piña',0,30,true,true),
  ('sauce-sesame','sauce','Ajonjolí',0,null,true,false),
  ('sauce-sriracha','sauce','Sriracha Mayo',0,null,false,false),
  ('sauce-teriyaki','sauce','Teriyaki',0,null,true,false),
  ('sauce-chipotle','sauce','Chipotle',0,null,false,false),
  ('sauce-citrus','sauce','Cítrica',0,null,true,true);

-- Bowl Rules
INSERT INTO public.bowl_rules (size, name, price_cents, bases, proteins, accompaniments) VALUES
  ('small','Pequeño',18900,1,1,4),
  ('medium','Mediano',24900,1,2,5),
  ('large','Grande',29900,2,2,6);

-- Settings
INSERT INTO public.settings (key, value) VALUES
  ('whatsapp_number', '573215667170');
