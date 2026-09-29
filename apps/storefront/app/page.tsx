import Link from "next/link";

export default function TemporaryHome() {
  return (
    <main className="temporary-home">
      <p className="catalogue-eyebrow">Temporary route · homepage milestone pending</p>
      <h1>Storefront concept</h1>
      <p>The editorial homepage is intentionally not part of this milestone.</p>
      <Link className="catalogue-link" href="/shop">
        Browse the catalogue →
      </Link>
      <p className="demo-disclaimer">
        Independent concept, not an official Fenomena Abaya website.
      </p>
    </main>
  );
}
