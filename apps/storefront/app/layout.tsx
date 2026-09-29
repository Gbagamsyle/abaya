import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { safeHttpUrl } from "../lib/safe-url";
import { CartProvider } from "../components/cart-provider";
import "./globals.css";

const metadataBaseUrl = safeHttpUrl(process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL);

const editorialFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
  weight: ["400", "500", "600"],
});

const interfaceFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl ? new URL(metadataBaseUrl) : undefined,
  title: "Storefront concept",
  description: "Independent storefront concept in development.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${editorialFont.variable} ${interfaceFont.variable}`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
