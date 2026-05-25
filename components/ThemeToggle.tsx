"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "dark" | "light"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null
    const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
    const activeTheme = storedTheme || preferredTheme

    setTheme(activeTheme)
    document.documentElement.setAttribute("data-theme", activeTheme)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"

    setTheme(nextTheme)
    localStorage.setItem("theme", nextTheme)
    document.documentElement.setAttribute("data-theme", nextTheme)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="linear-button-secondary h-9 w-9 p-0"
        aria-label="Toggle theme"
      >
        <Moon className="h-4 w-4" strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="linear-button-secondary h-9 w-9 p-0"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.5} />
      )}
    </button>
  )
}