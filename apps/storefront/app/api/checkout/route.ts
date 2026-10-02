import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getCheckoutSession,
  setCheckoutShippingMethod,
  updateCheckoutDetails,
} from "../../../lib/checkout-server";

const CART_COOKIE = "fenomena_cart_id";

type MedusaRequestError = Error & { status?: number };

function failure(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function staleCartFailure(error: unknown) {
  const status =
    error && typeof error === "object" && "status" in error
      ? (error as MedusaRequestError).status
      : undefined;
  const isStale = status === 404;
  const response = failure(
    error instanceof Error ? error.message : "Unable to update checkout.",
    isStale ? 404 : 400,
  );
  if (isStale) response.cookies.delete(CART_COOKIE);
  return response;
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as {
      email?: string;
      shippingAddress?: Record<string, unknown>;
      shippingOptionId?: string;
    };
  } catch {
    throw new Error("Checkout details must be valid JSON.");
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) {
    return failure("Your bag is empty. Add an item before checkout.", 400);
  }

  try {
    const session = await getCheckoutSession(cartId);
    return NextResponse.json(session);
  } catch (error) {
    return staleCartFailure(error);
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) {
    return failure("Your bag is empty. Add an item before checkout.", 400);
  }

  try {
    const body = await readBody(request);
    const session = await updateCheckoutDetails(cartId, {
      email: body.email,
      shippingAddress: (body.shippingAddress as never) ?? {},
      shippingOptionId: body.shippingOptionId ?? "",
    });

    if (body.shippingOptionId) {
      const shippingSession = await setCheckoutShippingMethod(cartId, body.shippingOptionId);
      return NextResponse.json(shippingSession);
    }

    return NextResponse.json(session);
  } catch (error) {
    return staleCartFailure(error);
  }
}
