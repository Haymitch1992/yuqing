import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "交控科技舆情日报",
  description: "每个自然日自动生成交控科技舆情报告，并发送到指定邮箱；也可手动预览后再发。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#f6f3ec] text-[#1c1917] antialiased`}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
