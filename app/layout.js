// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load Google fonts
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Metadata for SEO + PWA
export const metadata = {
  title: "SmartFundus – Mobile Fundus Camera",
  description:
    "Smartphone-based fundus photography PWA using a +20 to +28D lens for retinal imaging.",
  themeColor: "#000000", // Dark mode theme color
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

// Viewport settings for mobile
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-black">
      <head>
        {/* Ensure theme color is respected */}
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-black text-white min-h-screen`}
      >
        <main className="w-full max-w-md mx-auto min-h-screen bg-neutral-900 shadow-lg">
          {children}
        </main>
      </body>
    </html>
  );
}
