"use client";

import { Button, ProductPrice, StockIndicator } from "@fenomena/ui";
import { useMemo, useState } from "react";
import { getAvailableOptionValues, resolveVariant } from "../lib/catalogue-logic";
import type { StorefrontProduct } from "../lib/domain";
import { createWhatsAppOrderUrl } from "../lib/whatsapp";
import { useCart } from "./cart-provider";

function initialSelection(product: StorefrontProduct) {
  const firstAvailable =
    product.variants.find((variant) => variant.availability === "available") ?? product.variants[0];
  return firstAvailable ? { ...firstAvailable.options } : {};
}

export function ProductVariantPurchase({
  product,
  whatsappPhone,
  siteUrl,
}: {
  product: StorefrontProduct;
  whatsappPhone?: string;
  siteUrl?: string;
}) {
  const [selection, setSelection] = useState(() => initialSelection(product));
  const { addItem, pendingItemId, error } = useCart();
  const optionNames = useMemo(
    () => [...new Set(product.variants.flatMap((variant) => Object.keys(variant.options)))],
    [product.variants],
  );
  const selectedVariant = resolveVariant(product, selection);
  const selectedOptionsCount = Object.values(selection).filter(Boolean).length;
  const completeSelection = selectedOptionsCount === optionNames.length;
  const availability =
    selectedVariant?.availability ?? (completeSelection ? "unavailable" : "unknown");
  const orderUrl = createWhatsAppOrderUrl(product, selectedVariant, {
    phone: whatsappPhone,
    siteUrl,
  });

  return (
    <div className="product-purchase-options">
      {optionNames.map((optionName) => {
        const values = [
          ...new Set(
            product.variants
              .map((variant) => variant.options[optionName])
              .filter((value): value is string => Boolean(value)),
          ),
        ];
        const availableValues = getAvailableOptionValues(product, selection, optionName);
        return (
          <label className="product-option-field" key={optionName}>
            <span>
              {optionName}: <strong>{selection[optionName] || "Choose"}</strong>
            </span>
            <select
              value={selection[optionName] ?? ""}
              onChange={(event) =>
                setSelection((current) => ({ ...current, [optionName]: event.target.value }))
              }
              aria-label={`Choose ${optionName.toLowerCase()}`}
            >
              <option value="" disabled>
                Choose {optionName.toLowerCase()}
              </option>
              {values.map((value) => {
                const available = availableValues.includes(value);
                return (
                  <option key={value} value={value} disabled={!available}>
                    {value}
                    {available ? "" : " — unavailable combination"}
                  </option>
                );
              })}
            </select>
          </label>
        );
      })}
      {selectedVariant?.price && (
        <ProductPrice
          amount={selectedVariant.price.amount}
          currency={selectedVariant.price.currency}
          compareAt={selectedVariant.compareAt?.amount}
        />
      )}
      <div className="product-page__cta">
        <Button
          type="button"
          disabled={
            product.isDemo || !completeSelection || availability !== "available" || !selectedVariant
          }
          loading={pendingItemId === selectedVariant?.id}
          onClick={() => selectedVariant && void addItem(selectedVariant.id)}
        >
          {product.isDemo
            ? "Unavailable in demo"
            : pendingItemId === selectedVariant?.id
              ? "Adding…"
              : "Add to bag"}
        </Button>
        <Button
          type="button"
          disabled={!completeSelection || availability !== "available" || !orderUrl}
          onClick={() => {
            if (orderUrl) window.open(orderUrl, "_blank", "noopener,noreferrer");
          }}
        >
          Order on WhatsApp
        </Button>
        <StockIndicator
          status={availability}
          label={
            availability === "available"
              ? "Available"
              : availability === "unavailable"
                ? "This option is unavailable"
                : "Select options to check availability"
          }
        />
      </div>
      {error ? (
        <p className="catalogue-state-inline" role="alert">
          {error}
        </p>
      ) : null}
      {!whatsappPhone || !siteUrl ? (
        <p className="catalogue-state-inline">
          WhatsApp ordering is not configured for this environment.
        </p>
      ) : null}
    </div>
  );
}
