import Image from "next/image";
import { useId } from "react";

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
  const illustrationId = useId().replace(/:/g, "");
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
          className="ui-image-placeholder product-image-pending"
          role="img"
          aria-label={alt || "Product image unavailable"}
        >
          <svg aria-hidden="true" viewBox="0 0 600 760" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id={`${illustrationId}-backdrop`} x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#e9e0d5" />
                <stop offset="1" stopColor="#c9c1b7" />
              </linearGradient>
              <linearGradient id={`${illustrationId}-fabric`} x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#777d80" />
                <stop offset="1" stopColor="#3e464a" />
              </linearGradient>
            </defs>
            <rect width="600" height="760" fill={`url(#${illustrationId}-backdrop)`} />
            <circle cx="470" cy="145" r="115" fill="#f8f5f1" opacity=".55" />
            <path
              d="M220 147c12-36 44-57 80-57s68 21 80 57l42 52 86 454H92l86-454 42-52Z"
              fill={`url(#${illustrationId}-fabric)`}
            />
            <path
              d="M241 128c14 22 34 34 59 34s45-12 59-34l23 30c-18 38-46 57-82 57s-64-19-82-57l23-30Z"
              fill="#e9e0d5"
              opacity=".82"
            />
            <path d="M300 218v410" stroke="#d1c8bc" strokeWidth="3" opacity=".55" />
            <path
              d="M191 286 124 636M409 286l67 350"
              stroke="#a5a6a2"
              strokeWidth="2"
              opacity=".42"
            />
          </svg>
          <span className="product-image-pending__label" aria-hidden="true">
            Image pending · illustration only
          </span>
        </span>
      )}
    </span>
  );
}
