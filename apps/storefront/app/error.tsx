"use client";

import { Alert, Button } from "@fenomena/ui";

export default function CatalogueError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="catalogue-inner catalogue-state">
      <Alert title="Something went wrong" tone="destructive">
        The catalogue could not be displayed right now.
      </Alert>
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
