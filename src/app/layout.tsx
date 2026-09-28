import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Baloo_2, Baloo_Tammudu_2, Noto_Sans_Telugu } from "next/font/google";
import { ServiceWorker } from "@/components/ui/ServiceWorker";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", display: "swap" });
const balooTe = Baloo_Tammudu_2({ subsets: ["telugu"], variable: "--font-baloo-te", display: "swap" });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });
const notoTe = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-noto-te", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Memory Garden", template: "%s · Memory Garden" },
  description:
    "A warm, personal memory adventure for people living with dementia — made from their own photographs, voices and stories.",
  applicationName: "Memory Garden",
  appleWebApp: { capable: true, title: "Memory Garden", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fff8ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${baloo.variable} ${balooTe.variable} ${atkinson.variable} ${notoTe.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
