"use client";

import { useState } from "react";
import type { StorefrontMedia } from "../lib/domain";
import { ProductImage } from "./product-image";

export function ProductGallery({ title, media }: { title: string; media: StorefrontMedia[] }) {
  const [active, setActive] = useState(0);
  const current = media[active];
  if (!current) return <ProductImage ratio="product" alt={`${title} image unavailable`} />;

  return (
    <div className="product-gallery">
      <ProductImage
        src={current.url}
        ratio="product"
        sizes="(max-width: 820px) 100vw, 58vw"
        priority
        alt={current.alt || `${title} product image ${active + 1}`}
        className="product-gallery__main"
      />
      {media.length > 1 && (
        <div className="product-gallery__thumbnails" role="group" aria-label="Choose product image">
          {media.map((image, index) => (
            <button
              type="button"
              key={`${image.url ?? "image"}-${index}`}
              aria-label={`Show image ${index + 1}${image.alt ? `: ${image.alt}` : ""}`}
              aria-pressed={active === index}
              className={`product-gallery__thumbnail${active === index ? " is-active" : ""}`}
              onClick={() => setActive(index)}
            >
              <ProductImage src={image.url} ratio="product" alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
