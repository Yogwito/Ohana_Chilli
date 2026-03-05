-- Ensure guest checkout can insert orders and order items
GRANT INSERT ON TABLE public.orders TO anon, authenticated;
GRANT INSERT ON TABLE public.order_items TO anon, authenticated;