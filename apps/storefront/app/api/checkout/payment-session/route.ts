import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createStripePaymentSession } from "../../../../lib/checkout-server";

const CART_COOKIE = "fenomena_cart_id";
const SAFE_CHECKOUT_ERRORS = new Set([
  "Your bag is empty.",
  "Complete your contact and delivery details before payment.",
  "This order total cannot be paid by card.",
  "No payment provider is configured for this checkout. Ensure the Malaysia region includes a Medusa system payment provider (pp_system_default) or a Stripe provider.",
]);

type MedusaRequestError = Error & { status?: number };

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) {
    return NextResponse.json(
      { error: "Your bag is empty. Add an item before checkout." },
      { status: 400 },
    );
  }

  try {
    const payment = await createStripePaymentSession(cartId);
    return NextResponse.json(payment, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as MedusaRequestError).status
        : undefined;
    const isStale = status === 404;
    const safeMessage =
      error instanceof Error && SAFE_CHECKOUT_ERRORS.has(error.message)
        ? error.message
        : isStale
          ? "Your checkout expired. Return to your bag and try again."
          : "Secure payment could not be prepared. Please retry.";
    const response = NextResponse.json(
      { error: safeMessage },
      { status: isStale ? 404 : SAFE_CHECKOUT_ERRORS.has(safeMessage) ? 409 : 502 },
    );
    response.headers.set("Cache-Control", "no-store, private");
    if (isStale) response.cookies.delete(CART_COOKIE);
    return response;
  }
}
