"use client";

import dynamic from "next/dynamic";

const UpdatePrompt = dynamic(
  () => import("./UpdatePrompt").then((m) => m.UpdatePrompt),
  { ssr: false, loading: () => null }
);

export function UpdatePromptLoader() {
  return <UpdatePrompt />;
}
