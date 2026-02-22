import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weetzee",
  description: "Mobile Yahtzee",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <filter id="wavy" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.01"
                numOctaves="3"
                seed="1"
              >
                <animate
                  attributeName="seed"
                  from="1"
                  to="3"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="12" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
