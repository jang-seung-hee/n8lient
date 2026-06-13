// 이 파일은 Next.js 앱 전체 루트 레이아웃입니다.
// AuthProvider로 앱 전체를 감싸 Auth 컨텍스트를 공급합니다.

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import InAppBrowserGuard from "@/components/custom/InAppBrowserGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "N8Lient — n8n 자동화 클라이언트",
  description: "엔팔라이언트: n8n 자동화 워크플로우를 직접 실행하고 결과를 확인하는 웹 기반 자동화 클라이언트입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 앱 전체에 Firebase Auth 컨텍스트 및 인앱 브라우저 진입 제한 가드를 적용합니다 */}
        <AuthProvider>
          <InAppBrowserGuard>{children}</InAppBrowserGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
