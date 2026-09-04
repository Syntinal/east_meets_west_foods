import type { ServerFunctionClient } from "payload";
import config from "@payload-config";
import "@payloadcms/next/css";
import "./admin.css";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import React from "react";
import { importMap } from "./admin/importMap.js";

type Args = {
  children: React.ReactNode;
};

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <>
    {/* RootLayout (below) renders its own <html>/<head> opaquely — this
        admin route group has no <head> of its own to add a font link to
        the way app/(frontend)/layout.tsx does directly. Next.js/React 19
        hoist <link> tags into <head> regardless of where in the tree they
        render, so a sibling here reaches the same place. Loads just Inter
        (not the frontend's full Bowlby/Saira/Fredoka/Lora/Noto stack —
        those are decorative/heading fonts for the public site, not
        relevant to admin form chrome) so admin.css's --font-body override
        actually renders in Inter instead of silently falling back.
        `precedence` is required on a hoisted `rel="stylesheet"` link (React
        needs to know where to slot it relative to other stylesheets it's
        managing) — omitting it isn't just a lint nag, it throws at runtime.
        The frontend's own <link> doesn't need this: it's written directly
        inside a literal <head> it renders itself, not hoisted. */}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
      precedence="default"
    />
    {/* A second, separate stylesheet for the richText "Text Style" toolbar's
        font choices (see lib/richTextState.ts) — Fredoka/Lora already load
        on the public site, Dancing Script is new (added there too, in
        app/(frontend)/layout.tsx). Loaded here so an editor picking one of
        these actually previews in the real font while typing, instead of a
        fallback that only starts looking right after publishing. Doesn't
        change the reasoning above: admin form chrome (labels, buttons, the
        rest of admin.css's --font-body) still renders in Inter only, this
        is purely for text *inside* richText fields. */}
    <link
      href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Dancing+Script:wght@400;600;700&display=swap"
      rel="stylesheet"
      precedence="default"
    />
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  </>
);

export default Layout;
