import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

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

export function hapticSuccess() {
  if (isNative) Haptics.notification({ type: NotificationType.Success });
}

export function hapticError() {
  if (isNative) Haptics.notification({ type: NotificationType.Error });
}

export function hapticWarning() {
  if (isNative) Haptics.notification({ type: NotificationType.Warning });
}

export function hapticDiceRoll() {
  if (!isNative) return;
  Haptics.selectionStart();
  const ticks = [40, 90, 140, 190];
  ticks.forEach((ms) => {
    setTimeout(() => Haptics.selectionChanged(), ms);
  });
  setTimeout(() => Haptics.selectionEnd(), 230);
}
