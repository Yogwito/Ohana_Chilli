-- READ ONLY (SELECT only; counts, no customer rows). Run on production/staging after
-- migrations 120000-126000 to size H10: historical orders still needing accept_legacy.
SELECT count(*) AS pending_legacy_orders
FROM public.orders
WHERE status = 'pending' AND payment_method = 'legacy' AND payment_state = 'unknown' AND actionable_at IS NULL;

SELECT status, payment_method, payment_state, count(*) AS orders, min(created_at) AS oldest, max(created_at) AS newest
FROM public.orders
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
