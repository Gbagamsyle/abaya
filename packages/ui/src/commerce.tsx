"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Badge, Button, IconButton } from "./primitives";

function clampQuantity(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value) || minimum > maximum) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function ProductPrice({
  amount,
  currency,
  compareAt,
}: {
  amount: number;
  currency: string;
  compareAt?: number;
}) {
  const format = (value: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
  return (
    <span className="ui-product-price">
      <span className="ui-visually-hidden">Price </span>
      <span>{format(amount)}</span>
      {compareAt !== undefined && compareAt > amount && <del>{format(compareAt)}</del>}
    </span>
  );
}

export function ProductBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function ColourSwatch({
  name,
  color,
  selected = false,
  onSelect,
}: {
  name: string;
  color: string;
  selected?: boolean;
  onSelect?: (name: string) => void;
}) {
  return (
    <button
      className={`ui-swatch${selected ? " is-selected" : ""}`}
      type="button"
      aria-label={`${name}${selected ? ", selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect?.(name)}
    >
      <span style={{ "--swatch-color": color } as CSSProperties} aria-hidden="true" />
    </button>
  );
}

export function SizeSelector({
  label = "Choose a size",
  sizes,
  value,
  onChange,
}: {
  label?: string;
  sizes: string[];
  value?: string;
  onChange?: (size: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const selected = value ?? internalValue;
  return (
    <fieldset className="ui-size-selector">
      <legend>
        {label}
        {selected && <span className="ui-size-selector__value">: {selected}</span>}
      </legend>
      <div className="ui-size-selector__options">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            className="ui-size-option"
            aria-pressed={selected === size}
            onClick={() => {
              setInternalValue(size);
              onChange?.(size);
            }}
          >
            {size}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function QuantitySelector({
  value,
  defaultValue = 1,
  min = 1,
  max = 99,
  onChange,
  label = "Quantity",
}: {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (quantity: number) => void;
  label?: string;
}) {
  const [internal, setInternal] = useState(clampQuantity(defaultValue, min, max));
  const quantity = clampQuantity(value ?? internal, min, max);
  const update = (next: number) => {
    const bounded = clampQuantity(next, min, max);
    setInternal(bounded);
    onChange?.(bounded);
  };
  return (
    <div className="ui-quantity" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= min}
        onClick={() => update(quantity - 1)}
      >
        −
      </button>
      <output aria-live="polite">{quantity}</output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={quantity >= max}
        onClick={() => update(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}

export function StockIndicator({
  status,
  label,
}: {
  status: "available" | "unavailable" | "unknown";
  label?: string;
}) {
  const fallback = {
    available: "Available",
    unavailable: "Unavailable",
    unknown: "Check availability",
  }[status];
  return (
    <span className={`ui-stock ui-stock--${status}`}>
      <span aria-hidden="true" />
      {label ?? fallback}
    </span>
  );
}

export interface ProductCardProps {
  name: string;
  href: string;
  price: number;
  currency: string;
  compareAt?: number;
  badge?: string;
  colours?: readonly { name: string; color: string }[];
  social?: {
    platform: "TikTok" | "Instagram" | "Telegram";
    url?: string;
    metric?: number;
    verified: boolean;
  };
  media: ReactNode;
  secondaryMedia?: ReactNode;
}

export function ProductCard({
  name,
  href,
  price,
  currency,
  compareAt,
  badge,
  colours = [],
  social,
  media,
  secondaryMedia,
}: ProductCardProps) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="ui-product-card">
      <div className="ui-product-card__media">
        <a className="ui-product-card__image-link" href={href} aria-label={`View ${name}`}>
          <span className="ui-product-card__primary-media">{media}</span>
          {secondaryMedia && (
            <span className="ui-product-card__secondary-media">{secondaryMedia}</span>
          )}
        </a>
        {badge && (
          <span className="ui-product-card__badge">
            <ProductBadge>{badge}</ProductBadge>
          </span>
        )}
        <IconButton
          className="ui-product-card__wishlist"
          label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          aria-pressed={saved}
          onClick={() => setSaved(!saved)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M20.8 8.7c0 5-8.8 10.2-8.8 10.2S3.2 13.7 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
          </svg>
        </IconButton>
      </div>
      <div className="ui-product-card__body">
        <a className="ui-product-card__title" href={href}>
          {name}
        </a>
        <ProductPrice amount={price} currency={currency} compareAt={compareAt} />
        {colours.length > 0 && (
          <div
            className="ui-product-card__swatches"
            aria-label={`${colours.length} colour options`}
          >
            {colours.slice(0, 5).map((colour) => (
              <ColourSwatch key={colour.name} {...colour} />
            ))}
            {colours.length > 5 && (
              <span className="ui-product-card__more-colours">+{colours.length - 5}</span>
            )}
          </div>
        )}
        {social && <SocialProof {...social} />}
      </div>
    </article>
  );
}

export function SocialProof({
  platform,
  url,
  metric,
  verified,
}: {
  platform: "TikTok" | "Instagram" | "Telegram";
  url?: string;
  metric?: number;
  verified: boolean;
}) {
  const content = (
    <>
      <span className="ui-social-proof__marker" aria-hidden="true">
        ✳
      </span>
      {verified ? `Seen on ${platform}` : `${platform} feature`}
      {verified && metric !== undefined && (
        <span className="ui-social-proof__metric">
          {` · ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(metric)}`}
        </span>
      )}
    </>
  );
  const safeUrl = getSafeExternalUrl(url);
  return verified && safeUrl ? (
    <a className="ui-social-proof" href={safeUrl} target="_blank" rel="noreferrer">
      {content}
      <span className="ui-visually-hidden">, externally linked</span>
    </a>
  ) : (
    <span className="ui-social-proof">{content}</span>
  );
}

function getSafeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const candidate = new URL(value);
    if (
      (candidate.protocol !== "https:" && candidate.protocol !== "http:") ||
      candidate.username ||
      candidate.password
    ) {
      return undefined;
    }
    return candidate.toString();
  } catch {
    return undefined;
  }
}

export function StickyMobilePurchaseBar({
  price,
  currency,
  label = "Add to bag",
  disabled = false,
  loading = false,
  onPurchase,
}: {
  price: number;
  currency: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onPurchase?: () => void;
}) {
  return (
    <div className="ui-sticky-purchase">
      <span className="ui-sticky-purchase__price">
        <ProductPrice amount={price} currency={currency} />
      </span>
      <Button size="md" disabled={disabled} loading={loading} onClick={onPurchase}>
        {label}
      </Button>
    </div>
  );
}
