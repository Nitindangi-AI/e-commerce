import { create } from 'zustand';
import { cartAPI } from '../services/api';
import { insforge } from '../lib/insforge';
import toast from 'react-hot-toast';

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
      toast.error(`Failed to sync shopping cart: ${err.message || err}`);
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
      toast.error(`Failed to sync local cart with server: ${err.message || err}`);
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
      const { data: userData, error: userError } = await insforge.auth.getUser();
      if (userError) throw userError;
      if (userData?.user) {
        if (existingIndex > -1) {
          const { data: dbItem, error: selectError } = await insforge.database
            .from('cart_items')
            .select('id')
            .eq('user_id', userData.user.id)
            .eq('product_id', productId)
            .eq('selected_color', color)
            .eq('selected_size', size)
            .maybeSingle();

          if (selectError) throw selectError;

          if (dbItem) {
            const { error: updateError } = await insforge.database
              .from('cart_items')
              .update({ quantity: newQuantity })
              .eq('id', dbItem.id);
            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await insforge.database
            .from('cart_items')
            .insert([{
              user_id: userData.user.id,
              product_id: productId,
              quantity: 1,
              selected_color: color,
              selected_size: size,
            }]);
          if (insertError) throw insertError;
        }
      }
    } catch (err) {
      console.error("Failed to add to cart in DB:", err);
      toast.error(`Failed to save item to server cart: ${err.message || err}`);
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
      const { data: userData, error: userError } = await insforge.auth.getUser();
      if (userError) throw userError;
      if (userData?.user) {
        let query = insforge.database
          .from('cart_items')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('product_id', productId);
        
        if (color !== undefined) query = query.eq('selected_color', color);
        if (size !== undefined) query = query.eq('selected_size', size);

        const { error: deleteError } = await query;
        if (deleteError) throw deleteError;
      }
    } catch (err) {
      console.error("Failed to remove from cart in DB:", err);
      toast.error(`Failed to remove item from server cart: ${err.message || err}`);
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
      const { data: userData, error: userError } = await insforge.auth.getUser();
      if (userError) throw userError;
      if (userData?.user) {
        let query = insforge.database
          .from('cart_items')
          .update({ quantity: Math.max(1, quantity) })
          .eq('user_id', userData.user.id)
          .eq('product_id', productId);

        if (color !== undefined) query = query.eq('selected_color', color);
        if (size !== undefined) query = query.eq('selected_size', size);

        const { error: updateError } = await query;
        if (updateError) throw updateError;
      }
    } catch (err) {
      console.error("Failed to update quantity in DB:", err);
      toast.error(`Failed to update quantity on server: ${err.message || err}`);
    }
  },

  clearCart: async () => {
    set({ cartItems: [] });
    try {
      await cartAPI.clear();
    } catch (err) {
      console.error("Failed to clear cart in DB:", err);
      toast.error(`Failed to clear server cart: ${err.message || err}`);
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
