"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { stripePromise } from "../../../lib/stripe-client";

export default function CheckoutCompletePage() {
  const [message, setMessage] = useState("Verifying your payment with Stripe…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function finishRedirectedPayment() {
      const params = new URLSearchParams(window.location.search);
      const clientSecret = params.get("payment_intent_client_secret");
      window.history.replaceState(null, "", "/checkout/complete");

      if (!clientSecret || !stripePromise) {
        if (active) {
          setFailed(true);
          setMessage("We could not verify the payment redirect. Return to checkout and retry.");
        }
        return;
      }

      try {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe is not available.");
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
        if (
          error ||
          !paymentIntent ||
          !["succeeded", "requires_capture"].includes(paymentIntent.status)
        ) {
          throw new Error("Stripe has not confirmed payment authorization.");
        }

        const response = await fetch("/api/checkout/complete", { method: "POST" });
        const result = (await response.json()) as { orderReference?: string; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Order completion is pending.");
        if (!active) return;
        const target = result.orderReference
          ? `/checkout/confirmation?reference=${encodeURIComponent(result.orderReference)}`
          : "/checkout/confirmation";
        window.location.replace(target);
      } catch (reason) {
        if (active) {
          setFailed(true);
          setMessage(
            reason instanceof Error
              ? reason.message
              : "We could not verify the payment. Return to checkout and retry.",
          );
        }
      }
    }

    void finishRedirectedPayment();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1>{failed ? "Payment needs attention" : "Confirming your order"}</h1>
      <p role={failed ? "alert" : "status"}>{message}</p>
      {failed ? <Link href="/checkout">Return to checkout</Link> : null}
    </main>
  );
}
