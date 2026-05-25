"use client"

import { motion } from "framer-motion"
import {
  LayoutDashboard,
  CalendarClock,
  BarChart3,
  Share2,
  LogOut,
  MessageCircle,
} from "lucide-react"
import { BsTwitterX } from "react-icons/bs"
import { SiMastodon, SiThreads } from "react-icons/si"
import { usePathname, useRouter } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/publishing", label: "Publishing", icon: CalendarClock },
  { href: "/twitter", label: "Twitter / X", icon: BsTwitterX },
  { href: "/mastodon", label: "Mastodon", icon: SiMastodon },
  { href: "/threads", label: "Threads", icon: SiThreads },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    })

    window.location.href = "/login"
  }

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 glass border-r border-white/5 h-screen sticky top-0 hidden md:flex flex-col z-50"
    >
      <div className="p-8">
        <div
          className="flex items-center gap-3 text-purple-500 mb-10 cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Share2 className="text-white w-6 h-6" />
          </div>

          <span className="font-bold text-xl text-white">
            SproutPulse
          </span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${
                  isActive
                    ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isActive ? "text-purple-400" : "text-gray-500"
                  }`}
                />

                <span className="font-medium">
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500"
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-3">
        <button
          onClick={handleLogout}
          className="flex flex-row justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/20 w-full"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </motion.aside>
  )
}