import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type CartItem, type Me, type Product } from '../api';
import { useAuth } from '../auth/AuthContext';

interface Store {
  products: Product[];
  productById: (id: string) => Product | undefined;
  refreshProducts: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  /** Adds qty of each item (signs in first when signed out). */
  addToCart: (items: CartItem[], toastMsg?: string) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  reloadCart: () => Promise<void>;
  me: Me | null;
  updateMe: (patch: Partial<Pick<Me, 'city' | 'weeklySignal'>>) => Promise<Me | undefined>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<Store>(null as unknown as Store);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, signIn } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const refreshProducts = useCallback(async () => {
    setProducts(await api.listProducts());
  }, []);

  const reloadCart = useCallback(async () => {
    setCart(await api.getCart());
  }, []);

  useEffect(() => {
    refreshProducts().catch(console.error);
  }, [refreshProducts]);

  // Load per-user data whenever the signed-in user changes
  useEffect(() => {
    if (!user) {
      setCart([]);
      setMe(null);
      return;
    }
    reloadCart().catch(console.error);
    api.getMe().then(setMe).catch(console.error);
  }, [user, reloadCart]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  /** Optimistic local update, then replace the whole cart on the server. */
  const commit = useCallback((next: CartItem[]) => {
    setCart(next);
    api.putCart(next).catch((e) => {
      console.error(e);
      reloadCart();
    });
  }, [reloadCart]);

  const addToCart = useCallback(
    (items: CartItem[], toastMsg = 'เพิ่มลงตะกร้าแล้ว') => {
      if (!user) return signIn();
      const next = cart.map((c) => ({ ...c }));
      for (const it of items) {
        const found = next.find((c) => c.productId === it.productId);
        if (found) found.qty += it.qty;
        else next.push({ ...it });
      }
      commit(next);
      showToast(toastMsg);
    },
    [user, signIn, cart, commit, showToast],
  );

  const setQty = useCallback(
    (productId: string, qty: number) => commit(cart.map((c) => (c.productId === productId ? { ...c, qty: Math.max(1, qty) } : c))),
    [cart, commit],
  );

  const removeFromCart = useCallback((productId: string) => commit(cart.filter((c) => c.productId !== productId)), [cart, commit]);

  const updateMe = useCallback(async (patch: Partial<Pick<Me, 'city' | 'weeklySignal'>>) => {
    setMe((m) => (m ? { ...m, ...patch } : m)); // optimistic
    try {
      const saved = await api.putMe(patch);
      setMe(saved);
      return saved;
    } catch (e) {
      console.error(e);
      api.getMe().then(setMe).catch(() => {});
    }
  }, []);

  const value = useMemo<Store>(() => {
    const map = new Map(products.map((p) => [p.productId, p]));
    return {
      products,
      productById: (id) => map.get(id),
      refreshProducts,
      cart,
      cartCount: cart.reduce((t, c) => t + c.qty, 0),
      addToCart,
      setQty,
      removeFromCart,
      reloadCart,
      me,
      updateMe,
      toast,
      showToast,
    };
  }, [products, refreshProducts, cart, addToCart, setQty, removeFromCart, reloadCart, me, updateMe, toast, showToast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
