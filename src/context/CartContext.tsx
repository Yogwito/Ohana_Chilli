import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { CartItem, CartState, Product, CustomBowl, Brand } from '@/types';
import { calculateBowlPrice } from '@/domain/bowlPricing';
import { z } from 'zod';
import { toast } from 'sonner';

// ─── Cart validation schema (versioned) ─────────────────
const CART_VERSION = 'cart:v1';
const CART_STORAGE_KEY = 'ohana-chilli-cart';

const cartItemSchema = z.object({
  id: z.string(),
  brand: z.enum(['ohana', 'chilli']),
  type: z.enum(['product', 'custom-bowl']),
  product: z.any().optional().nullable(),
  customBowl: z.any().optional().nullable(),
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
  | { type: 'ADD_PRODUCT'; payload: { product: Product; quantity: number; notes?: string } }
  | { type: 'ADD_CUSTOM_BOWL'; payload: { customBowl: CustomBowl; notes?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState };

const initialState: CartState = { items: [], subtotal: 0, total: 0 };

const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return { subtotal, total: subtotal };
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const { product, quantity, notes } = action.payload;
      const existingIndex = state.items.findIndex(
        item => item.type === 'product' && item.product?.id === product.id && item.notes === notes
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
          id: generateId(), brand: product.brand, type: 'product', product, quantity, notes,
          unitPrice: product.price, totalPrice: product.price * quantity,
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
  addProduct: (product: Product, quantity?: number, notes?: string) => void;
  addCustomBowl: (customBowl: CustomBowl, notes?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
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
    console.warn('Cart schema mismatch, resetting cart');
    localStorage.removeItem(CART_STORAGE_KEY);
    return initialState;
  } catch {
    console.warn('Corrupt cart data, resetting');
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

  useEffect(() => { saveCartToStorage(cart); }, [cart]);

  const addProduct = useCallback((product: Product, quantity = 1, notes?: string) => {
    dispatch({ type: 'ADD_PRODUCT', payload: { product, quantity, notes } });
  }, []);

  const addCustomBowl = useCallback((customBowl: CustomBowl, notes?: string) => {
    dispatch({ type: 'ADD_CUSTOM_BOWL', payload: { customBowl, notes } });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  }, []);

  const clearCart = useCallback(() => { dispatch({ type: 'CLEAR_CART' }); }, []);

  const getItemCount = useCallback(() => cart.items.reduce((c, i) => c + i.quantity, 0), [cart.items]);

  const getItemsByBrand = useCallback((brand: Brand) => cart.items.filter(i => i.brand === brand), [cart.items]);

  const stateValue = useMemo(() => ({ cart }), [cart]);
  const actionsValue = useMemo(() => ({
    addProduct, addCustomBowl, updateQuantity, removeItem, clearCart, getItemCount, getItemsByBrand,
  }), [addProduct, addCustomBowl, updateQuantity, removeItem, clearCart, getItemCount, getItemsByBrand]);

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
