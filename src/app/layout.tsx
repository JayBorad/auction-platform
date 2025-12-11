import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import AuthContextProvider from "@/context/AuthContext";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/toast";

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: "Auction Platform",
  description: "A professional platform for managing player auctions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body suppressHydrationWarning className={`${nunito.variable} font-sans bg-gray-950 text-gray-200 min-h-screen`}>
        <AuthContextProvider>
          <WebSocketProvider>
            <main>
              {children}
            </main>
            <Toaster />
          </WebSocketProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
