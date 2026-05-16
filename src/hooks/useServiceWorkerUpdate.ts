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
    const log = (...args: unknown[]) => console.log("[SW update]", ...args);

    function onWaiting() {
      log("waiting SW detected → showing toast");
      if (!cancelled) setUpdateReady(true);
    }

    function trackInstalling(sw: ServiceWorker) {
      log("tracking installing SW, current state:", sw.state);
      sw.addEventListener("statechange", function handler() {
        log("SW statechange →", sw.state);
        if (sw.state === "installed") {
          sw.removeEventListener("statechange", handler);
          onWaiting();
        }
      });
    }

    function setupOn(reg: ServiceWorkerRegistration) {
      log("setupOn — active:", reg.active?.state, "waiting:", reg.waiting?.state, "installing:", reg.installing?.state);
      if (reg.waiting) { onWaiting(); return; }
      if (reg.installing) trackInstalling(reg.installing);
      reg.addEventListener("updatefound", () => {
        log("updatefound");
        const sw = reg.installing;
        if (sw) trackInstalling(sw);
      });
    }

    log("hook mounted, controller:", navigator.serviceWorker.controller?.state ?? "none");

    // Check any registration that already exists (covers already-waiting SW on load)
    navigator.serviceWorker.getRegistration().then((reg) => {
      log("getRegistration →", reg ? "found" : "none");
      if (cancelled || !reg) return;
      setupOn(reg);
    });

    // Also hook into ready, which covers the case where SerwistProvider
    // registers the SW asynchronously after this effect runs.
    navigator.serviceWorker.ready.then((reg) => {
      log("ready resolved — active:", reg.active?.state);
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
