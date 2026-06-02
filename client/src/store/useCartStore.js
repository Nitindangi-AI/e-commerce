import { create } from 'zustand';
import { cartAPI } from '../services/api';
import { insforge } from '../lib/insforge';

export const useCartStore = create((set, get) => ({
  cartItems: [],
  
  setCartItems: (items) => set({ cartItems: items }),

  fetchCart: async () => {
    try {
      const res = await cartAPI.get();
      if (res.success) {
        set({ cartItems: res.items || [] });
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    }
  },

  syncLocalCart: async () => {
    const localItems = get().cartItems;
    if (localItems.length === 0) {
      await get().fetchCart();
      return;
    }
    try {
      await cartAPI.sync(localItems);
      await get().fetchCart();
    } catch (err) {
      console.error("Failed to sync cart:", err);
    }
  },

  addToCart: async (product, color = '', size = '') => {
    const productId = product.id || product._id;
    const existingIndex = get().cartItems.findIndex(
      item => (item.id || item._id) === productId && 
      (item.selectedColor || '') === color && 
      (item.selectedSize || '') === size
    );

    let updatedItems;
    let newQuantity = 1;

    if (existingIndex > -1) {
      newQuantity = get().cartItems[existingIndex].quantity + 1;
      updatedItems = get().cartItems.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: newQuantity } : item
      );
    } else {
      updatedItems = [...get().cartItems, { ...product, quantity: 1, selectedColor: color, selectedSize: size }];
    }

    set({ cartItems: updatedItems });

    try {
      const { data: userData } = await insforge.auth.getUser();
      if (userData?.user) {
        if (existingIndex > -1) {
          const { data: dbItem } = await insforge.database
            .from('cart_items')
            .select('id')
            .eq('user_id', userData.user.id)
            .eq('product_id', productId)
            .eq('selected_color', color)
            .eq('selected_size', size)
            .maybeSingle();

          if (dbItem) {
            await insforge.database
              .from('cart_items')
              .update({ quantity: newQuantity })
              .eq('id', dbItem.id);
          }
        } else {
          await insforge.database
            .from('cart_items')
            .insert([{
              user_id: userData.user.id,
              product_id: productId,
              quantity: 1,
              selected_color: color,
              selected_size: size,
            }]);
        }
      }
    } catch (err) {
      console.error("Failed to add to cart in DB:", err);
    }
  },

  removeFromCart: async (productId, color = '', size = '') => {
    const updatedItems = get().cartItems.filter(item => {
      const matchesProduct = (item.id || item._id) === productId;
      const matchesColor = color === undefined || item.selectedColor === color;
      const matchesSize = size === undefined || item.selectedSize === size;
      return !(matchesProduct && matchesColor && matchesSize);
    });

    set({ cartItems: updatedItems });

    try {
      const { data: userData } = await insforge.auth.getUser();
      if (userData?.user) {
        let query = insforge.database
          .from('cart_items')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('product_id', productId);
        
        if (color !== undefined) query = query.eq('selected_color', color);
        if (size !== undefined) query = query.eq('selected_size', size);

        await query;
      }
    } catch (err) {
      console.error("Failed to remove from cart in DB:", err);
    }
  },

  updateQuantity: async (productId, quantity, color = '', size = '') => {
    const updatedItems = get().cartItems.map(item => {
      const matchesProduct = (item.id || item._id) === productId;
      const matchesColor = color === undefined || item.selectedColor === color;
      const matchesSize = size === undefined || item.selectedSize === size;
      return (matchesProduct && matchesColor && matchesSize) 
        ? { ...item, quantity: Math.max(1, quantity) } 
        : item;
    });

    set({ cartItems: updatedItems });

    try {
      const { data: userData } = await insforge.auth.getUser();
      if (userData?.user) {
        let query = insforge.database
          .from('cart_items')
          .update({ quantity: Math.max(1, quantity) })
          .eq('user_id', userData.user.id)
          .eq('product_id', productId);

        if (color !== undefined) query = query.eq('selected_color', color);
        if (size !== undefined) query = query.eq('selected_size', size);

        await query;
      }
    } catch (err) {
      console.error("Failed to update quantity in DB:", err);
    }
  },

  clearCart: async () => {
    set({ cartItems: [] });
    try {
      await cartAPI.clear();
    } catch (err) {
      console.error("Failed to clear cart in DB:", err);
    }
  },

  getCartCount: (state) => {
    const items = state?.cartItems || get().cartItems;
    return items.reduce((total, item) => total + item.quantity, 0);
  },
  
  getCartTotal: (state) => {
    const items = state?.cartItems || get().cartItems;
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));
