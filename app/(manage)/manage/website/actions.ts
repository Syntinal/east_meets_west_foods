"use server";

import { getManageSession } from "@/lib/manage/auth";
import * as ops from "@/lib/manage/websiteOps";
import type { FieldValue } from "@/lib/manage/websitePages";

// Thin server actions: check the signed-in session, then hand that user to
// lib/manage/websiteOps.ts (overrideAccess: false on every Payload call).

const SIGNED_OUT = { ok: false as const, message: "You've been signed out. Please sign in again." };

async function withSession<T>(fn: (s: ops.S) => Promise<T>): Promise<T | typeof SIGNED_OUT> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  return fn({ payload, user });
}

export async function savePageSection(input: { slug: string; sectionKey: string; values: Record<string, FieldValue> }) {
  return withSession((s) => ops.savePageSection(s, input));
}
export async function publishPage(slug: string) {
  return withSession((s) => ops.publishPage(s, slug));
}
export async function publishPages(slugs: string[]) {
  return withSession((s) => ops.publishPages(s, slugs));
}
export async function discardPageChanges(slug: string) {
  return withSession((s) => ops.discardPageChanges(s, slug));
}
export async function undoPageChange(token: ops.PageUndo) {
  return withSession((s) => ops.undoPageChange(s, token));
}
