"use client";

import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { getIsSupporter, setIsSupporter } from "@/lib/supporter";

const ENTITLEMENT_ID = "supporter";

export function useSupporter() {
  const [isSupporter, setLocal] = useState(() => getIsSupporter());
  const [loading, setLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;

    import("@revenuecat/purchases-capacitor").then(({ Purchases }) => {
      Purchases.getCustomerInfo().then(({ customerInfo }) => {
        if (cancelled) return;
        const entitled = ENTITLEMENT_ID in (customerInfo.entitlements.active ?? {});
        setLocal(entitled);
        setIsSupporter(entitled);
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [isNative]);

  const purchase = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    // TODO: wire up RevenueCat before submission
    setLocal(true);
    setIsSupporter(true);
    return true;
  }, [isNative]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    setLoading(true);
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo } = await Purchases.restorePurchases();
      const entitled = ENTITLEMENT_ID in (customerInfo.entitlements.active ?? {});
      setLocal(entitled);
      setIsSupporter(entitled);
      setLoading(false);
      return entitled;
    } catch {
      setLoading(false);
      return false;
    }
  }, [isNative]);

  return { isSupporter, purchase, restore, loading, isNative };
}
