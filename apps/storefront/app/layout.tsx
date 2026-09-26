import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

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
  title: "Fenomena Abaya — Independent Commerce Concept",
  description: "An independent, non-official storefront concept in development.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${editorialFont.variable} ${interfaceFont.variable}`}>{children}</body>
    </html>
  );
}
