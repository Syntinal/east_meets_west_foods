"use server";

import { getManageSession } from "@/lib/manage/auth";
import * as ops from "@/lib/manage/postsOps";

// Thin server actions: check the signed-in session, then hand that user to
// lib/manage/postsOps.ts (overrideAccess: false on every Payload call).

const SIGNED_OUT = { ok: false as const, message: "You've been signed out. Please sign in again." };

async function withSession<T>(fn: (s: ops.S) => Promise<T>): Promise<T | typeof SIGNED_OUT> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  return fn({ payload, user });
}

export async function updatePost(input: { id: number | string; message: string; banner: ops.BannerChoice }) {
  return withSession((s) => ops.updatePost(s, input));
}
export async function undoPostChange(token: ops.PostUndo) {
  return withSession((s) => ops.undoPostChange(s, token));
}
export async function removePost(id: number | string) {
  return withSession((s) => ops.removePost(s, id));
}
export async function restorePost(id: number | string) {
  return withSession((s) => ops.restorePost(s, id));
}
