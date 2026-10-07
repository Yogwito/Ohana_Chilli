-- Staging first. Apply only after order-api is deployed and vault secrets are provisioned.
-- Required Vault names: order_api_url (full .../order-api/reconcile URL), order_reconciliation_secret.
-- This operation contains no credentials and does not alter order data.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN
 IF (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('order_api_url','order_reconciliation_secret'))<>2 THEN RAISE EXCEPTION 'Provision unique reconciliation Vault secrets first'; END IF;
END $$;
SELECT cron.schedule('ohana-order-reconciliation','* * * * *',$job$
 SELECT net.http_post(
   url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='order_api_url'),
   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='order_reconciliation_secret')),
   body := '{}'::jsonb,
   timeout_milliseconds := 50000
 );
$job$);
