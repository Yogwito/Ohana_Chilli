/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { CartItem, CartState, Product, CustomBowl, Brand, ProductCustomization } from '@/types';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import {
  calculateCustomizationTotal,
  canonicalFromCustomBowl,
  canonicalFromLegacyProduct,
  createCustomizationSignature,
} from '@/domain/customization';
import { normalizeProductCustomization } from '@/domain/productCustomizations';
import { useBowlRules, useIngredients, useProducts } from '@/hooks/use-catalog';
import { z } from 'zod';
import { toast } from 'sonner';

// ─── Cart validation schema (versioned) ─────────────────
// v4: cada item persiste su customización CANÓNICA (`customization`) junto a
// los campos legacy del UI. Los carritos v3 (o sin versión) se migran al
// restaurar: el canónico se deriva con los adapters y los precios se
// re-derivan — nunca se confían precios guardados en localStorage (la
// reconciliación con catálogo vivo ya los recalcula además).
const CART_VERSION = 'cart:v4';
const LEGACY_CART_VERSIONS = new Set(['cart:v3', undefined]);
const CART_STORAGE_KEY = 'ohana-bowls-cart';

const productCustomizationSchema = z.object({
  removedIngredients: z.array(z.string()),
  extras: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  })),
  note: z.string(),
  extraTotal: z.number(),
  variant: z.object({
    id: z.string(),
    name: z.string(),
    priceDelta: z.number().optional(),
  }).optional().nullable(),
});

