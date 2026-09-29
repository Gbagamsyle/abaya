import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addLineItem, createCart, getCart } from "../../../lib/cart-server";

const CART_COOKIE = "fenomena_cart_id";

function failure(error: unknown) {
  void error;
  return NextResponse.json(
    { error: "The commerce service is unavailable. Please try again." },
    { status: 502 },
  );
}

export async function GET() {
  const cookieStore = await cookies();
  const id = cookieStore.get(CART_COOKIE)?.value;
  if (!id) return NextResponse.json({ cart: null });
  try {
    return NextResponse.json({ cart: await getCart(id) });
  } catch {
    const response = NextResponse.json({ cart: null });
    response.cookies.delete(CART_COOKIE);
    return response;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { variantId?: string; quantity?: number };
    if (
      typeof body.variantId !== "string" ||
      !Number.isInteger(body.quantity) ||
      (body.quantity ?? 0) < 1
    ) {
      return NextResponse.json(
        { error: "Choose a valid product option and quantity." },
        { status: 400 },
      );
    }
    const variantId = body.variantId;
    const quantity = body.quantity;
    const cookieStore = await cookies();
    let id = cookieStore.get(CART_COOKIE)?.value;
    let cart = id ? await getCart(id).catch(() => undefined) : undefined;
    if (!cart) {
      cart = await createCart();
      id = cart.id;
    }
    if (!id) throw new Error("Cart creation did not return an identifier.");
    cart = await addLineItem(id, variantId, quantity as number);
    const cartId = id;
    const response = NextResponse.json({ cart });
    response.cookies.set(CART_COOKIE, cartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
