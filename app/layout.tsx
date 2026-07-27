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

import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale active (cookie NEXT_LOCALE, défaut 'fr') — voir i18n/request.ts.
  const locale = await getLocale();
  // Thème (cookie tyk-theme, défaut clair) : classe posée côté serveur pour
  // éviter tout flash au chargement. Bascule : components/ui/ThemeToggle.
  const cookieStore = await cookies();
  const isDark = cookieStore.get('tyk-theme')?.value === 'dark';

  return (
    <html lang={locale} className={isDark ? 'dark' : undefined} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col`}
      >
        <NextIntlClientProvider>
          <Suspense fallback={<div className="h-16 w-full bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800"></div>}>
            <Navbar />
          </Suspense>
          <main className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
