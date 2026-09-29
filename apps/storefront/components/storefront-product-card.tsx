import { ProductBadge, ProductPrice, SocialProof } from "@fenomena/ui";
import type { StorefrontProduct } from "../lib/domain";
import { ProductImage } from "./product-image";

export function StorefrontProductCard({ product }: { product: StorefrontProduct }) {
  const media = product.media[0];
  const social = product.socialProof.find((entry) => entry.verified);
  const colours = [
    ...new Set(
      product.variants.flatMap((variant) =>
        Object.entries(variant.options)
          .filter(([key]) => /colou?r/i.test(key))
          .map(([, value]) => value),
      ),
    ),
  ];
  return (
    <article className="ui-product-card storefront-product-card">
      <div className="ui-product-card__media">
        <a
          className="ui-product-card__image-link"
          href={`/products/${product.slug}`}
          aria-label={`View ${product.title}`}
        >
          <ProductImage
            src={media?.url}
            ratio="product"
            alt={media?.alt || `${product.title} product image`}
          />
        </a>
        <span className="ui-product-card__badge">
          <ProductBadge>{product.isDemo ? "Fictional demo" : "Explore"}</ProductBadge>
        </span>
      </div>
      <div className="ui-product-card__body">
        <a className="ui-product-card__title" href={`/products/${product.slug}`}>
          {product.title}
        </a>
        {product.price ? (
          <ProductPrice
            amount={product.price.amount}
            currency={product.price.currency}
            compareAt={product.compareAt?.amount}
          />
        ) : (
          <span className="storefront-product-card__price">Price unavailable</span>
        )}
        {colours.length > 0 && (
          <p className="storefront-product-card__options">{colours.length} colour options</p>
        )}
        {social && (
          <SocialProof
            platform={
              social.platform === "instagram"
                ? "Instagram"
                : social.platform === "tiktok"
                  ? "TikTok"
                  : "Telegram"
            }
            url={social.url}
            metric={social.metric}
            verified
          />
        )}
        {product.isDemo && (
          <p className="demo-disclaimer">
            Fictional QA content · not a real product, price, or stock offer.
          </p>
        )}
      </div>
    </article>
  );
}
