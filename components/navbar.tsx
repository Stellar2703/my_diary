"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { userApi, getMediaUrl } from "@/lib/api"
import { userApi } from "@/lib/api"
import { UserSettingsDialog } from "./user-settings-dialog"

interface Notification {
  id: string
  type: string
  content: string
  post_id?: string
  from_user_id?: string
  from_user_name?: string
  from_user_username?: string
  is_read: boolean
  created_at: string
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, logout, user, isImpersonating, stopImpersonation } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const isActive = (path: string) => pathname === path
  const isSectionActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

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

  const markAsRead = async (id: string) => {
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

  const handleNotificationClick = async (notif: Notification) => {
    await markAsRead(notif.id)

    if (notif.post_id) {
      router.push(`/home?postId=${notif.post_id}`)
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity"
        >
          <MapPin className="w-6 h-6" />
          <span className="hidden sm:inline">my diary</span>
        </Link>

          {/* Center Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/home" isActive={isActive("/home")} icon={<Home className="w-4 h-4" />} label="Home" />
          <NavLink href="/search" isActive={isActive("/search")} icon={<Search className="w-4 h-4" />} label="Search" />
          <NavLink
            href="/departments"
            isActive={isSectionActive("/departments")}
            icon={<Users className="w-4 h-4" />}
            label="Departments"
          />
          {user?.role === "admin" && (
            <NavLink href="/admin" isActive={isSectionActive("/admin")} icon={<Shield className="w-4 h-4" />} label="Admin" />
          )}
        </div>

          {/* Right Actions */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="New Post" onClick={handleNewPost}>
              <Plus className="w-5 h-5" />
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar ? getMediaUrl(user.avatar) : undefined} alt={user?.name} />
                    <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      @{user?.username}
                    </p>
                    {isImpersonating && (
                      <p className="text-xs text-orange-600 font-medium">
                        Impersonating
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user?.username}`}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {isImpersonating && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={stopImpersonation}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Stop Impersonation</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {notif.type === "like" && <Heart className="w-4 h-4 text-destructive" />}
                              {notif.type === "comment" && <MessageCircle className="w-4 h-4 text-primary" />}
                              {notif.type === "share" && <Users className="w-4 h-4 text-primary" />}
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

      {isAuthenticated && (
        <>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className={`grid ${user?.role === "admin" ? "grid-cols-4" : "grid-cols-3"} gap-1 p-2`}>
              <MobileNavLink href="/home" isActive={isSectionActive("/home")} icon={<Home className="w-4 h-4" />} label="Home" />
              <MobileNavLink href="/search" isActive={isSectionActive("/search")} icon={<Search className="w-4 h-4" />} label="Search" />
              <MobileNavLink href="/departments" isActive={isSectionActive("/departments")} icon={<Users className="w-4 h-4" />} label="Departments" />
              {user?.role === "admin" && (
                <MobileNavLink href="/admin" isActive={isSectionActive("/admin")} icon={<Shield className="w-4 h-4" />} label="Admin" />
              )}
            </div>
          </nav>
          <div className="md:hidden h-20" />
        </>
      )}
    </>
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

function MobileNavLink({
  href,
  isActive,
  icon,
  label,
}: { href: string; isActive: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors ${
        isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
