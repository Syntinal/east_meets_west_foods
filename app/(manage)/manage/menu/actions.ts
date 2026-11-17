"use server";

import { getManageSession } from "@/lib/manage/auth";
import * as ops from "@/lib/manage/menuOps";
import type { PriceRow } from "@/lib/manage/menu";

// Thin server actions: check the signed-in session, then hand that user to
// lib/manage/menuOps.ts (which passes it with overrideAccess: false on
// every Payload call). Nothing here runs for a signed-out visitor.

const SIGNED_OUT = { ok: false as const, message: "You've been signed out. Please sign in again." };

async function withSession<T>(fn: (s: ops.S) => Promise<T>): Promise<T | typeof SIGNED_OUT> {
  const { payload, user } = await getManageSession();
  if (!user) return SIGNED_OUT;
  return fn({ payload, user });
}

export async function saveMenuItem(input: {
  id?: number | string;
  group?: "main" | "extras";
  title: string;
  tag: string;
  description: string;
  imageId: number | string | null;
  priceOptions: PriceRow[];
}) {
  return withSession((s) => ops.saveMenuItem(s, input));
}
export async function publishMenuItem(id: number | string) {
  return withSession((s) => ops.publishMenuItem(s, id));
}
export async function publishMenuItems(ids: (number | string)[]) {
  return withSession((s) => ops.publishMenuItems(s, ids));
}
export async function discardMenuChanges(id: number | string) {
  return withSession((s) => ops.discardMenuChanges(s, id));
}
export async function undoMenuChange(token: ops.UndoToken) {
  return withSession((s) => ops.undoMenuChange(s, token));
}
export async function setSoldOutToday(itemId: number | string, soldOut: boolean) {
  return withSession((s) => ops.setSoldOutToday(s, itemId, soldOut));
}
export async function removeMenuItem(id: number | string) {
  return withSession((s) => ops.removeMenuItem(s, id));
}
export async function restoreMenuItem(id: number | string) {
  return withSession((s) => ops.restoreMenuItem(s, id));
}
