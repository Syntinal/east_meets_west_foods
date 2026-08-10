"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { MenuGridView, type MenuItemDoc, type MenuIntroDoc } from "./MenuGridView";

// Mirrors components/sauce/LiveSauce.tsx — menu-intro is a singleton
// Global like Sauce, so this can hand useLivePreview the fetched global
// doc directly. Kept as its own component (not merged into LiveMenuGrid)
// because only one useLivePreview subscription should be active per
// preview session — see the /next/preview route's comment for why running
// both hooks at once on the same page would be unsafe. `items` is just
// passed straight through, unedited, on this session.
export function LiveMenuIntro({ items, intro }: { items: MenuItemDoc[]; intro: MenuIntroDoc }) {
  const { data } = useLivePreview<MenuIntroDoc>({
    initialData: intro,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 0,
  });

  return <MenuGridView items={items} intro={data} />;
}
