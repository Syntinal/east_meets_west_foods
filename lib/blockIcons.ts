// Thumbnail icons for the "Add Layout"/"Add Block" picker drawer
// (collections/Pages.ts's `layout` field, globals/Home.ts's `teaserCards`
// field). Without a block-level `admin.images.thumbnail`, Payload falls
// back to the same generic gray placeholder graphic
// (@payloadcms/ui/dist/graphics/DefaultBlockImage) for every block type —
// fine when there's one or two block types, but with 5-8 in a picker
// they're indistinguishable at a glance. These are small inline SVGs
// encoded as data: URIs (nothing to upload/host), one distinct color +
// glyph per block so each thumbnail actually depicts what that block adds.
// Kept to simple stroke/fill shapes so they stay legible at the drawer's
// small thumbnail size. 3:2 aspect ratio per Payload's own recommendation
// (payload/dist/fields/config/types.d.ts, `Block.admin.images.thumbnail`).
function thumbnail(bg: string, fg: string, glyph: string): { url: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
    <rect width="240" height="160" rx="12" fill="${bg}"/>
    ${glyph}
  </svg>`;
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}` };
}

// Four lines of shrinking-width text — a paragraph.
export const richTextThumbnail = thumbnail(
  "#eef2f7",
  "#475569",
  `<g stroke="#475569" stroke-width="7" stroke-linecap="round">
    <line x1="60" y1="55" x2="180" y2="55"/>
    <line x1="60" y1="75" x2="180" y2="75"/>
    <line x1="60" y1="95" x2="180" y2="95"/>
    <line x1="60" y1="115" x2="140" y2="115"/>
  </g>`,
);

// A single framed photo — mountain + sun.
export const imageThumbnail = thumbnail(
  "#e6f4f1",
  "#0f766e",
  `<defs><clipPath id="c"><rect x="55" y="45" width="130" height="90" rx="8"/></clipPath></defs>
  <rect x="55" y="45" width="130" height="90" rx="8" fill="none" stroke="#0f766e" stroke-width="7"/>
  <g clip-path="url(#c)" fill="#0f766e">
    <circle cx="95" cy="76" r="11"/>
    <path d="M55 135 L105 95 L130 115 L155 90 L185 130 Z"/>
  </g>`,
);

// Three overlapping framed photos — a gallery, not just one image.
export const galleryThumbnail = thumbnail(
  "#fdf1e0",
  "#b45309",
  `<g fill="#ffffff" stroke="#b45309" stroke-width="5">
    <rect x="42" y="62" width="82" height="60" rx="6"/>
    <rect x="72" y="52" width="82" height="60" rx="6"/>
    <rect x="102" y="42" width="82" height="60" rx="6" stroke-width="6"/>
  </g>`,
);

// A filled button with an arrow — click to go.
export const ctaThumbnail = thumbnail(
  "#e9f9ee",
  "#15803d",
  `<rect x="50" y="62" width="140" height="42" rx="21" fill="#15803d"/>
  <path d="M95 83 h42 M130 70 l14 13 l-14 13" stroke="#e9f9ee" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
);

// Two side-by-side panels — a photo on the left, text lines on the right.
export const twoColumnThumbnail = thumbnail(
  "#f2ecfc",
  "#6d28d9",
  `<g stroke="#6d28d9" stroke-width="6" fill="none" stroke-linecap="round">
    <rect x="50" y="45" width="60" height="90" rx="6"/>
    <rect x="130" y="45" width="60" height="90" rx="6"/>
    <circle cx="80" cy="75" r="9" fill="#6d28d9" stroke="none"/>
    <line x1="60" y1="107" x2="100" y2="107"/>
    <line x1="142" y1="65" x2="178" y2="65"/>
    <line x1="142" y1="80" x2="178" y2="80"/>
    <line x1="142" y1="95" x2="170" y2="95"/>
  </g>`,
);

// A document with a folded corner, plus an arrow pointing into it — links
// to one of this site's own pages.
export const pageCardThumbnail = thumbnail(
  "#e8f0fe",
  "#1d4ed8",
  `<path d="M130 40 h50 l20 20 v80 h-70 z" fill="none" stroke="#1d4ed8" stroke-width="6" stroke-linejoin="round"/>
  <path d="M130 40 l20 20 h-20 z" fill="#1d4ed8"/>
  <path d="M50 90 h55 M85 70 l20 20 l-20 20" stroke="#1d4ed8" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
);

