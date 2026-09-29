"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Drawer, IconButton } from "@fenomena/ui";
import { formatMoney, type StorefrontCart } from "../lib/cart-types";

type CartContextValue = {
  cart?: StorefrontCart;
  loading: boolean;
  error?: string;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<boolean>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  pendingItemId?: string;
};

const CartContext = createContext<CartContextValue | null>(null);

async function readResponse(response: Response) {
  const payload = (await response.json()) as { cart?: StorefrontCart; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The commerce service is unavailable.");
  return payload.cart;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StorefrontCart>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string>();
  const mutation = useRef(Promise.resolve());

  useEffect(() => {
    fetch("/api/cart")
      .then(readResponse)
      .then(setCart)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Unable to load your bag."),
      )
      .finally(() => setLoading(false));
  }, []);

  function queueMutation(task: () => Promise<void>) {
    mutation.current = mutation.current.then(task, task);
    return mutation.current;
  }

  async function addItem(variantId: string, quantity = 1) {
    setPendingItemId(variantId);
    setError(undefined);
    try {
      const next = await readResponse(
        await fetch("/api/cart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ variantId, quantity }),
        }),
      );
      if (next) setCart(next);
      setDrawerOpen(true);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add that item.");
      return false;
    } finally {
      setPendingItemId(undefined);
    }
  }

  function updateItem(lineItemId: string, quantity: number) {
    setPendingItemId(lineItemId);
    setError(undefined);
    return queueMutation(async () => {
      try {
        const next = await readResponse(
          await fetch(`/api/cart/${lineItemId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ quantity }),
          }),
        );
        if (next) setCart(next);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to update that item.");
        await refreshCart();
      } finally {
        setPendingItemId(undefined);
      }
    });
  }

  function removeItem(lineItemId: string) {
    setPendingItemId(lineItemId);
    setError(undefined);
    return queueMutation(async () => {
      try {
        const next = await readResponse(
          await fetch(`/api/cart/${lineItemId}`, { method: "DELETE" }),
        );
        if (next) setCart(next);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to remove that item.");
        await refreshCart();
      } finally {
        setPendingItemId(undefined);
      }
    });
  }

  async function refreshCart() {
    try {
      const next = await readResponse(await fetch("/api/cart"));
      setCart(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to refresh your bag.");
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        addItem,
        updateItem,
        removeItem,
        pendingItemId,
      }}
    >
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}

function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, error, loading, pendingItemId, updateItem, removeItem } =
    useCart();
  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      title={`Bag${cart ? ` ${cart.itemCount}` : ""}`}
    >
      {loading ? <p role="status">Loading your bag…</p> : null}
      {error ? (
        <p className="catalogue-state-inline" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !cart?.items.length ? <p>Your bag is empty.</p> : null}
      <div className="cart-drawer__items">
        {cart?.items.map((item) => (
          <article className="cart-line" key={item.id}>
            {item.thumbnail ? (
              <img className="cart-line__image" src={item.thumbnail} alt="" />
            ) : null}
            <div className="cart-line__body">
              <strong>{item.productTitle}</strong>
              <span>{item.variantTitle}</span>
              <span>
                {formatMoney(item.unitPrice)} · {formatMoney(item.total)}
              </span>
              <div className="cart-line__controls">
                <button
                  type="button"
                  aria-label={`Decrease ${item.productTitle} quantity`}
                  disabled={pendingItemId === item.id || item.quantity <= 1}
                  onClick={() => updateItem(item.id, item.quantity - 1)}
                >
                  −
                </button>
                <span aria-live="polite">{item.quantity}</span>
                <button
                  type="button"
                  aria-label={`Increase ${item.productTitle} quantity`}
                  disabled={pendingItemId === item.id}
                  onClick={() => updateItem(item.id, item.quantity + 1)}
                >
                  +
                </button>
                <IconButton
                  type="button"
                  label={`Remove ${item.productTitle}`}
                  disabled={pendingItemId === item.id}
                  onClick={() => removeItem(item.id)}
                >
                  ×
                </IconButton>
              </div>
            </div>
          </article>
        ))}
      </div>
      {cart?.items.length ? (
        <div className="cart-drawer__summary">
          <strong>Subtotal</strong>
          <strong>{formatMoney(cart.subtotal)}</strong>
          <Link className="catalogue-link" href="/cart" onClick={closeDrawer}>
            View bag
          </Link>
          <span className="cart-checkout-note">Checkout follows in a later milestone.</span>
        </div>
      ) : null}
    </Drawer>
  );
}
