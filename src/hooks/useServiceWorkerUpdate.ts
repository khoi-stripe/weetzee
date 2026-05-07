"use client";

import { useEffect, useState } from "react";

/**
 * Watches the Serwist instance registered on `window.serwist` and exposes a
 * boolean that flips true when a new SW is sitting in the "waiting" state.
 * Calling `applyUpdate` posts SKIP_WAITING and reloads when the new SW
 * starts controlling the page.
 */
export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    function checkExisting() {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (cancelled) return;
        if (reg?.waiting && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    }

    function attach() {
      const w = (window as unknown as { serwist?: EventTarget }).serwist;
      if (!w) return false;
      const handleWaiting = () => setUpdateReady(true);
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

    const handleController = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", handleController);

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (typeof detach === "function") detach();
      navigator.serviceWorker.removeEventListener("controllerchange", handleController);
    };
  }, []);

  function applyUpdate() {
    const w = (window as unknown as {
      serwist?: { messageSkipWaiting?: () => void };
    }).serwist;
    if (w?.messageSkipWaiting) {
      w.messageSkipWaiting();
    } else {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
    }
  }

  return { updateReady, applyUpdate, dismiss: () => setUpdateReady(false) };
}
