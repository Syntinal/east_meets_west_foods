// One-time migration of the current hardcoded /menu content into the
// MenuItems collection. Idempotent — safe to re-run, skips items/media
// that already exist by title/filename.
//
// Run with: npm run seed:menu   (requires DATABASE_URI to be set)
import path from "path";
import config from "@payload-config";
import { getPayload } from "payload";

type SeedItem = {
  title: string;
  tag?: string;
  group: "main" | "extras";
  description?: string;
  imageFilename?: string;
  imageAlt?: string;
  priceOptions: { label: string; price: string; note?: string }[];
  order: number;
};

const items: SeedItem[] = [
  {
    title: "Pork & Vegetable Bao Buns",
    tag: "Northern Chinese",
    group: "main",
    description:
      "Authentic, ancient, Chinese filled buns with fresh, local pork from Wood's Meats and alternating vegetables such as leeks and cabbage. Authentic Chinese fermented dough adds chewiness and a wonderful bite.",
    imageFilename: "bao-steamer.jpeg",
    imageAlt: "Pork and vegetable bao buns resting in a bamboo steamer",
    priceOptions: [
      { label: "3 Buns", price: "$7.99", note: "1 sauce" },
      { label: "6 Buns", price: "$13.99", note: "1 sauce" },
      { label: "12 Buns", price: "$24.99", note: "2 sauces" },
    ],
    order: 1,
  },
  {
    title: "Pork & Vegetable Dumplings",
    tag: "Northern Chinese",
    group: "main",
    description:
      "Ancient, authentic Chinese dumplings — 30% larger than traditional Chinese dumplings — filled with fresh Wood's pork and alternating vegetables such as leeks and cabbage.",
    imageFilename: "dumplings-steamer.jpeg",
    imageAlt: "Northern Chinese pork dumplings arranged in a bamboo steamer",
    priceOptions: [
      { label: "3 Large Dumplings", price: "$7.99", note: "1 sauce" },
      { label: "6 Large Dumplings", price: "$13.99", note: "1 sauce" },
      { label: "12 Large Dumplings", price: "$24.99", note: "2 sauces" },
    ],
    order: 2,
  },
  {
    title: "Combination: Buns & Dumplings",
    tag: "Best of Both",
    group: "main",
    description: "Designed to allow guests to experience the combined taste of dumplings and buns.",
    imageFilename: "dumplings-tray.jpeg",
    imageAlt: "A combination platter of dumplings and bao buns on a serving tray",
    priceOptions: [
      { label: "3 Dumplings + 3 Buns", price: "$13.99", note: "1 sauce" },
      { label: "6 Dumplings + 6 Buns", price: "$24.99", note: "2 sauces" },
    ],
    order: 3,
  },
  {
    title: "Meal Deal & Extras",
    group: "extras",
    priceOptions: [
      { label: "Side of fried rice (or other side) with any meal", price: "+$3" },
      { label: "Side purchased alone", price: "$3.99" },
      { label: "Extra garlic sauce", price: "$1.50" },
    ],
    order: 4,
  },
  {
    title: "Drinks",
    group: "extras",
    priceOptions: [
      { label: "Water", price: "$0.99" },
      { label: "Soft Drinks", price: "$1.99" },
      { label: "Chinese Imported Drinks", price: "$4.99" },
    ],
    order: 5,
  },
  {
    title: "Imported Asian Snacks",
    group: "extras",
    priceOptions: [
      { label: "Asian Lay's & Pringles", price: "$6" },
      { label: "Large Bagged Snacks", price: "$5" },
      { label: "Small Bagged Snacks", price: "$3" },
    ],
    order: 6,
  },
];

const run = async () => {
  const payload = await getPayload({ config });

  const uploadImage = async (filename: string, alt: string) => {
    const existing = await payload.find({
      collection: "media",
      where: { filename: { equals: filename } },
      limit: 1,
    });
    if (existing.docs[0]) return existing.docs[0].id;

    const media = await payload.create({
      collection: "media",
      data: { alt },
      filePath: path.resolve(process.cwd(), "public/assets/photos", filename),
    });
    return media.id;
  };

  for (const item of items) {
    const existing = await payload.find({
      collection: "menu-items",
      where: { title: { equals: item.title } },
      limit: 1,
    });
    if (existing.docs[0]) {
      console.log(`Skipping (already exists): ${item.title}`);
      continue;
    }

    const image = item.imageFilename ? await uploadImage(item.imageFilename, item.imageAlt ?? item.title) : undefined;

    await payload.create({
      collection: "menu-items",
      data: {
        title: item.title,
        tag: item.tag,
        group: item.group,
        description: item.description,
        image,
        priceOptions: item.priceOptions,
        order: item.order,
      },
    });
    console.log(`Created: ${item.title}`);
  }

  console.log("Menu seed complete.");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
