/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { CartItem, CartState, Product, CustomBowl, Brand, ProductCustomization, ProductVariant } from '@/types';
import { applyQuantityReviewIssues, CART_QUANTITY_LIMIT_MESSAGE, reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import { calculateBowlPrice } from '@/domain/bowlPricing';
import {
  calculateProductUnitPrice,
  getProductCustomizationKey,
  normalizeProductCustomization,
} from '@/domain/productCustomizations';
import { useBowlRules, useIngredients, usePromotions, useProducts } from '@/hooks/use-catalog';
import { CART_VERSION, parsePersistedCart } from '@/domain/cartPersistence';
import { toast } from 'sonner';

const CART_STORAGE_KEY = 'ohana-bowls-cart';

// ─── Actions ─────────────────────────────────────────────
type CartAction =
  | { type: 'ADD_PRODUCT'; payload: { product: Product; quantity: number; notes?: string; customizations?: ProductCustomization } }
  | { type: 'ADD_CUSTOM_BOWL'; payload: { customBowl: CustomBowl; notes?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'SET_ITEM_VARIANT'; payload: { itemId: string; variant: ProductVariant } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'RECONCILE_CATALOG'; payload: Parameters<typeof reconcileCartWithCatalog>[1] }
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
      const currentQuantity = state.items.filter(item => item.type === 'product' && item.product?.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      if (currentQuantity + quantity > 10) return state;
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
      const newItems = [...state.items, {
        id: generateId(), brand: 'ohana' as Brand, type: 'custom-bowl' as const,
        customBowl, quantity: 1, notes, unitPrice, totalPrice: unitPrice,
      }];
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      const target = state.items.find(item => item.id === itemId);
      if (target && quantity >= target.quantity && quantity > 10) return state;
      if (target?.type === 'product' && target.product && quantity >= target.quantity && state.items.filter(item => item.type === 'product' && item.product?.id === target.product?.id && item.id !== itemId).reduce((sum, item) => sum + item.quantity, quantity) > 10) return state;
      if (quantity <= 0) {
        const newItems = applyQuantityReviewIssues(state.items.filter(item => item.id !== itemId));
        return { items: newItems, ...calculateTotals(newItems) };
      }
      const newItems = applyQuantityReviewIssues(state.items.map(item =>
        item.id === itemId ? { ...item, quantity, totalPrice: item.unitPrice * quantity } : item
      ));
      return { items: newItems, ...calculateTotals(newItems) };
    }
    case 'SET_ITEM_VARIANT': {
      const items = state.items.map(item => {
        if (item.id !== action.payload.itemId || item.type !== 'product' || !item.product?.variants?.some(variant => variant.id === action.payload.variant.id)) return item;
        const customizations = normalizeProductCustomization({ removedIngredients: item.customizations?.removedIngredients ?? [], extras: item.customizations?.extras ?? [], note: item.customizations?.note ?? '', extraTotal: 0, variant: action.payload.variant });
        const unitPrice = calculateProductUnitPrice(item.product.price, customizations);
        return { ...item, customizations, reviewIssues: undefined, unitPrice, totalPrice: unitPrice * item.quantity };
      });
      const reviewedItems = applyQuantityReviewIssues(items);
      return { items: reviewedItems, ...calculateTotals(reviewedItems) };
    }
    case 'REMOVE_ITEM': {
      const newItems = applyQuantityReviewIssues(state.items.filter(item => item.id !== action.payload.itemId));
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
  setItemVariant: (itemId: string, variant: ProductVariant) => void;
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
    const parsed = parsePersistedCart(JSON.parse(raw));
    if (parsed) return parsed;
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
  const { data: promotions, isSuccess: promotionsReady } = usePromotions();

  const catalogReady = productsReady && bowlRulesReady && ingredientsReady;

  useEffect(() => { saveCartToStorage(cart); }, [cart]);

  useEffect(() => {
    if (!catalogReady) return;

    dispatch({
      type: 'RECONCILE_CATALOG',
      payload: { products, bowlRules, ingredients, promotions: promotionsReady ? promotions : undefined },
    });
  }, [bowlRules, catalogReady, ingredients, products, promotions, promotionsReady]);

  const addProduct = useCallback((product: Product, quantity = 1, notes?: string, customizations?: ProductCustomization) => {
    if (cart.items.filter(item => item.type === 'product' && item.product?.id === product.id).reduce((sum, item) => sum + item.quantity, 0) + quantity > 10) { toast.error(CART_QUANTITY_LIMIT_MESSAGE); return; }
    dispatch({ type: 'ADD_PRODUCT', payload: { product, quantity, notes, customizations } });
  }, [cart.items]);

  const addCustomBowl = useCallback((customBowl: CustomBowl, notes?: string) => {
    dispatch({ type: 'ADD_CUSTOM_BOWL', payload: { customBowl, notes } });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    const target = cart.items.find(item => item.id === itemId);
    if (target && quantity >= target.quantity && quantity > 10) { toast.error(CART_QUANTITY_LIMIT_MESSAGE); return; }
    if (target?.type === 'product' && target.product && quantity >= target.quantity && cart.items.filter(item => item.type === 'product' && item.product?.id === target.product?.id && item.id !== itemId).reduce((sum, item) => sum + item.quantity, quantity) > 10) { toast.error(CART_QUANTITY_LIMIT_MESSAGE); return; }
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  }, [cart.items]);

  const setItemVariant = useCallback((itemId: string, variant: ProductVariant) => dispatch({ type: 'SET_ITEM_VARIANT', payload: { itemId, variant } }), []);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  }, []);

  const clearCart = useCallback(() => { dispatch({ type: 'CLEAR_CART' }); }, []);

  const getItemCount = useCallback(() => cart.items.reduce((c, i) => c + i.quantity, 0), [cart.items]);

  const getItemsByBrand = useCallback((brand: Brand) => cart.items.filter(i => i.brand === brand), [cart.items]);

  const stateValue = useMemo(() => ({ cart }), [cart]);
  const actionsValue = useMemo(() => ({
    addProduct, addCustomBowl, updateQuantity, setItemVariant, removeItem, clearCart, getItemCount, getItemsByBrand,
  }), [addProduct, addCustomBowl, updateQuantity, setItemVariant, removeItem, clearCart, getItemCount, getItemsByBrand]);

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
