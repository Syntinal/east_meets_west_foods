import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";
import { authenticated } from "@/access/authenticated";
import { logActivity } from "@/lib/activityLog";

// "Sold out today" — deliberately a separate record, NOT a field on Menu
// Items. Menu Items has drafts: flipping a field on an item that has saved-
// but-unpublished edits would merge those edits into the live row (the
// Pork & Vegetable Bao Buns incident, CLAUDE.md item 27). Keeping this
// operational switch in its own non-versioned collection means it can take
// effect immediately without ever touching an item's pending edits.
//
// One row per menu item. `soldOutOn` holds the restaurant-local date it
// was marked (lib/businessDate.ts); the item only counts as sold out while
// that date is today, so it clears itself the next day with nobody having
// to remember. The nightly publish-scheduled cron revalidates /menu just
// after midnight Pacific so the cached page drops yesterday's labels.
export const MenuSoldOut: CollectionConfig = {
  slug: "menu-sold-out",
  labels: { singular: "Sold-out mark", plural: "Sold-out marks" },
  admin: { hidden: true },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    afterChange: [
      () => revalidatePath("/menu"),
      async ({ doc, req }) => {
        const itemId = typeof doc.item === "object" ? doc.item?.id : doc.item;
        const item = await req.payload
          .findByID({ collection: "menu-items", id: itemId, depth: 0, req, overrideAccess: true })
          .catch(() => null);
        const name = `“${(item as { title?: string } | null)?.title ?? "A menu item"}”`;
        await logActivity(
          req.payload,
          { summary: doc.soldOutOn ? `Marked ${name} sold out today` : `${name} is available again`, area: "menu" },
          req,
        );
      },
    ],
    afterDelete: [() => revalidatePath("/menu")],
  },
  fields: [
    { name: "item", type: "relationship", relationTo: "menu-items", required: true, unique: true, index: true },
    // YYYY-MM-DD at the restaurant, or empty when not sold out.
    { name: "soldOutOn", type: "text" },
  ],
};
