export type CartMoney = {
  amount: number;
  currency: string;
};

export type StorefrontCartItem = {
  id: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  options: Record<string, string>;
  thumbnail?: string;
  quantity: number;
  unitPrice: CartMoney;
  total: CartMoney;
};

export type StorefrontCart = {
  id: string;
  items: StorefrontCartItem[];
  itemCount: number;
  subtotal: CartMoney;
  total: CartMoney;
};

export function cartItemCount(cart: Pick<StorefrontCart, "items"> | undefined): number {
  return cart?.items.reduce((count, item) => count + item.quantity, 0) ?? 0;
}

export function formatMoney(money: CartMoney): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: money.currency.toUpperCase(),
  }).format(money.amount);
}
