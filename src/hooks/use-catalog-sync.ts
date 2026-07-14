import { useCallback, useEffect } from 'react';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

export type CatalogTable =
  | 'products'
  | 'categories'
  | 'ingredients'
  | 'bowl_rules'
  | 'delivery_zones'
  | 'settings'
  | 'promotions'
  | 'product_variants'
  | 'addons'
  | 'addon_recommendations';

interface CatalogSyncPayload {
  sourceId: string;
  tables: CatalogTable[];
  timestamp: number;
}

const CATALOG_SYNC_STORAGE_KEY = 'ohana:catalog-sync';
const CATALOG_SYNC_CHANNEL = 'ohana-catalog-sync';
const INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const CATALOG_QUERY_KEYS: Record<CatalogTable, QueryKey[]> = {
  products: [['products']],
  categories: [['categories'], ['products', 'beverages']],
  ingredients: [['ingredients']],
  bowl_rules: [['bowl_rules']],
  delivery_zones: [['delivery_zones']],
  settings: [['settings'], ['setting']],
  promotions: [['promotions']],
  product_variants: [['product_variants']],
  addons: [['addons']],
  addon_recommendations: [['addon_recommendations']],
};

function normalizeTables(tables: CatalogTable[]) {
  return Array.from(new Set(tables));
}

function getQueryKeysForTables(tables: CatalogTable[]) {
  const seen = new Set<string>();
  const queryKeys: QueryKey[] = [];

  normalizeTables(tables).forEach((table) => {
    CATALOG_QUERY_KEYS[table].forEach((queryKey) => {
      const key = JSON.stringify(queryKey);
      if (seen.has(key)) return;
      seen.add(key);
      queryKeys.push(queryKey);
    });
  });

  return queryKeys;
}

export async function refreshCatalogQueries(queryClient: QueryClient, tables: CatalogTable[]) {
  const queryKeys = getQueryKeysForTables(tables);

  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );

  await Promise.all(
    queryKeys.map((queryKey) => queryClient.refetchQueries({ queryKey, type: 'all' })),
  );
}

function broadcastCatalogChange(tables: CatalogTable[]) {
  if (typeof window === 'undefined') return;

  const payload: CatalogSyncPayload = {
    sourceId: INSTANCE_ID,
    tables: normalizeTables(tables),
    timestamp: Date.now(),
  };

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CATALOG_SYNC_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  }

  try {
    window.localStorage.setItem(CATALOG_SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures; the current tab has already refreshed its own cache.
  }
}

export function useCatalogMutationSync() {
  const queryClient = useQueryClient();

  return useCallback(async (tables: CatalogTable[]) => {
    await refreshCatalogQueries(queryClient, tables);
    broadcastCatalogChange(tables);
  }, [queryClient]);
}

export function useCatalogCrossTabSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncTables = (tables: CatalogTable[]) => {
      if (tables.length === 0) return;
      void refreshCatalogQueries(queryClient, tables);
    };

    let channel: BroadcastChannel | null = null;

    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CATALOG_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent<CatalogSyncPayload>) => {
        if (!event.data || event.data.sourceId === INSTANCE_ID) return;
        syncTables(event.data.tables);
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CATALOG_SYNC_STORAGE_KEY || !event.newValue) return;

      try {
        const payload = JSON.parse(event.newValue) as CatalogSyncPayload;
        if (payload.sourceId === INSTANCE_ID) return;
        syncTables(payload.tables);
      } catch {
        // Ignore invalid storage payloads.
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      channel?.close();
    };
  }, [queryClient]);
}
