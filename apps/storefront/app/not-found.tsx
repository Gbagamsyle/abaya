import Link from "next/link";
import { EmptyState } from "@fenomena/ui";
import { CatalogueShell } from "../components/catalogue-shell";

export default function NotFound() {
  return (
    <CatalogueShell title="Not found">
      <section className="catalogue-inner catalogue-state">
        <EmptyState title="We couldn’t find that page">
          The product or collection may have been unpublished or the link may be out of date.
        </EmptyState>
        <Link className="catalogue-link" href="/shop">
          Browse the catalogue →
        </Link>
      </section>
    </CatalogueShell>
  );
}
