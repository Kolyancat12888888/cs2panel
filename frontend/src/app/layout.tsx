import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "CS2Panel - High Performance CS2 Server Management",
  description: "Next-generation Counter-Strike 2 Server Management with Shared Master Instance orchestration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-cs2-dark text-cs2-text min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
