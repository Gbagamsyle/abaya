export const DEMO_CURRENCY = "MYR";

// Fictional showcase content only; these values do not describe actual catalog or stock.
export const DEMO_PRODUCTS = [
  {
    name: "Demo Abaya 01",
    href: "#demo-product-01",
    price: 185,
    currency: DEMO_CURRENCY,
    badge: "Demo item",
    colours: [
      { name: "Demo stone", color: "#c8beb0" },
      { name: "Demo slate", color: "#777873" },
      { name: "Demo plum", color: "#8d7377" },
    ],
  },
  {
    name: "Demo Abaya 02",
    href: "#demo-product-02",
    price: 220,
    currency: DEMO_CURRENCY,
    colours: [
      { name: "Demo sand", color: "#d0c1a7" },
      { name: "Demo ink", color: "#353633" },
    ],
  },
] as const;

export const DEMO_NAVIGATION = [
  { label: "Shop", href: "#demo-shop" },
  { label: "Collections", href: "#demo-collections" },
  { label: "About", href: "#demo-about" },
];
