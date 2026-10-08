import { Alert, EmptyState } from "@fenomena/ui";
import type { CatalogueFailure } from "../lib/domain";

const failureTitles: Record<CatalogueFailure, string> = {
  "not-configured": "Catalogue data is not configured",
  "cms-empty": "No published products are available",
  "cms-unavailable": "Editorial catalogue is temporarily unavailable",
  "commerce-unavailable": "Product availability is temporarily unavailable",
};

export function CatalogueFailureState({
  reason,
  message,
}: {
  reason: CatalogueFailure;
  message?: string;
}) {
  return (
    <div className="catalogue-state">
      <Alert title={failureTitles[reason]} tone="warning">
        {message ??
          "Please try again later. No demo products or transaction data have been substituted."}
      </Alert>
    </div>
  );
}

export function CatalogueEmptyState({
  title = "No products to show",
  children = "This catalogue is empty right now.",
}: {
  title?: string;
  children?: string;
}) {
  return (
    <div className="catalogue-state">
      <EmptyState title={title}>{children}</EmptyState>
    </div>
  );
}