const cartItemSchema = z.object({
  id: z.string(),
  brand: z.enum(['ohana']),
  type: z.enum(['product', 'custom-bowl']),
  product: z.any().optional().nullable(),
  customBowl: z.any().optional().nullable(),
  customizations: productCustomizationSchema.optional().nullable(),
  customization: z.any().optional().nullable(), // canónico (v4); se re-deriva al cargar
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

const cartStateSchema = z.object({
  version: z.string().optional(),
  items: z.array(cartItemSchema),
  subtotal: z.number(),
  total: z.number(),
});

// ─── Actions ─────────────────────────────────────────────
type CartAction =
  | { type: 'ADD_PRODUCT'; payload: { product: Product; quantity: number; notes?: string; customizations?: ProductCustomization } }
  | { type: 'ADD_CUSTOM_BOWL'; payload: { customBowl: CustomBowl; notes?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'UPDATE_ITEM_CUSTOMIZATIONS'; payload: { itemId: string; customizations?: ProductCustomization } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'RECONCILE_CATALOG'; payload: { products: Product[]; bowlRules: Parameters<typeof reconcileCartWithCatalog>[1]['bowlRules']; ingredients: Parameters<typeof reconcileCartWithCatalog>[1]['ingredients'] } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState };

const initialState: CartState = { items: [], subtotal: 0, total: 0 };

const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return { subtotal, total: subtotal };
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ── Puente al modelo canónico: ÚNICA identidad y ÚNICO cálculo de precio ──
// para todos los tipos de item. Los campos legacy (customizations/customBowl)
// siguen siendo lo que emite el UI; aquí se elevan al canónico una sola vez.

type ItemLike = Pick<CartItem, 'type' | 'product' | 'customBowl' | 'customizations' | 'notes'>;

function canonicalOf(item: ItemLike) {
  if (item.type === 'custom-bowl') return canonicalFromCustomBowl(item.customBowl);
  const canonical = canonicalFromLegacyProduct(item.customizations);
  // addProduct(product, qty, notes) sin customizations (p.ej. "repetir
  // pedido"): la nota igualmente distingue al item.
  if (!canonical.note && item.notes?.trim()) {
    return { ...canonical, note: item.notes.trim() };
  }
  return canonical;
}

function signatureOf(item: ItemLike) {
  const productKey = item.type === 'product' ? item.product?.id ?? '' : 'custom-bowl';
  return createCustomizationSignature(productKey, canonicalOf(item));
}

function unitPriceOf(item: ItemLike) {
  return calculateCustomizationTotal(item.product?.price ?? 0, canonicalOf(item));
}

/** Re-deriva canónico y precios de un item (post-reconciliación / carga). */
function withDerivedFields(item: CartItem): CartItem {
  const customization = canonicalOf(item);
  const unitPrice = calculateCustomizationTotal(item.product?.price ?? 0, customization);
  return { ...item, customization, unitPrice, totalPrice: unitPrice * item.quantity };
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const { product, quantity, notes } = action.payload;
      const customizations = normalizeProductCustomization(action.payload.customizations);
      const draft: ItemLike = { type: 'product', product, customizations, notes };
      const customization = canonicalOf(draft);
      const signature = signatureOf(draft);
      const unitPrice = unitPriceOf(draft);
      const existingIndex = state.items.findIndex(
        item => item.type === 'product' && signatureOf(item) === signature,
      );
      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = state.items.map((item, index) => {
          if (index === existingIndex) {
            const newQuantity = item.quantity + quantity;
            return { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity };
          }
          return item;
        });
      } else {
        newItems = [...state.items, {
          id: generateId(), brand: product.brand, type: 'product', product, quantity,
          customizations, customization, notes: customization.note || undefined,
          unitPrice, totalPrice: unitPrice * quantity,
        }];
      }
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'ADD_CUSTOM_BOWL': {
      const { customBowl, notes } = action.payload;
      const draft: ItemLike = { type: 'custom-bowl', customBowl, notes };
      const customization = canonicalOf(draft);
      const unitPrice = unitPriceOf(draft);
      // Configuraciones idénticas se fusionan por cantidad (firma canónica
      // única: misma implementación que los productos).
      const signature = signatureOf(draft);
      const existingIndex = state.items.findIndex(
        item => item.type === 'custom-bowl' && signatureOf(item) === signature,
      );
      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = state.items.map((item, index) => {
          if (index === existingIndex) {
            const newQuantity = item.quantity + 1;
            return { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity };
          }
          return item;
        });
      } else {
        newItems = [...state.items, {
          id: generateId(), brand: 'ohana' as Brand, type: 'custom-bowl' as const,
          customBowl, customization, quantity: 1, notes, unitPrice, totalPrice: unitPrice,
        }];
      }
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'UPDATE_ITEM_CUSTOMIZATIONS': {
      // Cart editing: reapply the drawer flow onto an existing line —
      // recompute price and identity, then merge into an identical line if
      // one exists, preserving the edited line's quantity.
      const { itemId, customizations: rawCustomizations } = action.payload;
      const target = state.items.find(item => item.id === itemId);
      if (!target || target.type !== 'product' || !target.product) return state;

      const customizations = normalizeProductCustomization(rawCustomizations);
      const draft: ItemLike = { type: 'product', product: target.product, customizations };
      const customization = canonicalOf(draft);
      const signature = signatureOf(draft);
      const unitPrice = unitPriceOf(draft);

      const twin = state.items.find(
        item => item.id !== itemId && item.type === 'product' && signatureOf(item) === signature,
      );

      let newItems: CartItem[];
      if (twin) {
        const mergedQuantity = twin.quantity + target.quantity;
        newItems = state.items
          .filter(item => item.id !== itemId)
          .map(item => item.id === twin.id
            ? { ...item, quantity: mergedQuantity, totalPrice: item.unitPrice * mergedQuantity }
            : item);
      } else {
        newItems = state.items.map(item => item.id === itemId
          ? {
              ...item,
              customizations,
              customization,
              notes: customization.note || undefined,
              unitPrice,
              totalPrice: unitPrice * item.quantity,
            }
          : item);
      }
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      if (quantity <= 0) {
        const newItems = state.items.filter(item => item.id !== itemId);
        return { items: newItems, ...calculateTotals(newItems) };
      }
      const newItems = state.items.map(item =>
        item.id === itemId ? { ...item, quantity, totalPrice: item.unitPrice * quantity } : item
      );
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.itemId);
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'RECONCILE_CATALOG': {
      const reconciled = reconcileCartWithCatalog(state, action.payload);
      if (reconciled === state) return state;
      // La reconciliación actualiza los campos legacy con el catálogo vivo;
      // el canónico y los precios se re-derivan del único cálculo compartido.
      const items = reconciled.items.map(withDerivedFields);
      return { items, ...calculateTotals(items) };
    }
    case 'CLEAR_CART':
      return initialState;
    case 'LOAD_CART':
      return action.payload;
    default:
      return state;
  }
};

// ─── Separate contexts for performance ───────────────────
interface CartStateContextType {
  cart: CartState;
}

interface CartActionsContextType {
  addProduct: (product: Product, quantity?: number, notes?: string, customizations?: ProductCustomization) => void;
  addCustomBowl: (customBowl: CustomBowl, notes?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemCustomizations: (itemId: string, customizations?: ProductCustomization) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getItemsByBrand: (brand: Brand) => CartItem[];
}

const CartStateContext = createContext<CartStateContextType | undefined>(undefined);
const CartActionsContext = createContext<CartActionsContextType | undefined>(undefined);

interface LoadedCart {
  state: CartState;
  migratedFromLegacy: boolean;
}

/**
 * Restaura el carrito con migración de esquema: los carritos v3 (extras
 * expandidos, sin canónico) se elevan al modelo v4 derivando la customización
 * canónica y recalculando precios con el cálculo compartido — nunca se
 * confían precios guardados. JSON malformado o esquema desconocido → carrito
 * vacío, sin crashear. La reconciliación con catálogo vivo corre después y
 * elimina referencias inactivas con aviso al usuario.
 */
function loadCartFromStorage(): LoadedCart {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { state: initialState, migratedFromLegacy: false };
    const parsed = JSON.parse(raw);
    const result = cartStateSchema.safeParse(parsed);
    if (!result.success) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return { state: initialState, migratedFromLegacy: false };
    }
    const version = result.data.version;
    if (version !== CART_VERSION && !LEGACY_CART_VERSIONS.has(version)) {
      // Versión futura/desconocida: preferible vaciar a interpretar mal.
      localStorage.removeItem(CART_STORAGE_KEY);
      return { state: initialState, migratedFromLegacy: false };
    }
    const items = (result.data.items as CartItem[]).map(withDerivedFields);
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return {
      state: { items, subtotal, total: subtotal },
      migratedFromLegacy: version !== CART_VERSION && items.length > 0,
    };
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    return { state: initialState, migratedFromLegacy: false };
  }
}

