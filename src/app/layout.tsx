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
  title: "調整さんネオ | 日程調整を簡単に",
  description:
    "日程調整をもっと簡単に。候補日を設定して、みんなの都合を集めましょう。",
  openGraph: {
    title: "調整さんネオ | 日程調整を簡単に",
    description:
      "日程調整をもっと簡単に。候補日を設定して、みんなの都合を集めましょう。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
