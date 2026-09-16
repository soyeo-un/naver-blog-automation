import type { Metadata } from "next";
import { Geist, Geist_Mono, Silkscreen, Gamja_Flower } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const silkscreen = Silkscreen({
  variable: "--font-pixel",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const gamjaFlower = Gamja_Flower({
  variable: "--font-handwriting",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "숀로그 auto",
  description: "숀로그 auto - AI 기반 블로그 글 작성 도우미",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${silkscreen.variable} ${gamjaFlower.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
