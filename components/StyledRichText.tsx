import type { ComponentProps } from "react";
import { RichText as PayloadRichText } from "@payloadcms/richtext-lexical/react";
import { styleFromNodeState } from "@/lib/richTextState";

// Drop-in replacement for @payloadcms/richtext-lexical/react's <RichText>,
// used everywhere on the frontend instead of importing that directly (see
// every component under components/ that renders a richText field). Adds
// one converter override so the color/font an editor picks in /admin via
// the TextStateFeature toolbar (see payload.config.ts, lib/richTextState.ts)
// actually shows up on the published page — Payload's own default `text`
// converter has no idea that feature exists, since TextStateFeature only
// wires up the admin editor's own live preview, not any HTML/React output.
// Everything else (paragraphs, headings, links, lists, uploads...) passes
// straight through to Payload's own defaults, untouched.
type Props = ComponentProps<typeof PayloadRichText>;

export function RichText(props: Props) {
  return (
    <PayloadRichText
      {...props}
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        text: (args) => {
          // defaultConverters.text is typed as a function-or-plain-ReactNode
          // union (JSXConverters' generic shape allows either) even though
          // it's always the former in practice — narrow it before calling.
          const text = typeof defaultConverters.text === "function" ? defaultConverters.text(args) : defaultConverters.text;
          // node.$ is Lexical's own reserved per-node "state" bucket
          // (NODE_STATE_KEY, see node_modules/lexical/LexicalConstants.d.ts)
          // — not in @payloadcms/richtext-lexical's SerializedTextNode type
          // since it's feature-defined, hence the narrow cast here rather
          // than loosening the shared node type.
          const style = styleFromNodeState((args.node as { $?: unknown }).$);
          if (!style) return text;
          return <span style={style}>{text}</span>;
        },
      })}
    />
  );
}
