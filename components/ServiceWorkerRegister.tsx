"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register in production. During development, the service worker
    // aggressively caches build files — every time you edit code and the
    // build hash changes, it keeps serving the OLD cached files, causing
    // confusing 404s and stale content that look like real bugs but
    // aren't. This is exactly what happened when testing Week 4.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silently ignore — offline support is a nice-to-have, not critical.
      });
    }
  }, []);

  return null;
}
