"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { ContactView, type ContactDoc } from "./ContactView";

// Contact is a singleton Global with no per-item id, so — like Home — this
// can hand the hook the real fetched doc directly; no merge-by-id needed.
export function LiveContact({ contact }: { contact: ContactDoc }) {
  const { data } = useLivePreview<ContactDoc>({
    initialData: contact,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <ContactView contact={data} />;
}
