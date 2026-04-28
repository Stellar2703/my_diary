"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Share2, Download, ZoomIn, Zap, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { CommentSection } from "./comment-section"
import { postsApi, getMediaUrl } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { SharePostDialog } from "./share-post-dialog"
import { PostDetailsModal } from "./post-details-modal"

interface Post {
  id: string | number
  user_id: number
  author_name: string
  author_username: string
  author_avatar: string
  city: string
  area?: string
  state: string
  country: string
  latitude?: number | null
  longitude?: number | null
  post_date: string
  department_name?: string
  content: string
  media_type: "photo" | "video" | "audio" | "none"
  media_url: string | null
  likes_count: number
  comments_count: number
  shares_count: number
  isLikedByUser?: boolean
  isSharedByUser?: boolean
  isAlert?: boolean
}

interface PostFeedProps {
  departmentId?: string
}

export function PostFeed({ departmentId }: PostFeedProps = {}) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [sharePostId, setSharePostId] = useState<string | number | null>(null)
  const [modalPostId, setModalPostId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Load posts
  useEffect(() => {
    loadPosts()
  }, [page, departmentId])

  useEffect(() => {
    const postIdFromUrl = searchParams.get("postId")
    if (postIdFromUrl) {
      setModalPostId(postIdFromUrl)
    }
  }, [searchParams])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const params: any = { page, limit: 10 }
      if (departmentId) {
        params.departmentId = departmentId
      }
      const response = await postsApi.getAll(params)
      if (response.success && response.data) {
        setPosts(response.data.posts || [])
      }
    } catch (error) {
      
      toast.error("Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (postId: string | number) => {
    try {
      const response = await postsApi.toggleLike(postId)
      if (response.success) {
        // Update local state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLikedByUser: response.data?.liked,
                likes_count: response.data?.liked 
                  ? post.likes_count + 1 
                  : Math.max(0, post.likes_count - 1)
              }
            : post
        ))
      } else {
        toast.error(response.message || "Failed to update like")
      }
    } catch (error) {
      
      toast.error("Failed to update like")
    }
  }

  const getRelativeDate = (dateString: string) => {
    if (!dateString) return "Just now"
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Just now"
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffHours < 1) return "Just now"
      if (diffHours < 24) return `${diffHours} hours ago`
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString()
    } catch {
      return "Just now"
    }
  }

  const getLocationLabel = (post: Post) => {
    const locationParts = [post.area, post.city, post.state, post.country].filter(Boolean)
    if (locationParts.length > 0) {
      return locationParts.join(", ")
    }

    if (typeof post.latitude === "number" && typeof post.longitude === "number") {
      return `${post.latitude.toFixed(5)}, ${post.longitude.toFixed(5)}`
    }

    return "Location unavailable"
  }

  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-48 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {posts.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No posts found. Be the first to post!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push(`/profile/${post.author_username}`)}
                  >
                    <Avatar>
                      {post.author_avatar?.startsWith('/') ? (
                        <AvatarImage src={getMediaUrl(post.author_avatar)} alt={post.author_name} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {post.author_avatar && !post.author_avatar.startsWith('/') 
                          ? post.author_avatar 
                          : post.author_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-sm hover:underline">{post.author_name}</p>
                      <p className="text-xs text-muted-foreground">@{post.author_username}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{getRelativeDate(post.post_date)}</span>
                </div>

                {/* Location & Department */}
                <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mb-3">
                  <span>📍 {getLocationLabel(post)}</span>
                  {post.department_name && <span>🏢 {post.department_name}</span>}
                  {post.isAlert && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      Alert
                    </Badge>
                  )}
                </div>

                {/* Content */}
                {post.content && <p className="text-sm mb-3">{post.content}</p>}

                {/* Media */}
                {post.media_url && post.media_type !== "none" && (
                  <div className="relative bg-muted rounded-lg overflow-hidden mb-4 aspect-video flex items-center justify-center">
                    {post.media_type === "photo" && (
                      <img
                        src={getMediaUrl(post.media_url)}
                        alt="Post media"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {post.media_type === "video" && (
                      <video
                        src={getMediaUrl(post.media_url)}
                        className="w-full h-full object-cover"
                        controls
                      />
                    )}
                    {post.media_type === "audio" && (
                      <audio
                        src={getMediaUrl(post.media_url)}
                        className="w-full"
                        controls
                      />
                    )}
                  </div>
                )}

                {/* Interactions */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 border-b border-border pb-3">
                  <span>{post.likes_count} thanks</span>
                  <span>{post.comments_count} comments</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Only show like/share buttons if not own post */}
                  {user?.id !== post.user_id && (
                    <>
                      <Button
                        variant="ghost"
                        className={`gap-2 bg-transparent ${post.isLikedByUser ? "text-destructive" : "text-muted-foreground hover:text-primary"}`}
                        size="sm"
                        onClick={() => handleLike(post.id)}
                      >
                        <Zap className={`w-4 h-4 ${post.isLikedByUser ? "fill-current" : ""}`} />
                        <span className="hidden sm:inline text-xs">Thanks</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="gap-2 bg-transparent text-muted-foreground hover:text-primary"
                        size="sm"
                        onClick={() => setSharePostId(post.id)}
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Share</span>
                      </Button>
                    </>
                  )}
                  {user?.id === post.user_id && (
                    <>
                      {/* Show disabled like/share for own posts */}
                      <Button
                        variant="ghost"
                        className="gap-2 bg-transparent text-muted-foreground opacity-50"
                        size="sm"
                        disabled
                        title="Cannot like your own post"
                      >
                        <Zap className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Thanks</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="gap-2 bg-transparent text-muted-foreground opacity-50"
                        size="sm"
                        disabled
                        title="Cannot share your own post"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Share</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    className="gap-2 bg-transparent text-muted-foreground hover:text-primary"
                    size="sm"
                    onClick={() => setExpandedPostId(expandedPostId === String(post.id) ? null : String(post.id))}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Comment</span>
                    {expandedPostId === String(post.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2 bg-transparent text-muted-foreground hover:text-primary"
                    size="sm"
                    onClick={() => {
                      if (post.media_url) {
                        window.open(getMediaUrl(post.media_url), '_blank')
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Download</span>
                  </Button>
                </div>

                {/* Inline Comment Section */}
                {expandedPostId === String(post.id) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <CommentSection postId={String(post.id)} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {sharePostId !== null && (
        <SharePostDialog
          isOpen={sharePostId !== null}
          onOpenChange={(open) => {
            if (!open) setSharePostId(null)
          }}
          postId={sharePostId}
          onShared={loadPosts}
        />
      )}

      {modalPostId && (
        <PostDetailsModal
          isOpen={!!modalPostId}
          onClose={() => {
            setModalPostId(null)
            const params = new URLSearchParams(searchParams.toString())
            params.delete("postId")
            const query = params.toString()
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
          }}
          postId={modalPostId}
        />
      )}
    </>
  )
}
