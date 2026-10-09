import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who Are You Really? — ตอบตามบท จับตัวตนเพื่อนให้ได้",
  description:
    "เว็บเกมแข่งขัน 2 คน รับบทบาทลับ ตอบสถานการณ์ตามบท แล้วทายว่าเพื่อนเป็นใคร เล่นบนมือถือคนละเครื่อง ไม่ต้องสมัครสมาชิก",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="theme-color" content="#DCCFA8" />
      </head>
      <body>{children}</body>
    </html>
  );
}
