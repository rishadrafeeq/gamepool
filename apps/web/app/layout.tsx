import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { getServerFirebaseClientConfig } from "@/lib/firebase/server-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GamePool",
    template: "%s | GamePool",
  },
  description:
    "Find players, teammates, and opponents. Create matches and play local sports.",
  applicationName: "GamePool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16A34A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const firebaseConfig = getServerFirebaseClientConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans`}>
        <AppProviders firebaseConfig={firebaseConfig}>{children}</AppProviders>
      </body>
    </html>
  );
}
