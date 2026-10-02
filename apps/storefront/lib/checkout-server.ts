import Medusa from "@medusajs/js-sdk";
import type { CartMoney, StorefrontCart } from "./cart-types";
import { createIdempotencyGate } from "./idempotency";
import { getCart } from "./cart-server";

export type CheckoutAddress = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  country_code?: string;
  province?: string;
  postal_code?: string;
};

export type CheckoutPayload = {
  email: string;
  shippingAddress: CheckoutAddress;
  shippingOptionId: string;
};

export type CheckoutShippingOption = {
  id: string;
  name: string;
  amount: number;
  currency: string;
};

export type CheckoutValidationResult = {
  valid: boolean;
  clean?: CheckoutPayload;
  errors: string[];
};

export const STRIPE_PROVIDER_ID = "pp_stripe_stripe";

export type PaymentReadyCart = {
  id: string;
  email?: string;
  items?: unknown[];
  shipping_methods?: unknown[];
  total?: number;
  currency_code?: string;
  payment_collection?: {
    payment_sessions?: Array<{
      provider_id?: string;
      data?: Record<string, unknown>;
    }>;
  };
};

export type CheckoutCompletion =
  { type: "order"; orderId: string; displayId?: number } | { type: "cart"; message: string };

const runCheckoutCompletion = createIdempotencyGate<CheckoutCompletion>(
  (result) => result.type === "order",
);

export function validatePaymentReadyCart(cart: PaymentReadyCart) {
  if (!cart.items?.length) throw new Error("Your bag is empty.");
  if (!cart.email || !cart.shipping_methods?.length) {
    throw new Error("Complete your contact and delivery details before payment.");
  }
  if (!Number.isFinite(cart.total) || (cart.total ?? 0) <= 0) {
    throw new Error("This order total cannot be paid by card.");
  }
}

function configured() {
  const baseUrl = process.env.MEDUSA_BACKEND_URL;
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) {
    throw new Error(
      "Medusa checkout is not configured. Set MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_KEY.",
    );
  }
  return { baseUrl, publishableKey };
}

function sdk() {
  const { baseUrl, publishableKey } = configured();
  return new Medusa({ baseUrl, publishableKey });
}

function moneyFromCents(
  amount: number | string | undefined,
  currency: string | undefined,
): CartMoney {
  return {
    amount: typeof amount === "number" ? amount / 100 : Number(amount ?? 0) / 100,
    currency: (currency ?? "myr").toUpperCase(),
  };
}

function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCheckoutPayload(
  payload: Partial<CheckoutPayload>,
): CheckoutValidationResult {
  const errors: string[] = [];
  const email = trimmed(payload.email).toLowerCase();
  const shippingAddress = payload.shippingAddress ?? {};
  const firstName = trimmed(shippingAddress.first_name);
  const lastName = trimmed(shippingAddress.last_name);
  const address1 = trimmed(shippingAddress.address_1);
  const city = trimmed(shippingAddress.city);
  const countryCode = trimmed(shippingAddress.country_code).toLowerCase();
  const postalCode = trimmed(shippingAddress.postal_code);
  const shippingOptionId = trimmed(payload.shippingOptionId);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.");
  }
  if (!firstName || !lastName) {
    errors.push("Add the full name for delivery.");
  }
  if (!address1 || !city || !countryCode || !postalCode) {
    errors.push("Complete the shipping address before continuing.");
  }
  if (!shippingOptionId) {
    errors.push("Choose a shipping option.");
  }

  return {
    valid: errors.length === 0,
    errors,
    clean:
      errors.length === 0
        ? {
            email,
            shippingAddress: {
              ...shippingAddress,
              first_name: firstName,
              last_name: lastName,
              phone: trimmed(shippingAddress.phone),
              company: trimmed(shippingAddress.company),
              address_1: address1,
              address_2: trimmed(shippingAddress.address_2),
              city,
              country_code: countryCode,
              province: trimmed(shippingAddress.province),
              postal_code: postalCode,
            },
            shippingOptionId,
          }
        : undefined,
  };
}

