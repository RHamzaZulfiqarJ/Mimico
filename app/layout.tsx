import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import CursorTracker from "@/components/CursorTracker";

export const metadata: Metadata = {
    title: "MIMICO - Social Account Manager",
    description: "A focused workspace for managing social accounts, publishing, and messaging.",
    icons: {
        icon: [
            {
                url: "/favicon-16x16.png",
                sizes: "16x16",
                type: "image/png",
            },
            {
                url: "/favicon-32x32.png",
                sizes: "32x32",
                type: "image/png",
            },
        ],
        apple: [
            {
                url: "/apple-touch-icon.png",
                sizes: "180x180",
                type: "image/png",
            },
        ],
        other: [
            {
                rel: "android-chrome-192x192",
                url: "/android-chrome-192x192.png",
            },
            {
                rel: "android-chrome-512x512",
                url: "/android-chrome-512x512.png",
            },
        ],
    },
    manifest: "/site.webmanifest",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-theme="dark" suppressHydrationWarning>
            <body className="min-h-screen overflow-x-hidden bg-[var(--canvas)] text-[var(--text-body)] antialiased">
                <ThemeProvider>
                    <CursorTracker />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
