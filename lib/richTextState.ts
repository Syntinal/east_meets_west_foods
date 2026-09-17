import type { CSSProperties } from "react";

// @payloadcms/richtext-lexical exports the `TextStateFeature` function
// itself but not its prop types (`TextStateFeatureProps`/`StateValues`) —
// confirmed against the package's exports map, which has no path for
// features/textState at all. Redeclared structurally here (matching
// feature.server.d.ts exactly) rather than deep-importing dist internals
// that aren't part of the package's public surface.
type StateValues = {
  [stateValue: string]: {
    css: Record<string, string | undefined>;
    label: string;
  };
};
type TextStateConfig = {
  [stateKey: string]: StateValues;
};

// Config for Payload's TextStateFeature, which is what puts a "Text Style"
// dropdown (color, font, and size, in this case) into every rich text
// toolbar — registered once on the root editor in payload.config.ts, so it
// applies to every richText field on the site except blocks/CardGridBlock.ts's
// deliberately compact editor (see that file's own comment for why).
//
// Colors are hardcoded hex values, not var(--red) etc. from
// app/(frontend)/globals.css, on purpose: /admin is a separate root layout
// (see CLAUDE.md's route-group gotcha) with none of the frontend's CSS
// custom properties in scope, so a var() reference would silently render
// as the default text color while editing but the real color on the
// published page — an easy-to-miss mismatch. Keep these hexes in sync with
// globals.css's :root block by hand if the brand palette ever changes.
export const richTextColorState = {
  "text-red": { css: { color: "#c8102e" }, label: "Red" },
  "text-red-dark": { css: { color: "#9c0b22" }, label: "Dark Red" },
  "text-black": { css: { color: "#1a1a1a" }, label: "Black" },
  "text-gray": { css: { color: "#6b6b6b" }, label: "Gray" },
  "text-white": { css: { color: "#ffffff" }, label: "White" },
} satisfies StateValues;

// Font options are inline overrides on top of whatever font a given field
// normally renders in — "Heading"/"Serif" reuse the two decorative fonts
// already loaded for the rest of the site (see the Google Fonts <link> in
// app/(frontend)/layout.tsx), so picking them here always matches what's
// already on the page elsewhere. "Signature" is new — added specifically
// for owner-typed flourishes like a hand-signed closing line — see
// app/(frontend)/layout.tsx and app/(payload)/layout.tsx for where
// "Dancing Script" gets loaded from Google Fonts.
export const richTextFontState = {
  "font-heading": { css: { "font-family": '"Fredoka", sans-serif' }, label: "Heading (Fredoka)" },
  "font-serif": { css: { "font-family": '"Lora", Georgia, serif' }, label: "Serif (Lora)" },
  "font-signature": { css: { "font-family": '"Dancing Script", cursive' }, label: "Signature (script)" },
} satisfies StateValues;

// Absolute pixel sizes, not em/rem — deliberately, so "Large" looks the
// same size everywhere it's used regardless of which field/section it's
// applied in (an em-based size would instead scale off whatever that
// context's own font-size already is, which varies field to field across
// this site and would make "Large" unpredictable for a non-technical
// editor). The site's own base body size is 16px (app/(frontend)/globals.css),
// so these read as clearly-smaller/clearly-larger relative to that.
export const richTextSizeState = {
  "size-small": { css: { "font-size": "14px" }, label: "Small" },
  "size-large": { css: { "font-size": "20px" }, label: "Large" },
  "size-xlarge": { css: { "font-size": "28px" }, label: "Extra Large" },
} satisfies StateValues;

export const richTextState: TextStateConfig = {
  color: richTextColorState,
  font: richTextFontState,
  size: richTextSizeState,
};

// TextStateFeature only wires up the *admin editor's* live preview on its
// own (a mutation listener scoped to the Lexical editor instance — see
// node_modules/@payloadcms/richtext-lexical/dist/features/textState/textState.js).
// There's no built-in HTML/React converter for it — confirmed by reading
// every converter under that package's features/converters directory — so
// without this, a color/font chosen in /admin would show up while editing
// but never on the actual published page. This fills that gap: reads the
// per-node state Payload stores under Lexical's own reserved "$" key
// (NODE_STATE_KEY, see node_modules/lexical/LexicalConstants.d.ts) and
// turns it into a React inline style, for use by a custom `text` JSX
// converter (see components/StyledRichText.tsx).
export function styleFromNodeState(nodeState: unknown): CSSProperties | undefined {
  if (!nodeState || typeof nodeState !== "object") return undefined;
  let style: Record<string, string> | undefined;
  for (const stateKey of Object.keys(richTextState)) {
    const value = (nodeState as Record<string, unknown>)[stateKey];
    if (typeof value !== "string") continue;
    const css = richTextState[stateKey]?.[value]?.css;
    if (!css) continue;
    style = { ...style, ...cssHyphenToCamel(css) };
  }
  return style as CSSProperties | undefined;
}

// React inline `style` objects use camelCase keys ("fontFamily"), but
// TextStateFeature's own `css` values are typed as hyphenated CSS
// properties (`PropertiesHyphenFallback`, matching the raw CSS the admin
// editor applies directly via `dom.style`) — see feature.server.d.ts.
function cssHyphenToCamel(css: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(css)) {
    if (value === undefined) continue;
    result[key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value;
  }
  return result;
}
