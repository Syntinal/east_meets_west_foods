"use server";

import { getManageSession } from "@/lib/manage/auth";
import * as ops from "@/lib/manage/reviewOps";

// Thin server actions: check the signed-in session, then hand that user to
// lib/manage/reviewOps.ts (overrideAccess: false on every Payload call).

const SIGNED_OUT = { ok: false as const, message: "You've been signed out. Please sign in again." };

async function withSession<T>(fn: (s: ops.S) => Promise<T>): Promise<T | typeof SIGNED_OUT> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  return fn({ payload, user });
}

export async function addReview(input: ops.ReviewInput) {
  return withSession((s) => ops.addReview(s, input));
}
export async function updateReview(id: number | string, input: ops.ReviewInput) {
  return withSession((s) => ops.updateReview(s, id, input));
}
export async function setReviewOnWebsite(id: number | string, onWebsite: boolean) {
  return withSession((s) => ops.setReviewOnWebsite(s, id, onWebsite));
}
