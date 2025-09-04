import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";
import { Outfit } from "next/font/google";
import type { Metadata } from "next";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextGen ERP - Custom Enterprise Resource Planning",
  description: "A comprehensive Enterprise Resource Planning (ERP) system built for CA Mine and NextGen Technology Limited, Papua New Guinea",
  keywords: ["ERP", "Enterprise Resource Planning", "Mining", "Papua New Guinea", "Business Management"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
