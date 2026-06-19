import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Craftify Emergency — Instant Emergency Repair Services",
  description: "Get emergency plumbers, electricians, locksmiths, and more dispatched to your location within minutes. 24/7 availability with real-time tracking.",
  keywords: "emergency repair, plumber, electrician, locksmith, HVAC, emergency services, home repair",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
