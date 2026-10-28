import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is Relay's typeface (style guide, S1-12).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Relay · Kopano Freight",
  description: "AI-powered internal help desk for Kopano Freight",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions such as Grammarly add
          attributes to <html>/<body> before React loads. This only ignores
          attribute differences on these two tags, not on the rest of the page. */}
      <body className={`${inter.variable} bg-page text-ink antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
