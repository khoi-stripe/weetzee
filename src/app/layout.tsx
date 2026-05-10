import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { SerwistRegistration } from "@/components/SerwistRegistration";
import { InstallPromptLoader } from "@/components/InstallPromptLoader";
import { UpdatePromptLoader } from "@/components/UpdatePromptLoader";
import { NativeInit } from "@/components/NativeInit";
import "./globals.css";
import { COLOR } from "@/lib/color";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Weetzee",
  description: "Mobile dice game",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Weetzee",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: COLOR.surfaceBg,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body>
        <SerwistRegistration>
          {children}
          <InstallPromptLoader />
          <UpdatePromptLoader />
          <NativeInit />
        </SerwistRegistration>
      </body>
    </html>
  );
}
