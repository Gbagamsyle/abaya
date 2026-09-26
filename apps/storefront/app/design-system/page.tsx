import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ColourSwatch,
  Container,
  Divider,
  EmptyState,
  FieldLabel,
  Footer,
  FormField,
  Header,
  Input,
  Inline,
  Price,
  ProductCard,
  QuantitySelector,
  Radio,
  Section,
  Select,
  SizeSelector,
  Skeleton,
  SocialProof,
  Spinner,
  Stack,
  StickyMobilePurchaseBar,
  Textarea,
} from "@fenomena/ui";
import type { CSSProperties } from "react";
import { ProductImage } from "../../components/product-image";
import { DesignSystemOverlayExamples } from "../../components/design-system-overlays";
import { DEMO_CURRENCY, DEMO_NAVIGATION, DEMO_PRODUCTS } from "./demo-data";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Design System · Development",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_SYSTEM !== "true") {
    notFound();
  }

  return (
    <main className="ui-design-page">
      <Container width="wide">
        <Header brand="Demo Studio" navigation={[...DEMO_NAVIGATION]} cartCount={2} />
        <Section className="ui-design-intro">
          <p className="ui-caption">M1 · Visual foundation</p>
          <h1 className="ui-h1 ui-editorial">Design system showcase</h1>
          <p>
            Development-only component QA. All products, prices, navigation and engagement examples
            below are fictional demo content and do not represent Fenomena inventory, policies, or
            public metrics.
          </p>
          <Badge tone="warning">Demo content · not for customers</Badge>
        </Section>

        <div className="ui-design-grid">
          <section className="ui-design-panel" aria-labelledby="colors-heading">
            <h2 id="colors-heading">Semantic colours</h2>
            <div className="ui-token-grid">
              {[
                ["Background", "--background"],
                ["Foreground", "--foreground"],
                ["Surface", "--surface"],
                ["Surface muted", "--surface-muted"],
                ["Border", "--border"],
                ["Muted", "--muted"],
                ["Accent", "--accent"],
                ["Success", "--success"],
                ["Destructive", "--destructive"],
              ].map(([label, token]) => (
                <div
                  className="ui-token-swatch"
                  key={token}
                  style={{ "--token-color": `var(${token})` } as CSSProperties}
                >
                  <span />
                  <span>
                    {label}
                    <br />
                    <code>{token}</code>
                  </span>
                </div>
              ))}
            </div>
            <p className="ui-body-sm">
              Primary light palette. Dark tokens are structural only and have not been designed as a
              user theme.
            </p>
          </section>

          <section className="ui-design-panel" aria-labelledby="type-heading">
            <h2 id="type-heading">Typography</h2>
            <div className="ui-stack ui-stack--md">
              <p className="ui-display-lg ui-editorial">A considered display</p>
              <p className="ui-h1">Heading one</p>
              <p className="ui-h2">Heading two</p>
              <p className="ui-h3">Heading three</p>
              <p className="ui-h4">Heading four</p>
              <p className="ui-body-lg">Large body for introductions and editorial context.</p>
              <p>Body copy for product information, forms, and shopping.</p>
              <p className="ui-body-sm">Small supporting body text</p>
              <p className="ui-caption">Caption / provenance</p>
              <p className="ui-label">Form label</p>
              <Price amount={185} currency={DEMO_CURRENCY} />
            </div>
          </section>

          <section className="ui-design-panel" aria-labelledby="buttons-heading">
            <h2 id="buttons-heading">Buttons and states</h2>
            <div className="ui-demo-actions">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="text">Text link</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </section>

          <section className="ui-design-panel" aria-labelledby="forms-heading">
            <h2 id="forms-heading">Accessible form controls</h2>
            <form className="ui-demo-form">
              <FormField id="demo-email" label="Email address" hint="Demo field hint" required>
                {(props) => (
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.test"
                    {...props}
                  />
                )}
              </FormField>
              <FormField
                id="demo-message"
                label="Message"
                error="This is an example validation message."
              >
                {(props) => <Textarea placeholder="Enter a demo message" {...props} />}
              </FormField>
              <div>
                <FieldLabel htmlFor="demo-select">Select</FieldLabel>
                <Select id="demo-select" defaultValue="">
                  <option value="" disabled>
                    Choose an option
                  </option>
                  <option>Option one</option>
                </Select>
              </div>
              <Checkbox label="Keep me informed (demo)" />
              <Radio name="demo-radio" label="Choice one" />
              <Radio name="demo-radio" label="Choice two" />
            </form>
          </section>

          <section className="ui-design-panel" aria-labelledby="badge-heading">
            <h2 id="badge-heading">Badges and feedback</h2>
            <div className="ui-demo-stack">
              <Inline>
                <Badge>Neutral</Badge>
                <Badge tone="success">Success</Badge>
                <Badge tone="warning">Demo</Badge>
                <Badge tone="destructive">Error</Badge>
              </Inline>
              <Alert title="Information">
                Form and state feedback uses semantic roles and clear text.
              </Alert>
              <Alert tone="success" title="Saved">
                Example success state.
              </Alert>
              <Alert tone="destructive" title="Could not continue">
                Example error state.
              </Alert>
              <EmptyState title="Nothing here yet">
                A useful empty state explains what happened and what to do next.
              </EmptyState>
              <div className="ui-demo-actions">
                <Skeleton className="ui-demo-skeleton" />
                <Spinner />
              </div>
            </div>
          </section>

          <section className="ui-design-panel" aria-labelledby="product-heading">
            <h2 id="product-heading">Product cards · fictional examples</h2>
            <div className="ui-demo-product-grid">
              {DEMO_PRODUCTS.map((product, index) => (
                <ProductCard
                  key={product.href}
                  {...product}
                  social={index === 0 ? { platform: "Instagram", verified: false } : undefined}
                  media={
                    <ProductImage ratio="product" alt="Placeholder for a fictional demo garment" />
                  }
                  secondaryMedia={
                    <ProductImage
                      ratio="product"
                      alt="Alternate placeholder for a fictional demo garment"
                    />
                  }
                />
              ))}
            </div>
            <p className="ui-caption">
              These fictional product names, prices and colours are for component QA only. They are
              not real offers or stock.
            </p>
          </section>

          <section className="ui-design-panel" aria-labelledby="selection-heading">
            <h2 id="selection-heading">Product selectors</h2>
            <Stack>
              <fieldset>
                <legend>Colour · demo</legend>
                <Inline>
                  {DEMO_PRODUCTS[0].colours.map((colour) => (
                    <ColourSwatch key={colour.name} {...colour} />
                  ))}
                </Inline>
              </fieldset>
              <SizeSelector sizes={["52", "54", "56", "58", "60"]} />
              <QuantitySelector min={1} max={4} />
              <Price amount={185} currency={DEMO_CURRENCY} compareAt={220} />
            </Stack>
          </section>

          <section className="ui-design-panel" aria-labelledby="social-heading">
            <h2 id="social-heading">Social proof · verified-only pattern</h2>
            <div className="ui-demo-stack">
              <SocialProof platform="TikTok" verified={false} />
              <SocialProof
                platform="Instagram"
                verified
                url="https://example.test/demo-post"
                metric={1280}
              />
              <p className="ui-caption">
                Metrics appear only when explicitly provided and verified. The metric above is
                fictional showcase data.
              </p>
            </div>
          </section>

          <section className="ui-design-panel" aria-labelledby="images-heading">
            <h2 id="images-heading">Image conventions</h2>
            <div className="ui-token-grid">
              {(
                [
                  "product",
                  "editorial-portrait",
                  "editorial-landscape",
                  "collection",
                  "social-square",
                ] as const
              ).map((ratio) => (
                <div key={ratio}>
                  <ProductImage ratio={ratio} alt={`${ratio} demo image placeholder`} />
                  <p className="ui-caption">{ratio}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ui-design-panel" aria-labelledby="layout-heading">
            <h2 id="layout-heading">Layout primitives</h2>
            <Stack>
              <Inline>
                <Badge>Inline</Badge>
                <Badge>Gap</Badge>
              </Inline>
              <Divider />
              <p className="ui-body-sm">
                Container, Section, Stack, Inline, and Divider establish composition without
                page-specific assumptions.
              </p>
            </Stack>
          </section>

          <section className="ui-design-panel" aria-labelledby="breadcrumb-heading">
            <h2 id="breadcrumb-heading">Breadcrumb and overlay</h2>
            <nav aria-label="Breadcrumb" className="ui-breadcrumbs">
              <ol>
                <li>
                  <a href="#home">Home</a>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">Design system</li>
              </ol>
            </nav>
            <DesignSystemOverlayExamples />
            <p className="ui-body-sm">
              Drawer and modal use native dialog semantics, Escape close and browser focus handling.
            </p>
          </section>
        </div>

        <div className="ui-sticky-purchase-preview">
          <StickyMobilePurchaseBar
            price={185}
            currency={DEMO_CURRENCY}
            disabled
            label="Demo purchase bar"
          />
        </div>
        <Footer
          groups={[
            { title: "Shop (demo)", links: [...DEMO_NAVIGATION] },
            { title: "Customer care (demo)", links: [{ label: "Contact", href: "#demo-contact" }] },
          ]}
          socialLinks={[{ label: "Instagram (demo)", href: "https://example.test/social" }]}
          currencyLabel="Demo currency · MYR"
          brand="Demo Studio"
        />
      </Container>
    </main>
  );
}
