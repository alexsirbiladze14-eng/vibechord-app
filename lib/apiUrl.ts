/**
 * apiUrl.ts
 *
 * The Capacitor mobile build is a static export (see next.config.mjs's
 * CAPACITOR_BUILD flag) — it has no server of its own, so none of this
 * app's /api/* routes exist inside the mobile bundle. Every fetch to
 * those routes needs to instead go over the network to the real,
 * deployed Vercel URL. A normal web visit, by contrast, keeps using
 * relative paths — so it keeps working identically on localhost,
 * preview deployments, and production without ever touching this file.
 *
 * Capacitor.isNativePlatform() is the reliable way to tell these two
 * cases apart at runtime — true only when actually running inside the
 * native iOS/Android app shell, never in a regular browser tab (even
 * one that happens to be showing this exact same site).
 */

import { Capacitor } from "@capacitor/core";

// Your STABLE production domain — deliberately not a preview URL with
// a random deployment hash (those change on every push and would
// silently break the mobile app on the next update).
const DEPLOYED_API_BASE_URL = "https://vibechord-app.vercel.app";

export function apiUrl(path: string): string {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return `${DEPLOYED_API_BASE_URL}${path}`;
  }
  return path;
}