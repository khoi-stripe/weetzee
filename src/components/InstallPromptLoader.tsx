"use client";

import dynamic from "next/dynamic";

const InstallPrompt = dynamic(
  () => import("./InstallPrompt").then((m) => m.InstallPrompt),
  { ssr: false, loading: () => null }
);

export function InstallPromptLoader() {
  return <InstallPrompt />;
}
