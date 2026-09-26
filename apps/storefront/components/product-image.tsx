import Image from "next/image";

export type ImageRatio =
  "product" | "editorial-portrait" | "editorial-landscape" | "collection" | "social-square";

export function ProductImage({
  src,
  alt,
  ratio = "product",
  sizes = "(max-width: 760px) 50vw, (max-width: 1200px) 33vw, 25vw",
  priority = false,
  blurDataURL,
  position = "center",
  className = "",
}: {
  src?: string;
  alt: string;
  ratio?: ImageRatio;
  sizes?: string;
  priority?: boolean;
  blurDataURL?: string;
  position?: string;
  className?: string;
}) {
  return (
    <span className={`ui-image-frame ui-image-frame--${ratio} ${className}`.trim()}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder={blurDataURL ? "blur" : "empty"}
          blurDataURL={blurDataURL}
          style={{ objectPosition: position }}
        />
      ) : (
        <span
          className="ui-image-placeholder"
          role="img"
          aria-label={alt || "Product image unavailable"}
        >
          <span aria-hidden="true">Image preview</span>
        </span>
      )}
    </span>
  );
}
