import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem, CartState, Product, CustomBowl, Brand } from '@/types';

// Cart Actions
type CartAction =
  | { type: 'ADD_PRODUCT'; payload: { product: Product; quantity: number; notes?: string } }
  | { type: 'ADD_CUSTOM_BOWL'; payload: { customBowl: CustomBowl; notes?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState };

// Initial State
const initialState: CartState = {
  items: [],
  subtotal: 0,
  total: 0,
};

// Calculate totals
const calculateTotals = (items: CartItem[]): { subtotal: number; total: number } => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return { subtotal, total: subtotal };
};

// Calculate custom bowl price
const calculateBowlPrice = (bowl: CustomBowl): number => {
  let price = bowl.size.price;
  
  // Add extra protein costs
  bowl.proteins.forEach(protein => {
    if (protein.price) {
      price += protein.price;
    }
  });
  
  return price;
};

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Cart Reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const { product, quantity, notes } = action.payload;
      
      // Check if product already exists in cart
      const existingIndex = state.items.findIndex(
        item => item.type === 'product' && item.product?.id === product.id && item.notes === notes
      );
      
      let newItems: CartItem[];
      
      if (existingIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) => {
          if (index === existingIndex) {
            const newQuantity = item.quantity + quantity;
            return {
              ...item,
              quantity: newQuantity,
              totalPrice: item.unitPrice * newQuantity,
            };
          }
          return item;
        });
      } else {
        // Add new item
        const newItem: CartItem = {
          id: generateId(),
          brand: product.brand,
          type: 'product',
          product,
          quantity,
          notes,
          unitPrice: product.price,
          totalPrice: product.price * quantity,
        };
        newItems = [...state.items, newItem];
      }
      
      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }
    
    case 'ADD_CUSTOM_BOWL': {
      const { customBowl, notes } = action.payload;
      const unitPrice = calculateBowlPrice(customBowl);
      
      const newItem: CartItem = {
        id: generateId(),
        brand: 'ohana',
        type: 'custom-bowl',
        customBowl,
        quantity: 1,
        notes,
        unitPrice,
        totalPrice: unitPrice,
      };
      
      const newItems = [...state.items, newItem];
      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }
    
    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const newItems = state.items.filter(item => item.id !== itemId);
        const totals = calculateTotals(newItems);
        return { items: newItems, ...totals };
      }
      
      const newItems = state.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity,
            totalPrice: item.unitPrice * quantity,
          };
        }
        return item;
      });
      
      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.itemId);
      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }
    
    case 'CLEAR_CART':
      return initialState;
    
    case 'LOAD_CART':
      return action.payload;
    
    default:
      return state;
  }
};

// Context Types
interface CartContextType {
  cart: CartState;
  addProduct: (product: Product, quantity?: number, notes?: string) => void;
  addCustomBowl: (customBowl: CustomBowl, notes?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getItemsByBrand: (brand: Brand) => CartItem[];
}

// Create Context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Storage key
const CART_STORAGE_KEY = 'ohana-chilli-cart';

// Provider Component
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, initialState);
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: parsedCart });
      } catch (error) {
        console.error('Failed to load cart from storage:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);
  
  const addProduct = (product: Product, quantity = 1, notes?: string) => {
    dispatch({ type: 'ADD_PRODUCT', payload: { product, quantity, notes } });
  };
  
  const addCustomBowl = (customBowl: CustomBowl, notes?: string) => {
    dispatch({ type: 'ADD_CUSTOM_BOWL', payload: { customBowl, notes } });
  };
  
  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };
  
  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  };
  
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  
  const getItemCount = (): number => {
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  };
  
  const getItemsByBrand = (brand: Brand): CartItem[] => {
    return cart.items.filter(item => item.brand === brand);
  };
  
  return (
    <CartContext.Provider
      value={{
        cart,
        addProduct,
        addCustomBowl,
        updateQuantity,
        removeItem,
        clearCart,
        getItemCount,
        getItemsByBrand,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Custom Hook
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
