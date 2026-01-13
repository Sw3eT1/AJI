import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const CART_KEY = "shop_cart_v1";

function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => safeParse(localStorage.getItem(CART_KEY)) || []);
    // items: [{ product, quantity }]

    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    }, [items]);

    const add = (product) => {
        setItems((prev) => {
            const idx = prev.findIndex((x) => x.product.id === product.id);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
                return copy;
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const remove = (productId) => {
        setItems((prev) => prev.filter((x) => x.product.id !== productId));
    };

    const setQty = (productId, quantity) => {
        const q = Math.max(1, Number(quantity) || 1);
        setItems((prev) =>
            prev.map((x) => (x.product.id === productId ? { ...x, quantity: q } : x))
        );
    };

    const inc = (productId) => {
        setItems((prev) =>
            prev.map((x) =>
                x.product.id === productId ? { ...x, quantity: x.quantity + 1 } : x
            )
        );
    };

    const dec = (productId) => {
        setItems((prev) =>
            prev
                .map((x) =>
                    x.product.id === productId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x
                )
                .filter(Boolean)
        );
    };

    const clear = () => setItems([]);

    const total = useMemo(() => {
        return items.reduce((sum, x) => sum + Number(x.product.unit_price || 0) * x.quantity, 0);
    }, [items]);

    const value = useMemo(
        () => ({ items, add, remove, setQty, inc, dec, clear, total }),
        [items, total]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
