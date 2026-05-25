"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="linear-page flex min-h-screen overflow-hidden">
            <Sidebar />

            <div className="flex h-screen min-w-0 flex-1 flex-col">
                <Navbar />

                <main className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
                    <div className="mx-auto w-full max-w-[1440px]">{children}</div>
                </main>
            </div>
        </div>
    );
}
