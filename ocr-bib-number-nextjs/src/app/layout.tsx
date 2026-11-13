import type { Metadata } from "next";


import "./globals.css";

export const metadata: Metadata = {
  title: "Foto in Aja - Marathon Photo Portal & BIB Search",
  description: "Platform pencarian dan kepemilikan foto marathon instan menggunakan deteksi BIB otomatis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
