"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Watches the Serwist instance registered on `window.serwist` and exposes a
 * boolean that flips true when a new SW is sitting in the "waiting" state.
 * Calling `applyUpdate` posts SKIP_WAITING and reloads the page.
 *
 * Note: the SW uses skipWaiting:false / clientsClaim:false, so after
 * SKIP_WAITING the new SW activates but does NOT claim the existing client.
 * controllerchange therefore never fires — we reload manually instead.
 */
export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Capacitor.isNativePlatform()) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    function checkExisting() {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (cancelled) return;
        // Show toast whenever there's a waiting SW, regardless of whether
        // the current page has a controller (covers first-install updates too).
        if (reg?.waiting) {
          setUpdateReady(true);
        }
      });
    }

    function attach() {
      const w = (window as unknown as { serwist?: EventTarget }).serwist;
      if (!w) return false;
      const handleWaiting = () => { if (!cancelled) setUpdateReady(true); };
      w.addEventListener("waiting", handleWaiting);
      checkExisting();
      return () => w.removeEventListener("waiting", handleWaiting);
    }

    let detach: (() => void) | undefined | false = attach();
    let pollId: ReturnType<typeof setInterval> | null = null;
    if (!detach) {
      pollId = setInterval(() => {
        const result = attach();
        if (result) {
          detach = result;
          if (pollId) clearInterval(pollId);
          pollId = null;
        }
      }, 500);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (typeof detach === "function") detach();
    };
  }, []);

  function applyUpdate() {
    const w = (window as unknown as {
      serwist?: { messageSkipWaiting?: () => void };
    }).serwist;

    const postSkipWaiting = () =>
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      });

    if (w?.messageSkipWaiting) {
      w.messageSkipWaiting();
    } else {
      void postSkipWaiting();
    }

    // Reload after a short delay to let the new SW activate. We can't rely on
    // controllerchange because clientsClaim:false means the new SW won't claim
    // the existing client automatically.
    setTimeout(() => window.location.reload(), 400);
  }

  return { updateReady, applyUpdate, dismiss: () => setUpdateReady(false) };
}
