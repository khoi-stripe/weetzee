"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

const RC_IOS_KEY = "test_yehjPiFCypshgzXG5BGWFgvIIee";
const RC_ANDROID_KEY = "test_yehjPiFCypshgzXG5BGWFgvIIee";

export function NativeInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    import("@capacitor/splash-screen").then(({ SplashScreen }) => {
      SplashScreen.hide({ fadeOutDuration: 0 });
    }).catch(() => {});

    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: "#000000" });
    }).catch(() => {});

    import("@revenuecat/purchases-capacitor").then(({ Purchases }) => {
      const platform = Capacitor.getPlatform();
      const apiKey = platform === "ios" ? RC_IOS_KEY : RC_ANDROID_KEY;
      Purchases.configure({ apiKey });
    }).catch(() => {});
  }, []);

  return null;
}
