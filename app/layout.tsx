import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirbnbOptimizer",
  description: "Optimize your Airbnb listing with AI-powered recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
