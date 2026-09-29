import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { removeLineItem, updateLineItem } from "../../../../lib/cart-server";

const CART_COOKIE = "fenomena_cart_id";

async function cartId() {
  return (await cookies()).get(CART_COOKIE)?.value;
}

function invalid() {
  return NextResponse.json(
    { error: "Your bag is no longer available. Please start again." },
    { status: 404 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lineItemId: string }> },
) {
  const id = await cartId();
  if (!id) return invalid();
  try {
    const body = (await request.json()) as { quantity?: number };
    if (
      typeof body.quantity !== "number" ||
      !Number.isInteger(body.quantity) ||
      body.quantity < 1
    ) {
      return NextResponse.json({ error: "Quantity must be at least one." }, { status: 400 });
    }
    const quantity = body.quantity;
    const { lineItemId } = await params;
    return NextResponse.json({ cart: await updateLineItem(id, lineItemId, quantity) });
  } catch (error) {
    void error;
    return NextResponse.json(
      { error: "Unable to update your bag. Please try again." },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ lineItemId: string }> },
) {
  const id = await cartId();
  if (!id) return invalid();
  try {
    const { lineItemId } = await params;
    return NextResponse.json({ cart: await removeLineItem(id, lineItemId) });
  } catch (error) {
    void error;
    return NextResponse.json(
      { error: "Unable to remove that item. Please try again." },
      { status: 502 },
    );
  }
}
