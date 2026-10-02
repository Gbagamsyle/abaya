import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completeCheckoutCart } from "../../../../lib/checkout-server";

const CART_COOKIE = "fenomena_cart_id";

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
    return NextResponse.json({ error: "Your checkout session has expired." }, { status: 404 });
  }

  try {
    const result = await completeCheckoutCart(cartId);
    if (result.type !== "order") {
      return NextResponse.json(
        { error: "Medusa has not confirmed payment authorization. Please retry shortly." },
        { status: 409, headers: { "Cache-Control": "no-store, private" } },
      );
    }

    const response = NextResponse.json(
      { orderReference: result.displayId ? String(result.displayId) : undefined },
      { headers: { "Cache-Control": "no-store, private" } },
    );
    response.cookies.delete(CART_COOKIE);
    return response;
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as MedusaRequestError).status
        : undefined;
    const isStale = status === 404;
    const response = NextResponse.json(
      {
        error: isStale
          ? "Your checkout session has expired. Return to your bag."
          : "Order completion could not be confirmed. Your bag is still available to retry.",
      },
      {
        status: isStale ? 404 : 502,
        headers: { "Cache-Control": "no-store, private" },
      },
    );
    if (isStale) response.cookies.delete(CART_COOKIE);
    return response;
  }
}
