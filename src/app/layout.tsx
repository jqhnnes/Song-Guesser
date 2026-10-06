import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import { GameProvider } from "@/components/game/provider";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Timeline",
  description: "A party game. Listen, then place the song on the year.",
  applicationName: "Timeline",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Timeline",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${display.variable} h-full antialiased`}>
      <body className="h-full">
        <div className="stage">
          <div className="phone">
            <GameProvider>{children}</GameProvider>
          </div>
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
