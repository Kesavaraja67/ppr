import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1080x1920.png"
          media="(device-width: 360px) and (device-height: 640px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link rel="icon" type="image/png" href="/icons/icon-32.png?v=2" sizes="32x32" />
        <link rel="icon" type="image/png" href="/icons/icon-16.png?v=2" sizes="16x16" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost' && !location.hostname.startsWith('192.168')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <div id="app-wrapper">
          <OrderListProvider>
            {children}
            <BottomNav />
          </OrderListProvider>
        </div>
      </body>
    </html>
  );
}