// A map pin — the Visit/Contact card.
export const mapCardThumbnail = thumbnail(
  "#fdecec",
  "#b91c1c",
  `<path d="M120 28 c-28 0 -47 20 -47 47 c0 35 47 77 47 77 s47 -42 47 -77 c0 -27 -19 -47 -47 -47 z" fill="#b91c1c"/>
  <circle cx="120" cy="76" r="16" fill="#fdecec"/>`,
);

// A blank card with a sparkle — a genuinely new, owner-defined card.
export const customCardThumbnail = thumbnail(
  "#fbe9f5",
  "#a21caf",
  `<rect x="55" y="45" width="130" height="90" rx="10" fill="none" stroke="#a21caf" stroke-width="6"/>
  <path d="M120 64 l8 18 l18 8 l-18 8 l-8 18 l-8 -18 l-18 -8 l18 -8 z" fill="#a21caf"/>`,
);

// Three side-by-side cards — a repeatable grid, not just one card.
export const cardGridThumbnail = thumbnail(
  "#fff4e6",
  "#c2410c",
  `<g fill="none" stroke="#c2410c" stroke-width="6" stroke-linejoin="round">
    <rect x="38" y="50" width="48" height="66" rx="5"/>
    <rect x="96" y="50" width="48" height="66" rx="5"/>
    <rect x="154" y="50" width="48" height="66" rx="5"/>
  </g>
  <g stroke="#c2410c" stroke-width="4" stroke-linecap="round">
    <line x1="46" y1="92" x2="78" y2="92"/>
    <line x1="104" y1="92" x2="136" y2="92"/>
    <line x1="162" y1="92" x2="194" y2="92"/>
  </g>`,
);

// A document with a folded corner and a downward arrow — a file to download.
export const fileThumbnail = thumbnail(
  "#e6f7fa",
  "#0891b2",
  `<path d="M75 32 h55 l22 22 v74 h-77 z" fill="none" stroke="#0891b2" stroke-width="7" stroke-linejoin="round"/>
  <path d="M130 32 l22 22 h-22 z" fill="#0891b2"/>
  <path d="M113 68 v34 M100 89 l13 15 l13 -15" stroke="#0891b2" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
);

// A rounded rectangle with a play triangle — a video.
export const videoThumbnail = thumbnail(
  "#ffe4e9",
  "#be123c",
  `<rect x="45" y="42" width="150" height="76" rx="10" fill="none" stroke="#be123c" stroke-width="7"/>
  <path d="M100 66 l45 14 l-45 14 z" fill="#be123c"/>`,
);

// A large opening quotation mark — a quote/testimonial.
export const quoteThumbnail = thumbnail(
  "#f2fce4",
  "#4d7c0f",
  `<path d="M65 55 c-16 10 -22 24 -22 38 c0 12 8 20 18 20 c9 0 16 -7 16 -16 c0 -8 -6 -14 -13 -15 c1 -10 8 -18 17 -23 z" fill="#4d7c0f"/>
  <path d="M130 55 c-16 10 -22 24 -22 38 c0 12 8 20 18 20 c9 0 16 -7 16 -16 c0 -8 -6 -14 -13 -15 c1 -10 8 -18 17 -23 z" fill="#4d7c0f"/>`,
);

// A speech bubble with a question mark — a mini FAQ.
export const faqThumbnail = thumbnail(
  "#eef2ff",
  "#4f46e5",
  `<path d="M50 45 h140 a10 10 0 0 1 10 10 v50 a10 10 0 0 1 -10 10 h-95 l-25 22 v-22 h-20 a10 10 0 0 1 -10 -10 v-50 a10 10 0 0 1 10 -10 z" fill="none" stroke="#4f46e5" stroke-width="6" stroke-linejoin="round"/>
  <text x="120" y="98" font-family="Georgia, serif" font-size="46" font-weight="bold" fill="#4f46e5" text-anchor="middle">?</text>`,
);
