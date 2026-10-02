"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CheckoutConfirmationPage() {
  const [reference, setReference] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("reference");
    if (value && /^\d+$/.test(value)) setReference(value);
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1>Order confirmed</h1>
      <p>Your payment was authorized and Medusa completed your order.</p>
      {reference ? (
        <p>
          Order reference: <strong>{reference}</strong>
        </p>
      ) : null}
      <Link href="/shop">Continue shopping →</Link>
    </main>
  );
}
