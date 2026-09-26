"use client";

import { useEffect, useState } from "react";
import { Header, type NavigationItem } from "@fenomena/ui";

export function StorefrontHeader({ navigation }: { navigation: NavigationItem[] }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 8);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return <Header brand="Demo Studio" navigation={navigation} scrolled={scrolled} />;
}
