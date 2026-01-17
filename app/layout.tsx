import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Are u ok?",
  description: "Privacy-first voice health monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-background text-foreground">
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
