import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tykwriter.tykdev.com'),
  title: "Tykwriter - Votre Assistant Rédacteur",
  description: "Corrigez et sublimez vos textes instantanément grâce à l'intelligence artificielle.",
  openGraph: {
    title: "Tykwriter - Votre Assistant Rédacteur",
    description: "Corrigez et sublimez vos textes instantanément grâce à l'intelligence artificielle.",
    url: "https://tykwriter.tykdev.com",
    siteName: "Tykwriter",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
