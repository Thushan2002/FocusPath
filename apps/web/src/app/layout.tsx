import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "FocusPath AI", template: "%s · FocusPath AI" },
  description: "One goal, a realistic daily plan, and an AI tutor that knows where you are.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0D6E5F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
