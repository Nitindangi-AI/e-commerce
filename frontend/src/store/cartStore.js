import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { insforge } from '../lib/insforge';
import { toast } from '../components/GlobalToast';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      setCartItems: (items) => set({ items }),

      // On login: fetch database cart and merge it with local Zustand cart
      mergeCart: async () => {
        try {
          const { data: userData } = await insforge.auth.getUser();
          const userId = userData?.user?.id;
          if (!userId) return;

          const { data: dbItems, error: fetchError } = await insforge.database
            .from('cart_items')
            .select('*')
            .eq('user_id', userId);

          if (fetchError) throw fetchError;

          const localItems = [...get().items];
          const mergedItems = [...localItems];

          for (const dbItem of dbItems || []) {
            const existingIndex = mergedItems.findIndex(
              (item) =>
                (item.id || item._id) === dbItem.product_id &&
                (item.selectedColor || '') === (dbItem.selected_color || '') &&
                (item.selectedSize || '') === (dbItem.selected_size || '')
            );

            if (existingIndex > -1) {
              // Exists in both: combine quantities and update DB
              const newQty = mergedItems[existingIndex].quantity + dbItem.quantity;
              mergedItems[existingIndex].quantity = newQty;

              await insforge.database
                .from('cart_items')
                .update({ quantity: newQty })
                .eq('id', dbItem.id);
            } else {
              // Only in DB: fetch product info and insert to Zustand
              const { data: productData } = await insforge.database
                .from('products')
                .select('*')
                .eq('id', dbItem.product_id)
                .maybeSingle();

              if (productData) {
                mergedItems.push({
                  ...productData,
                  quantity: dbItem.quantity,
                  selectedColor: dbItem.selected_color || '',
                  selectedSize: dbItem.selected_size || '',
                });
              }
            }
          }

          // Any local items that weren't in DB: insert them
          const dbKeys = new Set((dbItems || []).map(d => `${d.product_id}-${d.selected_color || ''}-${d.selected_size || ''}`));
          for (const localItem of localItems) {
            const key = `${localItem.id || localItem._id}-${localItem.selectedColor || ''}-${localItem.selectedSize || ''}`;
            if (!dbKeys.has(key)) {
              await insforge.database
                .from('cart_items')
                .insert([{
                  user_id: userId,
                  product_id: localItem.id || localItem._id,
                  quantity: localItem.quantity,
                  selected_color: localItem.selectedColor || '',
                  selected_size: localItem.selectedSize || '',
                }]);
            }
          }

          set({ items: mergedItems });
        } catch (err) {
          console.error("Cart merge error:", err);
          toast.error("Failed to merge your local cart with server cart.");
        }
      },

      fetchCart: async () => {
        try {
          const { data: userData } = await insforge.auth.getUser();
          const userId = userData?.user?.id;
          if (!userId) return;

          const { data: dbItems, error: fetchError } = await insforge.database
            .from('cart_items')
            .select('*')
            .eq('user_id', userId);

          if (fetchError) throw fetchError;

          const items = [];
          for (const dbItem of dbItems || []) {
            const { data: productData } = await insforge.database
              .from('products')
              .select('*')
              .eq('id', dbItem.product_id)
              .maybeSingle();

            if (productData) {
              items.push({
                ...productData,
                quantity: dbItem.quantity,
                selectedColor: dbItem.selected_color || '',
                selectedSize: dbItem.selected_size || '',
              });
            }
          }

          set({ items });
        } catch (err) {
          console.error("Failed to fetch cart:", err);
          toast.error("Failed to load shopping cart.");
        }
      },

      addToCart: async (product, color = '', size = '') => {
        const productId = product.id || product._id;
        const existingIndex = get().items.findIndex(
          item => (item.id || item._id) === productId && 
          (item.selectedColor || '') === color && 
          (item.selectedSize || '') === size
        );

        let updatedItems;
        let newQuantity = 1;

        if (existingIndex > -1) {
          newQuantity = get().items[existingIndex].quantity + 1;
          updatedItems = get().items.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: newQuantity } : item
          );
        } else {
          updatedItems = [...get().items, { ...product, quantity: 1, selectedColor: color, selectedSize: size }];
        }

        set({ items: updatedItems });

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
          console.error("Failed to save to database cart:", err);
          toast.error("Failed to add item to server cart.");
        }
      },

      removeFromCart: async (productId, color = '', size = '') => {
        const updatedItems = get().items.filter(item => {
          const matchesProduct = (item.id || item._id) === productId;
          const matchesColor = item.selectedColor === color;
          const matchesSize = item.selectedSize === size;
          return !(matchesProduct && matchesColor && matchesSize);
        });

        set({ items: updatedItems });

        try {
          const { data: userData } = await insforge.auth.getUser();
          if (userData?.user) {
            await insforge.database
              .from('cart_items')
              .delete()
              .eq('user_id', userData.user.id)
              .eq('product_id', productId)
              .eq('selected_color', color)
              .eq('selected_size', size);
          }
        } catch (err) {
          console.error("Failed to remove from database cart:", err);
          toast.error("Failed to remove item from server cart.");
        }
      },

      updateQty: async (productId, quantity, color = '', size = '') => {
        const updatedItems = get().items.map(item => {
          const matchesProduct = (item.id || item._id) === productId;
          const matchesColor = item.selectedColor === color;
          const matchesSize = item.selectedSize === size;
          return (matchesProduct && matchesColor && matchesSize) 
            ? { ...item, quantity: Math.max(1, quantity) } 
            : item;
        });

        set({ items: updatedItems });

        try {
          const { data: userData } = await insforge.auth.getUser();
          if (userData?.user) {
            await insforge.database
              .from('cart_items')
              .update({ quantity: Math.max(1, quantity) })
              .eq('user_id', userData.user.id)
              .eq('product_id', productId)
              .eq('selected_color', color)
              .eq('selected_size', size);
          }
        } catch (err) {
          console.error("Failed to update database cart quantity:", err);
          toast.error("Failed to update cart quantity on server.");
        }
      },

      clearCart: async () => {
        set({ items: [] });
        try {
          const { data: userData } = await insforge.auth.getUser();
          if (userData?.user) {
            await insforge.database
              .from('cart_items')
              .delete()
              .eq('user_id', userData.user.id);
          }
        } catch (err) {
          console.error("Failed to clear database cart:", err);
          toast.error("Failed to clear server cart.");
        }
      },

      // On logout: clear Zustand only (keep DB cart for next login)
      logoutCart: () => {
        set({ items: [] });
      },

      getCartCount: (state) => {
        const items = state?.items || get().items;
        return items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getCartTotal: (state) => {
        const items = state?.items || get().items;
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
      }
    }),
    {
      name: 'cart-storage',
    }
  )
);
