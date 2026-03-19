import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unified Manager",
  description: "Device, User, and Security Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0b0f19] text-slate-200 antialiased selection:bg-blue-500/30 min-h-full flex flex-col`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 ml-64 overflow-y-auto bg-gradient-to-br from-[#0b0f19] to-[#111827]">
            <div className="p-8 w-full min-h-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
