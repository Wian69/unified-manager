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
        <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
          <Sidebar />
          <main className="flex-1 ml-64 overflow-y-auto bg-gradient-to-br from-[#0b0f19] to-[#111827] print:ml-0 print:overflow-visible print:bg-white print:text-black">
            <div className="p-8 w-full min-h-full print:p-0 print:min-h-0">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
