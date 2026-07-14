/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { CartItem, CartState, Product, CustomBowl, Brand, ProductCustomization } from '@/types';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import { calculateBowlPrice } from '@/domain/bowlPricing';
import { getCustomBowlSignature } from '@/domain/bowlSignature';
import {
  calculateProductUnitPrice,
  getProductCustomizationKey,
  normalizeProductCustomization,
} from '@/domain/productCustomizations';
import { useBowlRules, useIngredients, useProducts } from '@/hooks/use-catalog';
import { z } from 'zod';
import { toast } from 'sonner';

// ─── Cart validation schema (versioned) ─────────────────
const CART_VERSION = 'cart:v3';
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
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

const cartStateSchema = z.object({
  version: z.literal(CART_VERSION).optional(),
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

function getProductNotesKey(customizations: ProductCustomization | undefined, notes: string | null | undefined) {
  return customizations?.note || notes?.trim() || '';
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const { product, quantity, notes } = action.payload;
      const customizations = normalizeProductCustomization(action.payload.customizations);
      const customizationKey = getProductCustomizationKey(customizations);
      const normalizedNotes = getProductNotesKey(customizations, notes);
      const unitPrice = calculateProductUnitPrice(product.price, customizations);
      const existingIndex = state.items.findIndex(
        item => {
          if (item.type !== 'product' || item.product?.id !== product.id) return false;

          const itemCustomizations = normalizeProductCustomization(item.customizations);
          return getProductCustomizationKey(itemCustomizations) === customizationKey
            && getProductNotesKey(itemCustomizations, item.notes) === normalizedNotes;
        }
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
          customizations, notes: normalizedNotes || undefined,
          unitPrice, totalPrice: unitPrice * quantity,
        }];
      }
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'ADD_CUSTOM_BOWL': {
      const { customBowl, notes } = action.payload;
      const unitPrice = calculateBowlPrice(customBowl);
      // Identical configurations merge by quantity (deterministic signature:
      // sorted ingredient ids + extras by name|charge + size + notes).
      const signature = getCustomBowlSignature(customBowl);
      const existingIndex = state.items.findIndex(
        item => item.type === 'custom-bowl'
          && item.customBowl
          && getCustomBowlSignature(item.customBowl) === signature,
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
          customBowl, quantity: 1, notes, unitPrice, totalPrice: unitPrice,
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
      const customizationKey = getProductCustomizationKey(customizations);
      const normalizedNotes = getProductNotesKey(customizations, undefined);
      const unitPrice = calculateProductUnitPrice(target.product.price, customizations);

      const twin = state.items.find(item => {
        if (item.id === itemId || item.type !== 'product' || item.product?.id !== target.product!.id) return false;
        const itemCustomizations = normalizeProductCustomization(item.customizations);
        return getProductCustomizationKey(itemCustomizations) === customizationKey
          && getProductNotesKey(itemCustomizations, item.notes) === normalizedNotes;
      });

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
              notes: normalizedNotes || undefined,
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
    case 'RECONCILE_CATALOG':
      return reconcileCartWithCatalog(state, action.payload);
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

function loadCartFromStorage(): CartState {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    const result = cartStateSchema.safeParse(parsed);
    if (result.success) return { items: result.data.items as CartItem[], subtotal: result.data.subtotal, total: result.data.total };
    localStorage.removeItem(CART_STORAGE_KEY);
    return initialState;
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    return initialState;
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
  const [cart, dispatch] = useReducer(cartReducer, initialState, () => loadCartFromStorage());
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
