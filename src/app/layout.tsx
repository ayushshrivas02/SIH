import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sovereign AI | Private Industrial AI Workbench",
  description: "Secure on-premise AI for industrial workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="fixed inset-0 z-[-1] bg-noise"></div>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
