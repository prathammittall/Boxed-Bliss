import type { Metadata } from "next";
import { Playfair_Display, Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import FloatingContactButton from "@/components/FloatingContactButton";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Boxed Bliss - Handcrafted Gifts, Boxed with Joy",
  description:
    "Discover handcrafted gift boxes, occasion hampers, pipe cleaner creations, and personalised phone cases. Curated with bliss, delivered with love.",
  keywords: ["gift boxes", "hampers", "handmade gifts", "occasion gifts", "pipe cleaner art"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${dancing.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        {children}
        <FloatingContactButton />
      </body>
    </html>
  );
}
