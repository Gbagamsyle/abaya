"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";
import type { CartMoney } from "../lib/cart-types";
import { formatMoney } from "../lib/cart-types";
import { stripePromise } from "../lib/stripe-client";

type ApiResponse = {
  clientSecret?: string;
  providerId?: string;
  total?: CartMoney;
  requiresAction?: boolean;
  orderReference?: string;
  error?: string;
};

export default function StripePaymentForm({ total }: { total: CartMoney }) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [providerId, setProviderId] = useState<string>();
  const [sessionTotal, setSessionTotal] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function initializePayment() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/checkout/payment-session", { method: "POST" });
      const payload = (await response.json()) as ApiResponse;
      const isSystemProvider = payload.providerId?.startsWith("pp_system_");
      if (!response.ok || (!payload.clientSecret && !isSystemProvider)) {
        throw new Error(payload.error ?? "Secure payment could not be prepared.");
      }
      setClientSecret(payload.clientSecret);
      setProviderId(payload.providerId);
      if (payload.total) setSessionTotal(payload.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Secure payment could not be prepared.");
    } finally {
      setLoading(false);
    }
  }

  const isManualProvider =
    providerId === "pp_system" ||
    providerId === "pp_system_default" ||
    providerId?.startsWith("pp_system_");

  if (isManualProvider && providerId) {
    return (
      <ManualPaymentForm total={sessionTotal} providerId={providerId} onRetry={initializePayment} />
    );
  }

  const stripeConfigured = Boolean(stripePromise);

  return (
    <section
      aria-labelledby="payment-heading"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <h2 id="payment-heading">{stripeConfigured ? "Secure card payment" : "Payment method"}</h2>
        <p>
          {stripeConfigured
            ? "Payment is processed by Stripe. Your card details are never sent to this storefront."
            : "Checking which Medusa payment provider is available for this order."}
        </p>
      </div>
      {stripeConfigured && clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <StripePaymentFields total={sessionTotal} />
        </Elements>
      ) : (
        <button type="button" onClick={initializePayment} disabled={loading}>
          {loading
            ? "Preparing payment…"
            : stripeConfigured
              ? `Continue to pay ${formatMoney(total)}`
              : `Check payment provider · ${formatMoney(total)}`}
        </button>
      )}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ManualPaymentForm({
  total,
  providerId,
  onRetry,
}: {
  total: CartMoney;
  providerId: string;
  onRetry: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function completeOrder() {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/checkout/complete", { method: "POST" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error ?? "Order completion is pending.");
      const target = payload.orderReference
        ? `/checkout/confirmation?reference=${encodeURIComponent(payload.orderReference)}`
        : "/checkout/confirmation";
      window.location.assign(target);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Order completion is pending. Retry shortly.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="manual-payment-heading"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <h2 id="manual-payment-heading">Demo checkout</h2>
        <p>
          Medusa is using the built-in {providerId} payment provider. This order is marked as paid
          without a real external payment provider.
        </p>
      </div>
      <p>
        Total due: <strong>{formatMoney(total)}</strong>
      </p>
      <button type="button" onClick={completeOrder} disabled={submitting}>
        {submitting ? "Completing demo order…" : `Complete order · ${formatMoney(total)}`}
      </button>
      <button type="button" onClick={() => void onRetry()} disabled={submitting}>
        Refresh payment status
      </button>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}

function StripePaymentFields({ total }: { total: CartMoney }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string>();

  async function completeOrder() {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/checkout/complete", { method: "POST" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error ?? "Order completion is pending.");
      const target = payload.orderReference
        ? `/checkout/confirmation?reference=${encodeURIComponent(payload.orderReference)}`
        : "/checkout/confirmation";
      window.location.assign(target);
    } catch (reason) {
      setAuthorized(true);
      setError(
        reason instanceof Error ? reason.message : "Order completion is pending. Retry shortly.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPayment() {
    if (authorized) {
      await completeOrder();
      return;
    }
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(undefined);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/checkout/complete` },
        redirect: "if_required",
      });

      if (result.error) {
        setError(
          result.error.message ??
            "The payment could not be confirmed. Check your details and retry.",
        );
        return;
      }

      const status = result.paymentIntent?.status;
      if (status !== "succeeded" && status !== "requires_capture") {
        setError(
          "Stripe has not authorized this payment yet. Retry after checking your payment method.",
        );
        return;
      }

      setAuthorized(true);
      await completeOrder();
    } catch {
      setError("Payment confirmation could not be completed. Check the payment form and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PaymentElement />
      <p style={{ margin: 0 }}>
        Total due: <strong>{formatMoney(total)}</strong>
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
          {error}
        </p>
      ) : null}
      <button type="button" onClick={confirmPayment} disabled={!stripe || !elements || submitting}>
        {submitting
          ? "Confirming…"
          : authorized
            ? "Retry order confirmation"
            : `Authorize payment · ${formatMoney(total)}`}
      </button>
    </div>
  );
}
