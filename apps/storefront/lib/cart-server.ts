import Medusa from "@medusajs/js-sdk";
import type { StorefrontCart, StorefrontCartItem } from "./cart-types";

type MedusaCart = {
  id: string;
  items?: Array<{
    id: string;
    variant_id?: string;
    title?: string;
    product_title?: string;
    quantity: number;
    unit_price?: number;
    item_total?: number;
    item_subtotal?: number;
    original_total?: number;
    subtotal?: number;
    total?: number;
    currency_code?: string;
    thumbnail?: string;
    variant?: {
      id?: string;
      title?: string;
      options?: Array<{ option?: { title?: string }; title?: string; value?: string }>;
    };
    variant_option_values?: Record<string, unknown>;
    product?: { title?: string; thumbnail?: string };
  }>;
  subtotal?: number;
  item_subtotal?: number;
  shipping_total?: number;
  total?: number;
  currency_code?: string;
};

function configured() {
  const baseUrl = process.env.MEDUSA_BACKEND_URL;
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY;
  const regionId = process.env.MEDUSA_REGION_ID;
  if (!baseUrl || !publishableKey || !regionId) {
    throw new Error(
      "Medusa cart is not configured. Set MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, and MEDUSA_REGION_ID.",
    );
  }
  return { baseUrl, publishableKey, regionId };
}

function sdk() {
  const { baseUrl, publishableKey } = configured();
  return new Medusa({ baseUrl, publishableKey });
}

function query() {
  return {
    fields:
      "+items.*,*items.product,*items.variant,*items.variant.options,subtotal,item_subtotal,shipping_total,total",
  };
}

function money(amount: number | undefined, currency: string | undefined) {
  return {
    amount: typeof amount === "number" && Number.isFinite(amount) ? amount / 100 : 0,
    currency: (currency ?? "myr").toUpperCase(),
  };
}

export function transformCart(source: MedusaCart): StorefrontCart {
  const currency = source.currency_code ?? "myr";
  const items: StorefrontCartItem[] = (source.items ?? []).map((item) => {
    const options = item.variant_option_values
      ? Object.fromEntries(
          Object.entries(item.variant_option_values).flatMap(([name, value]) =>
            typeof value === "string" ? [[name, value]] : [],
          ),
        )
      : Object.fromEntries(
          (item.variant?.options ?? []).flatMap((option) => {
            const name = option.option?.title ?? option.title;
            return name && option.value ? [[name, option.value]] : [];
          }),
        );
    return {
      id: item.id,
      variantId: item.variant_id ?? item.variant?.id ?? "",
      productTitle: item.product?.title ?? item.product_title ?? item.title ?? "Product",
      variantTitle: item.variant?.title ?? item.title ?? "Variant",
      options,
      thumbnail: item.thumbnail ?? item.product?.thumbnail,
      quantity: item.quantity,
      unitPrice: money(item.unit_price, item.currency_code ?? currency),
      total: money(
        item.total ?? item.item_total ?? item.item_subtotal ?? item.subtotal,
        item.currency_code ?? currency,
      ),
    };
  });
  return {
    id: source.id,
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal: money(source.subtotal, currency),
    itemSubtotal: money(source.item_subtotal, currency),
    shippingTotal: money(source.shipping_total, currency),
    total: money(source.total, currency),
  };
}

export async function createCart() {
  const { regionId } = configured();
  const { cart } = await sdk().store.cart.create({ region_id: regionId }, query());
  return transformCart(cart as unknown as MedusaCart);
}

export async function getCart(id: string) {
  const { cart } = await sdk().store.cart.retrieve(id, query());
  return transformCart(cart as unknown as MedusaCart);
}

export async function addLineItem(cartId: string, variantId: string, quantity: number) {
  const { cart } = await sdk().store.cart.createLineItem(
    cartId,
    { variant_id: variantId, quantity },
    query(),
  );
  return transformCart(cart as unknown as MedusaCart);
}

export async function updateLineItem(cartId: string, lineItemId: string, quantity: number) {
  const { cart } = await sdk().store.cart.updateLineItem(cartId, lineItemId, { quantity }, query());
  return transformCart(cart as unknown as MedusaCart);
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  const response = await sdk().store.cart.deleteLineItem(cartId, lineItemId, query());
  return transformCart(response.parent as unknown as MedusaCart);
}
