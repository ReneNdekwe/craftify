import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Craftify — On-Demand Professional Home Repairs",
  description: "Get plumbers, electricians, locksmiths, and more dispatched to your location within minutes. 24/7 availability with transparent pricing and real-time tracking.",
  keywords: "home repair, plumber, electrician, locksmith, handyman, on-demand services, home maintenance",
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
