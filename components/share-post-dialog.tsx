"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Share2 } from "lucide-react"
import { postsApi, userApi } from "@/lib/api"
import { toast } from "sonner"

interface ShareRecipient {
  id: string
  name: string
  username: string
  avatar?: string
}

interface SharePostDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  postId: string | number
  onShared?: () => void
}

function getAvatarUrl(avatar?: string) {
  if (!avatar) return null
  if (avatar.startsWith("http")) return avatar
  if (avatar.startsWith("/")) return `http://localhost:5000${avatar}`
  if (avatar.startsWith("uploads/")) return `http://localhost:5000/${avatar}`
  return `http://localhost:5000/uploads/${avatar}`
}

export function SharePostDialog({ isOpen, onOpenChange, postId, onShared }: SharePostDialogProps) {
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<ShareRecipient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sharingUserId, setSharingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    loadUsers("")
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      loadUsers(search)
    }, 250)

    return () => clearTimeout(timer)
  }, [search, isOpen])

  const loadUsers = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await userApi.getShareRecipients(query, 1, 30)
      if (response.success && response.data) {
        const data: any = response.data
        setUsers(Array.isArray(data.recipients) ? data.recipients : [])
      }
    } catch (error) {
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareToUser = async (recipientUserId: string, recipientName: string) => {
    setSharingUserId(recipientUserId)
    try {
      const response = await postsApi.shareToUser(postId, recipientUserId)
      if (response.success) {
        toast.success(`Shared with ${recipientName}`)
        onShared?.()
        onOpenChange(false)
      } else {
        toast.error(response.message || "Failed to share post")
      }
    } catch (error) {
      toast.error("Failed to share post")
    } finally {
      setSharingUserId(null)
    }
  }

  const emptyStateMessage = useMemo(() => {
    if (isLoading) return "Loading users..."
    if (search.trim()) return "No users match your search"
    return "No users available"
  }, [isLoading, search])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
          <DialogDescription>Choose a user to share this post with</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username"
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-72 rounded-md border">
            {users.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{emptyStateMessage}</div>
            ) : (
              <div className="divide-y">
                {users.map((u) => {
                  const avatarUrl = getAvatarUrl(u.avatar)
                  const initials = (u.name || u.username || "U").slice(0, 2).toUpperCase()
                  const isSharing = sharingUserId === u.id

                  return (
                    <div key={u.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          {avatarUrl ? <AvatarImage src={avatarUrl} alt={u.name} /> : null}
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => handleShareToUser(u.id, u.name || `@${u.username}`)}
                        disabled={!!sharingUserId}
                      >
                        <Share2 className="w-4 h-4" />
                        {isSharing ? "Sharing..." : "Share"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
