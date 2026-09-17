"use client";

import { useRouter } from "next/navigation";
import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from "@payloadcms/live-preview-react";

// Renders nothing — just tells Payload's admin panel to trigger a full
// Next.js re-render (refetching from Postgres) whenever the editor saves or
// publishes. Keystroke-by-keystroke updates are handled separately by
// useLivePreview on list-style pages (menu, testimonials); this catches
// everything else (new/removed items, sort order, metadata) that only
// changes on save.
export function RefreshOnSave() {
  const router = useRouter();
  return (
    <PayloadRefreshRouteOnSave
      refresh={() => router.refresh()}
      serverURL={typeof window !== "undefined" ? window.location.origin : ""}
    />
  );
}
