"use client";

import { Button, Drawer } from "@fenomena/ui";
import { useState } from "react";
import type { StorefrontCollectionEntry, StorefrontProduct } from "../lib/domain";

export type ShopFilterValues = {
  collection?: string;
  colour?: string;
  size?: string;
  availability?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};

function FilterFields({
  collections,
  products,
  values,
}: {
  collections: StorefrontCollectionEntry[];
  products: StorefrontProduct[];
  values: ShopFilterValues;
}) {
  const options = (matcher: RegExp) => [
    ...new Set(
      products.flatMap((product) =>
        product.variants.flatMap((variant) =>
          Object.entries(variant.options)
            .filter(([name]) => matcher.test(name))
            .map(([, value]) => value),
        ),
      ),
    ),
  ];
  return (
    <>
      <label className="catalogue-filter-field">
        Collection
        <select name="collection" defaultValue={values.collection ?? ""}>
          <option value="">All collections</option>
          {collections.map((collection) => (
            <option value={collection.slug} key={collection.id ?? collection.slug}>
              {collection.title}
            </option>
          ))}
        </select>
      </label>
      <label className="catalogue-filter-field">
        Colour
        <select name="colour" defaultValue={values.colour ?? ""}>
          <option value="">All colours</option>
          {options(/colou?r/i).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="catalogue-filter-field">
        Size
        <select name="size" defaultValue={values.size ?? ""}>
          <option value="">All sizes</option>
          {options(/size/i).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="catalogue-filter-field">
        Availability
        <select name="availability" defaultValue={values.availability ?? ""}>
          <option value="">Any availability</option>
          <option value="available">Available only</option>
        </select>
      </label>
      {products.some((product) => product.price) && (
        <>
          <label className="catalogue-filter-field">
            Minimum price
            <input
              name="minPrice"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              defaultValue={values.minPrice ?? ""}
            />
          </label>
          <label className="catalogue-filter-field">
            Maximum price
            <input
              name="maxPrice"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              defaultValue={values.maxPrice ?? ""}
            />
          </label>
        </>
      )}
      <label className="catalogue-filter-field">
        Sort by
        <select name="sort" defaultValue={values.sort ?? "newest"}>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>
      <div className="catalogue-filter-actions">
        <Button type="submit" variant="primary">
          Apply filters
        </Button>
        <a href="/shop" className="catalogue-link">
          Clear all
        </a>
      </div>
    </>
  );
}

export function ShopControls({
  collections,
  products,
  values,
}: {
  collections: StorefrontCollectionEntry[];
  products: StorefrontProduct[];
  values: ShopFilterValues;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <form
        action="/shop"
        method="get"
        className="catalogue-filter-bar catalogue-filter-bar--desktop"
      >
        <FilterFields collections={collections} products={products} values={values} />
      </form>
      <div className="catalogue-filter-mobile">
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Filter & sort
        </Button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Filter and sort">
          <form
            action="/shop"
            method="get"
            className="catalogue-filter-bar catalogue-filter-bar--drawer"
          >
            <FilterFields collections={collections} products={products} values={values} />
          </form>
        </Drawer>
      </div>
    </>
  );
}
