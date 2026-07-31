import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import CreatorFloatingButton from "@/components/creator/CreatorFloatingButton";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Ragebait — Win the roast. Claim the Aura.",
  description:
    "Ragebait is an AI-powered competitive roast battle platform. Compete in roast battles and debates, earn Aura, and climb the leaderboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body bg-atmosphere min-h-screen text-white">
        {/* Noise grain texture overlay */}
        <div className="noise-overlay" aria-hidden="true" />

        {/* Mobile / top navbar */}
        <Navbar />

        {/* Sidebar + page content split */}
        <div className="lg:flex lg:min-h-[calc(100vh-0px)]">
          <Sidebar />
          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
        <BottomNavigation />
        <CreatorFloatingButton />
      </body>
    </html>
  );
}
