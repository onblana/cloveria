import type { Metadata, Viewport } from "next";
import { FontGate } from "@/components/FontGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloveria",
  description: "클로버 마을에서 농사지은 재료로 요리를 만들어 식당을 경영하는 게임",
};

// 모바일 웹 기준. viewportFit은 노치가 있는 기기에서 화면 끝까지 쓰기 위한 설정
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <FontGate>{children}</FontGate>
      </body>
    </html>
  );
}
