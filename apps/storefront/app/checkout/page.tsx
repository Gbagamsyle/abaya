"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney, type StorefrontCart } from "../../lib/cart-types";

type ShippingOption = {
  id: string;
  name: string;
  amount: number;
  currency: string;
};

type CheckoutFormState = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  address_2: string;
  city: string;
  country_code: string;
  province: string;
  postal_code: string;
  shippingOptionId: string;
};

const emptyForm: CheckoutFormState = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  address_1: "",
  address_2: "",
  city: "",
  country_code: "my",
  province: "",
  postal_code: "",
  shippingOptionId: "",
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<StorefrontCart | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [form, setForm] = useState<CheckoutFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function loadCheckout() {
      try {
        const response = await fetch("/api/checkout");
        const payload = (await response.json()) as {
          cart?: StorefrontCart;
          shippingOptions?: ShippingOption[];
          error?: string;
        };
        if (!response.ok || !payload.cart) {
          throw new Error(payload.error ?? "Unable to load checkout.");
        }
        setCart(payload.cart);
        setShippingOptions(payload.shippingOptions ?? []);
        setForm((current) => ({
          ...current,
          email: payload.cart?.items?.length ? current.email : "",
          shippingOptionId: payload.shippingOptions?.[0]?.id ?? current.shippingOptionId,
        }));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to load checkout.");
      } finally {
        setLoading(false);
      }
    }
    void loadCheckout();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          shippingAddress: {
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            address_1: form.address_1,
            address_2: form.address_2,
            city: form.city,
            country_code: form.country_code,
            province: form.province,
            postal_code: form.postal_code,
          },
          shippingOptionId: form.shippingOptionId,
        }),
      });
      const payload = (await response.json()) as {
        cart?: StorefrontCart;
        shippingOptions?: ShippingOption[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save checkout details.");
      }
      if (payload.cart) setCart(payload.cart);
      if (payload.shippingOptions) setShippingOptions(payload.shippingOptions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save checkout details.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <p>Loading checkout…</p>
      </main>
    );
  }

  if (!cart || !cart.items.length) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <p>Your bag is empty.</p>
        <Link href="/shop">Continue shopping →</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/cart">← Back to bag</Link>
      </div>
      <h1>Checkout</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
          gap: 24,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <h2>Contact</h2>
            <label style={{ display: "grid", gap: 6 }}>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <h2>Shipping address</h2>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                First name
                <input
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, first_name: event.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Last name
                <input
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, last_name: event.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                Phone
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                Address line 1
                <input
                  value={form.address_1}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address_1: event.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                Address line 2
                <input
                  value={form.address_2}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address_2: event.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                City
                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                State / Province
                <input
                  value={form.province}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, province: event.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Postal code
                <input
                  value={form.postal_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, postal_code: event.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Country code
                <input
                  value={form.country_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, country_code: event.target.value }))
                  }
                  required
                />
              </label>
            </div>
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <h2>Delivery method</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {shippingOptions.length ? (
                shippingOptions.map((option) => (
                  <label
                    key={option.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input
                        type="radio"
                        name="shippingOption"
                        checked={form.shippingOptionId === option.id}
                        onChange={() =>
                          setForm((current) => ({ ...current, shippingOptionId: option.id }))
                        }
                      />
                      <span>{option.name}</span>
                    </span>
                    <strong>
                      {formatMoney({ amount: option.amount / 100, currency: option.currency })}
                    </strong>
                  </label>
                ))
              ) : (
                <p>No delivery options are available for this bag yet.</p>
              )}
            </div>
          </section>

          {error ? (
            <p role="alert" style={{ color: "#b91c1c" }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            style={{ padding: "0.9rem 1.2rem", fontWeight: 700 }}
          >
            {submitting ? "Saving…" : "Review order"}
          </button>
        </form>

        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            alignSelf: "start",
          }}
        >
          <h2>Order review</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {cart.items.map((item) => (
              <div
                key={item.id}
                style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
              >
                <span>{item.productTitle}</span>
                <strong>{formatMoney(item.total)}</strong>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Items subtotal</span>
              <strong>{formatMoney(cart.itemSubtotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Shipping</span>
              <strong>{formatMoney(cart.shippingTotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
              <span>Total</span>
              <strong>{formatMoney(cart.total)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
