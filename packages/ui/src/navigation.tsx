import type { ReactNode } from "react";
import { IconButton } from "./primitives";
import { MobileNavigationDrawer } from "./overlays";

export interface NavigationItem {
  label: string;
  href: string;
}

export function AnnouncementBar({ children, href }: { children: ReactNode; href?: string }) {
  return <div className="ui-announcement">{href ? <a href={href}>{children}</a> : children}</div>;
}

export function SearchTrigger({ onClick }: { onClick?: () => void }) {
  return (
    <IconButton type="button" label="Search" onClick={onClick}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 5 5" />
      </svg>
    </IconButton>
  );
}

export function AccountTrigger({ href = "/account" }: { href?: string }) {
  return (
    <a className="ui-header-icon" href={href} aria-label="Account">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.5-3.2 2.8-5 6.5-5s6 1.8 6.5 5" />
      </svg>
    </a>
  );
}

export function WishlistTrigger({
  href = "/account/wishlist",
  count,
}: {
  href?: string;
  count?: number;
}) {
  return (
    <a
      className="ui-header-icon"
      href={href}
      aria-label={count ? `Wishlist, ${count} items` : "Wishlist"}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M20.8 8.7c0 5-8.8 10.2-8.8 10.2S3.2 13.7 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
      </svg>
      {count ? <span className="ui-header-count">{count}</span> : null}
    </a>
  );
}

export function CartTrigger({ href = "/cart", count }: { href?: string; count?: number }) {
  return (
    <a className="ui-header-icon" href={href} aria-label={count ? `Bag, ${count} items` : "Bag"}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M4 8h16l-1 12H5L4 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span>Bag</span>
      {count !== undefined && <span className="ui-header-count">{count}</span>}
    </a>
  );
}

export function DesktopNavigation({ items }: { items: NavigationItem[] }) {
  return (
    <nav className="ui-desktop-nav" aria-label="Main navigation">
      {items.map((item) => (
        <a key={item.href} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function Header({
  brand = "Studio",
  navigation,
  scrolled = false,
  cartCount,
}: {
  brand?: string;
  navigation: NavigationItem[];
  scrolled?: boolean;
  cartCount?: number;
}) {
  return (
    <header className={`ui-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="ui-header__inner">
        <div className="ui-header__mobile-nav">
          <MobileNavigationDrawer items={navigation} />
        </div>
        <a className="ui-wordmark" href="/" aria-label={`${brand} home`}>
          {brand}
        </a>
        <DesktopNavigation items={navigation} />
        <div className="ui-header__actions">
          <SearchTrigger />
          <AccountTrigger />
          <WishlistTrigger />
          <CartTrigger count={cartCount} />
        </div>
      </div>
    </header>
  );
}

export interface FooterGroup {
  title: string;
  links: NavigationItem[];
}

export function Footer({
  groups,
  socialLinks = [],
  newsletter,
  currencyLabel,
  legalLinks = [],
  brand = "Studio",
}: {
  groups: FooterGroup[];
  socialLinks?: NavigationItem[];
  newsletter?: ReactNode;
  currencyLabel?: string;
  legalLinks?: NavigationItem[];
  brand?: string;
}) {
  return (
    <footer className="ui-footer">
      <div className="ui-footer__main">
        <div className="ui-footer__brand">
          <a className="ui-wordmark" href="/">
            {brand}
          </a>
          <p>Considered pieces, chosen with care.</p>
          {currencyLabel && <span className="ui-footer__currency">{currencyLabel}</span>}
        </div>
        {groups.map((group) => (
          <nav className="ui-footer__group" aria-label={group.title} key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ))}
        {socialLinks.length > 0 && (
          <nav className="ui-footer__group" aria-label="Social links">
            <h2>Follow along</h2>
            {socialLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
                <span className="ui-visually-hidden"> (opens in a new tab)</span>
              </a>
            ))}
          </nav>
        )}
        {newsletter && <div className="ui-footer__newsletter">{newsletter}</div>}
      </div>
      <div className="ui-footer__bottom">
        <span>
          © {new Date().getFullYear()} {brand}. Demo content.
        </span>
        <nav aria-label="Legal links">
          {legalLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
