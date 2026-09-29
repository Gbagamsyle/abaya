"use client";

import { Button, Drawer } from "@fenomena/ui";
import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";

const navigation = [
  { label: "Shop", href: "/shop" },
  { label: "New arrivals", href: "/new-arrivals" },
  { label: "Collections", href: "/collections" },
  { label: "Search", href: "/search" },
];

function CatalogueNavigation() {
  const [open, setOpen] = useState(false);
  const { cart, openDrawer } = useCart();
  return (
    <header className="catalogue-header">
      <div className="catalogue-header__inner">
        <Button
          className="catalogue-menu-trigger"
          type="button"
          variant="ghost"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Menu
        </Button>
        <Link href="/" className="catalogue-wordmark" aria-label="Concept home">
          Fenomena
        </Link>
        <nav className="catalogue-header__nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/search" className="catalogue-search-link">
          Search
        </Link>
        <button
          className="catalogue-bag-trigger"
          type="button"
          onClick={openDrawer}
          aria-label={`Open bag, ${cart?.itemCount ?? 0} items`}
        >
          Bag {cart?.itemCount ?? 0}
        </button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Browse">
          <nav className="catalogue-mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </Drawer>
      </div>
    </header>
  );
}

export function CatalogueShell({
  children,
  title,
  isDemo = false,
}: {
  children: ReactNode;
  title?: string;
  isDemo?: boolean;
}) {
  return (
    <div className="catalogue-shell">
      <CatalogueNavigation />
      {isDemo && (
        <div className="catalogue-demo-banner" role="status">
          DEMO MODE · Fictional catalogue content only · no real prices, inventory, or offers
        </div>
      )}
      {title && (
        <div className="catalogue-page-header">
          <div className="catalogue-inner">
            <p className="catalogue-eyebrow">Independent storefront concept</p>
            <h1>{title}</h1>
          </div>
        </div>
      )}
      <main>{children}</main>
      <footer className="catalogue-footer">
        <Link href="/" className="catalogue-wordmark">
          Fenomena
        </Link>
        <p>Independent storefront concept · catalogue data is not an official business offer.</p>
        <nav aria-label="Footer navigation">
          {navigation.slice(0, 3).map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
