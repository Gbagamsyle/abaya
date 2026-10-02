"use client";

import Link from "next/link";
import { Button } from "@fenomena/ui";
import { CatalogueShell } from "../../components/catalogue-shell";
import { useCart } from "../../components/cart-provider";
import { formatMoney } from "../../lib/cart-types";

export default function CartPage() {
  const { cart, loading, error, pendingItemId, updateItem, removeItem } = useCart();
  return (
    <CatalogueShell title="Your bag">
      <section className="cart-page catalogue-inner">
        {loading ? <p role="status">Loading your bag…</p> : null}
        {error ? (
          <p role="alert" className="catalogue-state-inline">
            {error}
          </p>
        ) : null}
        {!loading && !cart?.items.length ? (
          <div className="cart-empty">
            <h2>Your bag is empty</h2>
            <p>Continue exploring the collection.</p>
            <Link className="catalogue-link" href="/shop">
              Continue shopping →
            </Link>
          </div>
        ) : null}
        {cart?.items.length ? (
          <div className="cart-page__layout">
            <div className="cart-page__items">
              {cart.items.map((item) => (
                <article className="cart-page__item" key={item.id}>
                  {item.thumbnail ? (
                    <img className="cart-page__image" src={item.thumbnail} alt="" />
                  ) : null}
                  <div>
                    <h2>{item.productTitle}</h2>
                    <p>{item.variantTitle}</p>
                    <p>{formatMoney(item.unitPrice)}</p>
                  </div>
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
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      disabled={pendingItemId === item.id}
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <strong>{formatMoney(item.total)}</strong>
                </article>
              ))}
            </div>
            <aside className="cart-page__summary">
              <span>Items subtotal</span>
              <strong>{formatMoney(cart.itemSubtotal)}</strong>
              <span>Shipping</span>
              <strong>{formatMoney(cart.shippingTotal)}</strong>
              <span>Total</span>
              <strong>{formatMoney(cart.subtotal)}</strong>
              <Link className="catalogue-link" href="/checkout">
                <Button type="button">Checkout</Button>
              </Link>
              <Link className="catalogue-link" href="/shop">
                Continue shopping →
              </Link>
            </aside>
          </div>
        ) : null}
      </section>
    </CatalogueShell>
  );
}
