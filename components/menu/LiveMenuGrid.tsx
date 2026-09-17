"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { MenuGridView, type MenuItemDoc, type MenuIntroDoc } from "./MenuGridView";

// The postMessage from the admin iframe only ever describes the ONE menu
// item currently being edited (Payload has no concept of "the whole list"),
// so splice it into the full, server-fetched list by id instead of
// replacing the list wholesale.
function mergeItem(items: MenuItemDoc[], live: Partial<MenuItemDoc>): MenuItemDoc[] {
  if (!live?.id) return items;
  return items.map((item) => (item.id === live.id ? ({ ...item, ...live } as MenuItemDoc) : item));
}

export function LiveMenuGrid({
  initialItems,
  seedItem,
  intro,
}: {
  initialItems: MenuItemDoc[];
  seedItem: MenuItemDoc;
  // Rendered as last-saved-draft, not live — this session's useLivePreview
  // subscription is scoped to the menu item being edited. Editing the intro
  // box is a separate session (see components/menu/LiveMenuIntro.tsx); only
  // one useLivePreview subscription should be active per preview session,
  // see the /next/preview route's comment for why.
  intro: MenuIntroDoc;
}) {
  // `useLivePreview` needs a real, existing document to seed `initialData` —
  // it round-trips to `/api/menu-items/{initialData.id}` on every keystroke
  // to resolve the `image` relation, so an empty placeholder object 404s
  // that request every time and the merge silently never fires.
  const { data } = useLivePreview<MenuItemDoc>({
    initialData: seedItem,
    serverURL: typeof window !== "undefined" ? window.location.origin : "",
    depth: 1,
  });

  return <MenuGridView items={mergeItem(initialItems, data)} intro={intro} />;
}
