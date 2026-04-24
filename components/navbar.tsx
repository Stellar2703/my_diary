"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Search, Home, Plus, Bell, Settings, LogOut, Users, Heart, MessageCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { userApi } from "@/lib/api"
import { UserSettingsDialog } from "./user-settings-dialog"

interface Notification {
  id: number
  type: string
  content: string
  post_id: number
  from_user_id: number
  from_user_name?: string
  from_user_username?: string
  is_read: boolean
  created_at: string
}

export function Navbar() {
  const pathname = usePathname()
  const { isAuthenticated, logout, user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const isActive = (path: string) => pathname === path

  // Load notifications
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications()
      // Refresh every 30 seconds
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const loadNotifications = async () => {
    try {
      const response = await userApi.getNotifications(1, 10)
      if (response.success && response.data) {
        const data: any = response.data
        const notifs = Array.isArray(data.notifications) ? data.notifications : []
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length)
      }
    } catch (error) {
      
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await userApi.markNotificationRead(id)
      loadNotifications()
    } catch (error) {
      
    }
  }

  const markAllAsRead = async () => {
    try {
      await userApi.markAllNotificationsRead()
      loadNotifications()
    } catch (error) {
      
    }
  }

  const handleNewPost = () => {
    // Scroll to top of home page where post upload card is
    if (pathname === "/home") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.location.href = "/home"
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity"
        >
          <MapPin className="w-6 h-6" />
          <span className="hidden sm:inline">Peekhour</span>
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/home" isActive={isActive("/home")} icon={<Home className="w-4 h-4" />} label="Home" />
          <NavLink href="/search" isActive={isActive("/search")} icon={<Search className="w-4 h-4" />} label="Search" />
          <NavLink
            href="/departments"
            isActive={isActive("/departments")}
            icon={<Users className="w-4 h-4" />}
            label="Departments"
          />
        </div>

        {/* Right Actions */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="New Post" onClick={handleNewPost}>
              <Plus className="w-5 h-5" />
            </Button>
            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" title="Notifications" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto py-1 px-2 text-xs">
                      Mark all read
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-96">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                            !notif.is_read ? "bg-primary/5" : ""
                          }`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {notif.type === "like" && <Heart className="w-4 h-4 text-destructive" />}
                              {notif.type === "comment" && <MessageCircle className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm">
                                <span className="font-semibold">
                                  {notif.from_user_name || "Someone"}
                                </span>{" "}
                                {notif.content}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {!notif.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <UserSettingsDialog />
            <Button variant="ghost" size="icon" className="text-destructive" title="Logout" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({
  href,
  isActive,
  icon,
  label,
}: { href: string; isActive: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      <span className="hidden sm:inline text-sm font-medium">{label}</span>
    </Link>
  )
}
