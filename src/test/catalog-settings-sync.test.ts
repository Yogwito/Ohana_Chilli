import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshCatalogQueries } from '@/hooks/use-catalog-sync';

describe('public settings refresh', () => {
  it('refreshes cached banner and ordering policy after a settings mutation', async () => {
    const client = new QueryClient();
    let banner = 'Anterior';
    let enforced = 'false';
    await client.fetchQuery({ queryKey: ['banner-settings'], queryFn: async () => banner });
    await client.fetchQuery({ queryKey: ['setting', 'business_hours_enforce'], queryFn: async () => enforced });
    banner = 'Horario especial'; enforced = 'true';
    await refreshCatalogQueries(client, ['settings']);
    expect(client.getQueryData(['banner-settings'])).toBe('Horario especial');
    expect(client.getQueryData(['setting', 'business_hours_enforce'])).toBe('true');
    client.clear();
  });
});
