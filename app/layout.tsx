import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { OrderListProvider } from "@/components/OrderListProvider";

function getMetadataBase(): URL {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envUrl) {
    try {
      const formatted =
        envUrl.startsWith("http://") || envUrl.startsWith("https://")
          ? envUrl
          : `https://${envUrl}`;
      return new URL(formatted);
    } catch {
      // Fallback on parse failure
    }
  }
  return new URL("https://ppr-fruits-and-vegetables.vercel.app");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "P.P.R. Fruits and Vegetables — Fresh Daily, Coimbatore",
  description:
    "Order fresh vegetables and fruits from P.P.R. Fruits and Vegetables in Coimbatore. Browse the catalog and pre-book next-day delivery.",
  keywords: ["fresh vegetables", "fruits", "coimbatore", "vegetable shop", "PPR", "pre-order"],
  authors: [{ name: "Jayaraman P" }],
  openGraph: {
    type: "website",
    title: "P.P.R. Fruits and Vegetables — Fresh Daily",
    description: "Fresh vegetables and fruits, next-day pre-order. Coimbatore, Tamil Nadu.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "P.P.R. Fruits and Vegetables — fresh produce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "P.P.R. Fruits and Vegetables",
    description: "Fresh produce, next-day pre-order. Coimbatore, Tamil Nadu.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PPR Fresh",
  },
  other: {
    "apple-touch-startup-image": "/splash/apple-splash-1170x2532.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1A6B47",
};

import BottomNav from "@/components/BottomNav";
import LeaveBanner from "@/components/LeaveBanner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/png" href="/icons/icon-32.png?v=12" sizes="32x32" />
        <link rel="icon" type="image/png" href="/icons/icon-16.png?v=12" sizes="16x16" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=12" />
        <link rel="shortcut icon" href="/favicon.ico?v=12" />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost' && !location.hostname.startsWith('192.168')) {
                function registerSW() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                }
                if (document.readyState === 'complete') {
                  registerSW();
                } else {
                  window.addEventListener('load', registerSW, { once: true });
                }
              }
            `,
          }}
        />
      </head>
      <body>
        <div id="app-wrapper">
          <OrderListProvider>
            <LeaveBanner />
            {children}
            <BottomNav />
          </OrderListProvider>
        </div>
      </body>
    </html>
  );
}
