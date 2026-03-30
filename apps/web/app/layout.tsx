import type { Metadata } from "next";
import { Cinzel, Space_Grotesk } from "next/font/google";

import "./globals.css";

const displayFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display"
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Project Game",
  description: "An AI-native living-world virtual tabletop for online home groups."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
