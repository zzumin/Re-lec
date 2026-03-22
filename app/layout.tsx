import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "강의 에이전트 | Lecture Agent",
  description: "수업 녹취록과 강의자료로 완벽한 강의 해설을 자동 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
