"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Capacitor.isNativePlatform()) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    function onWaiting() {
      if (!cancelled) setUpdateReady(true);
    }

    function trackInstalling(sw: ServiceWorker) {
      sw.addEventListener("statechange", function handler() {
        if (sw.state === "installed") {
          sw.removeEventListener("statechange", handler);
          onWaiting();
        }
      });
    }

    function setupOn(reg: ServiceWorkerRegistration) {
      if (reg.waiting) { onWaiting(); return; }
      if (reg.installing) trackInstalling(reg.installing);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (sw) trackInstalling(sw);
      });
    }

    // Check any registration that already exists (covers already-waiting SW on load)
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (cancelled || !reg) return;
      setupOn(reg);
    });

    // Also hook into ready, which covers the case where SerwistProvider
    // registers the SW asynchronously after this effect runs.
    navigator.serviceWorker.ready.then((reg) => {
      if (cancelled) return;
      setupOn(reg);
    });

    return () => { cancelled = true; };
  }, []);

  function applyUpdate() {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
    // Reload after giving the new SW time to activate.
    // clientsClaim:false means controllerchange won't fire, so we reload manually.
    setTimeout(() => window.location.reload(), 400);
  }

  return { updateReady, applyUpdate, dismiss: () => setUpdateReady(false) };
}