function saveCartToStorage(cart: CartState) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ ...cart, version: CART_VERSION }));
  } catch {
    toast.error('No se pudo guardar el carrito localmente');
  }
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loaded] = React.useState<LoadedCart>(() => loadCartFromStorage());
  const [cart, dispatch] = useReducer(cartReducer, loaded.state);

  useEffect(() => {
    if (loaded.migratedFromLegacy) {
      toast.info('Actualizamos tu carrito guardado al nuevo formato.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { data: products = [], isSuccess: productsReady } = useProducts();
  const { data: bowlRules = [], isSuccess: bowlRulesReady } = useBowlRules();
  const { data: ingredients = [], isSuccess: ingredientsReady } = useIngredients();

  const catalogReady = productsReady && bowlRulesReady && ingredientsReady;

  useEffect(() => { saveCartToStorage(cart); }, [cart]);

  useEffect(() => {
    if (!catalogReady) return;

    // Diff before dispatch so catalog adjustments are never silent: the
    // customer is told when an item disappeared or a price changed.
    const snapshot = { products, bowlRules, ingredients };
    const reconciled = reconcileCartWithCatalog(cart, snapshot);
    if (reconciled !== cart) {
      const removedCount = cart.items.length - reconciled.items.length;
      const repriced = reconciled.items.some(next => {
        const prev = cart.items.find(item => item.id === next.id);
        return prev && prev.unitPrice !== next.unitPrice;
      });
      if (removedCount > 0) {
        toast.warning(
          removedCount === 1
            ? 'Un producto de tu carrito ya no está disponible y fue retirado.'
            : `${removedCount} productos de tu carrito ya no están disponibles y fueron retirados.`,
        );
      } else if (repriced) {
        toast.info('Actualizamos los precios de tu carrito con el menú vigente.');
      }
    }

    dispatch({
      type: 'RECONCILE_CATALOG',
      payload: snapshot,
    });
    // `cart` intentionally omitted: reconciliation must run on catalog
    // changes, not on every cart mutation (the reducer already keeps state
    // stable when nothing changed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bowlRules, catalogReady, ingredients, products]);

  const addProduct = useCallback((product: Product, quantity = 1, notes?: string, customizations?: ProductCustomization) => {
    dispatch({ type: 'ADD_PRODUCT', payload: { product, quantity, notes, customizations } });
  }, []);

  const addCustomBowl = useCallback((customBowl: CustomBowl, notes?: string) => {
    dispatch({ type: 'ADD_CUSTOM_BOWL', payload: { customBowl, notes } });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  }, []);

  const updateItemCustomizations = useCallback((itemId: string, customizations?: ProductCustomization) => {
    dispatch({ type: 'UPDATE_ITEM_CUSTOMIZATIONS', payload: { itemId, customizations } });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  }, []);

  const clearCart = useCallback(() => { dispatch({ type: 'CLEAR_CART' }); }, []);

  const getItemCount = useCallback(() => cart.items.reduce((c, i) => c + i.quantity, 0), [cart.items]);

  const getItemsByBrand = useCallback((brand: Brand) => cart.items.filter(i => i.brand === brand), [cart.items]);

  const stateValue = useMemo(() => ({ cart }), [cart]);
  const actionsValue = useMemo(() => ({
    addProduct, addCustomBowl, updateQuantity, updateItemCustomizations, removeItem, clearCart, getItemCount, getItemsByBrand,
  }), [addProduct, addCustomBowl, updateQuantity, updateItemCustomizations, removeItem, clearCart, getItemCount, getItemsByBrand]);

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartActionsContext.Provider value={actionsValue}>
        {children}
      </CartActionsContext.Provider>
    </CartStateContext.Provider>
  );
};

// ─── Hooks ───────────────────────────────────────────────
export function useCartState() {
  const ctx = useContext(CartStateContext);
  if (!ctx) throw new Error('useCartState must be used within CartProvider');
  return ctx.cart;
}

export function useCartActions() {
  const ctx = useContext(CartActionsContext);
  if (!ctx) throw new Error('useCartActions must be used within CartProvider');
  return ctx;
}

export function useCartCount() {
  const ctx = useContext(CartActionsContext);
  if (!ctx) throw new Error('useCartCount must be used within CartProvider');
  return ctx.getItemCount();
}

// Backward-compatible hook
export const useCart = () => {
  const cart = useCartState();
  const actions = useCartActions();
  return { cart, ...actions };
};
