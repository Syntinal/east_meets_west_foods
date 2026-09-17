import { revalidatePath } from "next/cache";

// Payload sometimes runs a collection's `afterChange`/`afterDelete` hooks
// synchronously as part of rendering an admin page, not just from a real
// Route Handler-driven save. The clearest case: opening "Create new" (or
// "Duplicate") on a collection with `versions.drafts.autosave` enabled
// makes @payloadcms/next silently pre-create an empty (or copied) draft
// *during the server render* of the Document view, purely to seed a real
// `id` for the client-side Autosave component to PATCH against (see
// node_modules/@payloadcms/next/dist/views/Document/index.js, the
// `shouldAutosave && !idFromArgs` branch). That create runs our hooks like
// any other.
//
// Next.js forbids calling `revalidatePath` during a render ("used
// ... during render which is unsupported") — only Route Handlers/Server
// Actions may call it. A plain `revalidatePath` call in a hook throws in
// that context, and since the throw happens inside the admin's own
// render, it blanks the whole Create-new page instead of just skipping a
// revalidation.
//
// It's safe to swallow specifically this error: the pre-seeded draft has
// nothing worth revalidating yet (nothing real changed), and the next
// genuine save (autosave PATCH, Save Draft, Publish) runs through a normal
// request handler, where revalidatePath is allowed, and revalidates then.
export function safeRevalidatePath(path: string, type?: "layout" | "page") {
  try {
    revalidatePath(path, type);
  } catch (err) {
    const isRenderTimeRevalidate =
      err instanceof Error && err.message.includes("unsupported") && err.message.includes("revalidatePath");
    if (isRenderTimeRevalidate) return;
    throw err;
  }
}
