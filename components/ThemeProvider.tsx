"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme") as Theme | null;
        const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

        const activeTheme = storedTheme || preferredTheme;

        document.documentElement.setAttribute("data-theme", activeTheme);
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>{children}</>;
    }

    return <>{children}</>;
}
