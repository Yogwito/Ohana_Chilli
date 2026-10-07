-- READ ONLY. Run on live and staging; store output securely (schema only, no customer rows).
SELECT current_database(), version();
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname;
SELECT n.nspname,n.nspacl,has_schema_privilege('anon',n.oid,'USAGE') AS anon_usage,has_schema_privilege('anon',n.oid,'CREATE') AS anon_create,has_schema_privilege('authenticated',n.oid,'USAGE') AS authenticated_usage,has_schema_privilege('authenticated',n.oid,'CREATE') AS authenticated_create FROM pg_namespace n WHERE n.nspname='public';
SELECT defaclrole::regrole AS owner,defaclnamespace::regnamespace AS schema,defaclobjtype,defaclacl FROM pg_default_acl WHERE defaclnamespace='public'::regnamespace;
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role') ORDER BY table_name,grantee;
SELECT p.oid::regprocedure, p.prosecdef, p.proacl, pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('has_role','create_order_with_items','order_create','order_quote','order_action','order_payment_apply','order_refund_apply','order_rate_limit','track_analytics_event');
SELECT c.relname AS table_name,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('orders','order_items','analytics_events','payment_attempts','order_refunds');
SELECT schemaname,tablename,pubname FROM pg_publication_tables;
SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position;
SELECT migration.version FROM supabase_migrations.schema_migrations migration ORDER BY version;
SELECT 'orders' AS table_name,count(*) AS rows FROM public.orders UNION ALL SELECT 'order_items',count(*) FROM public.order_items;
SELECT count(*) AS invalid_order_amounts_or_states FROM public.orders WHERE total_cents < 0 OR delivery_fee_cents < 0 OR payment_method NOT IN ('cash','transfer','online','legacy') OR payment_state NOT IN ('unpaid','unverified','pending','paid','rejected','unknown');
SELECT count(*) AS invalid_order_item_amounts_or_quantities FROM public.order_items WHERE quantity <= 0 OR unit_price_cents < 0;
-- Explicitly verify historical public exposure, including policies renamed outside migrations.
SELECT policyname,roles,cmd,qual FROM pg_policies WHERE schemaname='public' AND tablename IN ('orders','order_items') AND cmd IN ('SELECT','ALL');
