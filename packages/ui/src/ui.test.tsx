import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, FormField, Input } from "./primitives";
import { ProductPrice, QuantitySelector, SizeSelector } from "./commerce";

test("loading buttons are disabled and announce busy state", () => {
  const markup = renderToStaticMarkup(createElement(Button, { loading: true }, "Add to bag"));
  assert.match(markup, /disabled=""/);
  assert.match(markup, /aria-busy="true"/);
});

test("disabled buttons expose native disabled semantics", () => {
  const markup = renderToStaticMarkup(createElement(Button, { disabled: true }, "Unavailable"));
  assert.match(markup, /disabled=""/);
});

test("size options expose selected state and accessible fieldset label", () => {
  const markup = renderToStaticMarkup(
    createElement(SizeSelector, { sizes: ["S", "M"], value: "M" }),
  );
  assert.match(markup, /<fieldset/);
  assert.match(markup, /Choose a size/);
  assert.match(markup, /aria-pressed="true">M/);
  assert.match(markup, /aria-pressed="false">S/);
});

test("quantity selector disables decrement at minimum and increment at maximum", () => {
  const minMarkup = renderToStaticMarkup(
    createElement(QuantitySelector, { value: 1, min: 1, max: 2 }),
  );
  const maxMarkup = renderToStaticMarkup(
    createElement(QuantitySelector, { value: 2, min: 1, max: 2 }),
  );
  assert.match(minMarkup, /Decrease quantity" disabled/);
  assert.match(maxMarkup, /Increase quantity" disabled/);
});

test("product price requires explicit currency and renders compare-at price", () => {
  const markup = renderToStaticMarkup(
    createElement(ProductPrice, { amount: 185, compareAt: 200, currency: "MYR" }),
  );
  assert.match(markup, /185\.00/);
  assert.match(markup, /200\.00/);
});

test("form field associates hint and error with its rendered input", () => {
  const markup = renderToStaticMarkup(
    createElement(
      FormField,
      { id: "email", label: "Email", hint: "Use your preferred address", error: "Invalid address" },
      (props) => createElement(Input, { type: "email", ...props }),
    ),
  );
  assert.match(markup, /<label[^>]*for="email"/);
  assert.match(markup, /id="email"/);
  assert.match(markup, /aria-describedby="email-hint email-error"/);
  assert.match(markup, /aria-invalid="true"/);
});