export async function getCheckoutSession(cartId: string): Promise<{
  cart: StorefrontCart;
  shippingOptions: CheckoutShippingOption[];
}> {
  const cart = await getCart(cartId);
  if (!cart.items.length) throw new Error("Your bag is empty.");

  const { shipping_options = [] } = await sdk().store.fulfillment.listCartOptions({
    cart_id: cartId,
    fields: "id,name,amount,currency_code,price_type,calculated_price.*",
  } as never);

  const normalizedShippingOptions = (
    shipping_options as unknown as Array<Record<string, unknown>>
  ).map((option) => {
    const calculatedPrice = option.calculated_price as
      { calculated_amount?: number; currency_code?: string } | undefined;
    return {
      id: String(option.id ?? ""),
      name: String(option.name ?? "Delivery"),
      amount: Number(calculatedPrice?.calculated_amount ?? option.amount ?? 0),
      currency: String(
        calculatedPrice?.currency_code ?? option.currency_code ?? cart.total.currency ?? "MYR",
      ),
    };
  });

  return {
    cart,
    shippingOptions: normalizedShippingOptions,
  };
}

export async function updateCheckoutDetails(cartId: string, payload: Partial<CheckoutPayload>) {
  const validation = validateCheckoutPayload(payload);
  if (!validation.valid || !validation.clean) {
    throw new Error(validation.errors.join(" "));
  }

  await sdk().store.cart.update(cartId, {
    email: validation.clean.email,
    shipping_address: {
      ...validation.clean.shippingAddress,
      country_code: validation.clean.shippingAddress.country_code,
      postal_code: validation.clean.shippingAddress.postal_code,
      address_1: validation.clean.shippingAddress.address_1,
      city: validation.clean.shippingAddress.city,
      first_name: validation.clean.shippingAddress.first_name,
      last_name: validation.clean.shippingAddress.last_name,
      phone: validation.clean.shippingAddress.phone,
      province: validation.clean.shippingAddress.province,
    },
    billing_address: {
      ...validation.clean.shippingAddress,
      country_code: validation.clean.shippingAddress.country_code,
      postal_code: validation.clean.shippingAddress.postal_code,
      address_1: validation.clean.shippingAddress.address_1,
      city: validation.clean.shippingAddress.city,
      first_name: validation.clean.shippingAddress.first_name,
      last_name: validation.clean.shippingAddress.last_name,
      phone: validation.clean.shippingAddress.phone,
      province: validation.clean.shippingAddress.province,
    },
  } as never);

  return getCheckoutSession(cartId);
}

export async function setCheckoutShippingMethod(cartId: string, shippingOptionId: string) {
  const optionId = trimmed(shippingOptionId);
  if (!optionId) throw new Error("Choose a shipping option.");

  await sdk().store.cart.addShippingMethod(cartId, { option_id: optionId } as never);
  return getCheckoutSession(cartId);
}

export function formatCheckoutMoney(amount: number, currency: string) {
  return moneyFromCents(amount, currency);
}

export async function createStripePaymentSession(cartId: string): Promise<{
  clientSecret: string;
  total: CartMoney;
}> {
  const { cart: source } = await sdk().store.cart.retrieve(cartId, {
    fields:
      "id,email,total,items.id,shipping_methods.id,*payment_collection,*payment_collection.payment_sessions",
  } as never);
  const cart = source as unknown as PaymentReadyCart;
  validatePaymentReadyCart(cart);

  const { payment_collection: collection } = await sdk().store.payment.initiatePaymentSession(
    cart as never,
    { provider_id: STRIPE_PROVIDER_ID },
    { fields: "id,*payment_sessions" } as never,
  );
  const session = (collection.payment_sessions ?? []).find(
    (candidate) => candidate.provider_id === STRIPE_PROVIDER_ID,
  );
  const clientSecret = session?.data?.client_secret;
  if (typeof clientSecret !== "string" || !clientSecret) {
    throw new Error("Medusa did not return a Stripe payment session.");
  }

  return {
    clientSecret,
    total: moneyFromCents(cart.total, cart.currency_code),
  };
}

async function completeMedusaCart(cartId: string): Promise<CheckoutCompletion> {
  const result = (await sdk().store.cart.complete(cartId, {
    fields: "id,display_id,email,total,currency_code,created_at",
  } as never)) as unknown as {
    type: "cart" | "order";
    error?: { message?: string };
    order?: { id?: string; display_id?: number };
  };

  if (result.type !== "order" || !result.order?.id) {
    return {
      type: "cart",
      message: result.error?.message ?? "Payment is not yet authorized. Retry in a moment.",
    };
  }

  return {
    type: "order",
    orderId: result.order.id,
    displayId: result.order.display_id,
  };
}

export function completeCheckoutCart(cartId: string): Promise<CheckoutCompletion> {
  return runCheckoutCompletion(cartId, () => completeMedusaCart(cartId));
}
