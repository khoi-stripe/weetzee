"use client";

import { SerwistProvider } from "@serwist/next/react";
import type { ReactNode } from "react";

export function SerwistRegistration({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
    >
      {children}
    </SerwistProvider>
  );
}
