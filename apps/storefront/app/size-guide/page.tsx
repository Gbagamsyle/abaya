import Link from "next/link";
import { CatalogueShell } from "../../components/catalogue-shell";

export const metadata = {
  title: "Size guide",
  description: "Guidance for checking product measurements before selecting a size.",
  robots: { index: false, follow: true },
};

export default function SizeGuidePage() {
  return (
    <CatalogueShell title="Size guide">
      <section className="catalogue-inner size-guide-page">
        <h2>Choose with confidence</h2>
        <p>
          Size and fit can vary by garment. Check the measurements published on each product and
          compare them with a similar piece that fits you well.
        </p>
        <p>
          If a product does not include measurements, ask the seller to confirm before ordering.
          This concept does not publish a universal size chart.
        </p>
        <Link className="catalogue-link" href="/shop">
          Return to shop →
        </Link>
      </section>
    </CatalogueShell>
  );
}
