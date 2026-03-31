import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://image-background-remover.zhuwd.com";
const ogImageUrl = `${siteUrl}/og-image.png`;
const siteName = "RemoveBG Pro";
const shortDescription =
  "One-click AI background removal. Upload your image and get a transparent PNG in seconds. No signup required for free tier.";

export const metadata: Metadata = {
  title: {
    default: "RemoveBG Pro — AI Background Remover",
    template: `%s | RemoveBG Pro`,
  },
  description: shortDescription,
  keywords: [
    "background remover",
    "remove background",
    "image background removal",
    "transparent background",
    "product photo editor",
    "AI background eraser",
    "free background remover",
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: "RemoveBG Pro — One-Click AI Background Remover",
    description: shortDescription,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "RemoveBG Pro — AI Background Remover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@Weldon_cn",
    creator: "@Weldon_cn",
    title: "RemoveBG Pro — One-Click AI Background Remover",
    description: shortDescription,
    images: [ogImageUrl],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
} satisfies Viewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZTXPYDEG5H"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZTXPYDEG5H');
          `}
        </Script>
        {children}</body>
    </html>
  );
}
