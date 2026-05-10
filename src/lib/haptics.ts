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
  // Initial "throw" impact when the dice leave the cup.
  Haptics.impact({ style: ImpactStyle.Heavy });
  // Series of heavy thuds while the dice tumble. Spaced ~110ms so iOS's
  // haptic engine doesn't coalesce them. Per-die Medium "land" haptics
  // fire later from playSettle to round out the feel.
  const ticks = [110, 220, 330];
  ticks.forEach((ms) => {
    setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), ms);
  });
}
