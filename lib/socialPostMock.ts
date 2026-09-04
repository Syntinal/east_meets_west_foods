// Shared marker prefixed onto every mock-mode message lib/socialPost.ts
// produces — both the success "note" and the failure "error" text, all 3
// branches in postToSocialPlatform()'s `if (!apiKey() || !account)` case.
// This is the one signal components/admin/SocialPostStatusNotice.tsx uses
// to tell a real platform result apart from a simulated one (no real
// POSTFORME_* credentials set for that platform yet — see CLAUDE.md,
// nobody has done this yet for any of the 3 platforms).
//
// Kept in its own tiny, dependency-free file rather than living directly in
// lib/socialPost.ts, specifically so the admin's client-side status notice
// can import just this constant without pulling lib/socialPost.ts's
// server-only vendor-API code (fetch calls, env var reads, etc.) into the
// client bundle.
//
// Why a real marker instead of matching on the message wording itself:
// the wording is meant to read as a helpful sentence to whoever's debugging
// env vars, and is free to be reworded later — a UI component keying off
// "does this start with the word 'Simulated'" would silently break the
// moment that wording changed for clarity. This prefix is the deliberate,
// stable contract between the two; strip it before displaying the rest of
// the text to a user.
export const MOCK_NOTE_PREFIX = "[[mock mode]] ";
