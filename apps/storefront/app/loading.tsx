import { Skeleton, Spinner } from "@fenomena/ui";
import { CatalogueShell } from "../components/catalogue-shell";

export default function CatalogueLoading() {
  return (
    <CatalogueShell title="Loading catalogue">
      <section className="catalogue-inner catalogue-loading" aria-busy="true" aria-live="polite">
        <Spinner label="Loading catalogue" />
        <div className="catalogue-product-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="catalogue-loading__card" key={index} />
          ))}
        </div>
      </section>
    </CatalogueShell>
  );
}
