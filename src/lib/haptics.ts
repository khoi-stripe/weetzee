import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const isNative = Capacitor.isNativePlatform();

export function hapticLight() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Light });
}

export function hapticMedium() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Medium });
}

export function hapticHeavy() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Heavy });
}
