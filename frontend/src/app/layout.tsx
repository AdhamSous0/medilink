import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediLink",
  description: "Healthcare referral coordination platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
