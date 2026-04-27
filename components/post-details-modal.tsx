"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { MessageCircle, Share2, Download, Zap, MapPin, Calendar, Users } from "lucide-react"
import { CommentSection } from "./comment-section"
import { useState, useEffect } from "react"
import { postsApi } from "@/lib/api"
import { toast } from "sonner"
import { SharePostDialog } from "./share-post-dialog"

interface PostDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
}

interface PostData {
  id: number
  content: string
  media_url: string | null
  media_type: string
  author_name: string
  author_username: string
  author_avatar: string
  department_name: string | null
  city: string
  state: string
  country: string
  post_date: string
  likes_count: number
  comments_count: number
  shares_count: number
  isLikedByUser: boolean
  isSharedByUser: boolean
}

export function PostDetailsModal({ isOpen, onClose, postId }: PostDetailsModalProps) {
  const [post, setPost] = useState<PostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  // Load post data
  useEffect(() => {
    if (isOpen && postId) {
      loadPost()
    } else if (!isOpen) {
      // Reset state when modal closes
      setPost(null)
      setIsLoading(true)
    }
  }, [isOpen, postId])

  const loadPost = async () => {
    setIsLoading(true)
    try {
      
      const response = await postsApi.getById(postId)
      
      if (response.success && response.data) {
        setPost(response.data) // Post data is directly in response.data
      } else {
        
        toast.error(response.message || 'Failed to load post details')
      }
    } catch (error) {
      
      toast.error('Failed to load post details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleThank = async () => {
    if (!post) return
    try {
      const response = await postsApi.toggleLike(post.id)
      if (response.success) {
        setPost({ ...post, isLikedByUser: !post.isLikedByUser, likes_count: post.isLikedByUser ? post.likes_count - 1 : post.likes_count + 1 })
      } else {
        
        toast.error(response.message || 'Failed to update like')
      }
    } catch (error) {
      
      toast.error('Failed to update like')
    }
  }

  const handleShare = () => {
    setIsShareDialogOpen(true)
  }

  const handleDownload = () => {
    if (post?.media_url) {
      window.open(post.media_url, '_blank')
    } else {
      toast.error('No media to download')
    }
  }

  if (isLoading || !post) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>Loading post information...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading post...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Details</DialogTitle>
          <DialogDescription>View post information, comments, and interactions</DialogDescription>
          <DialogClose />
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Media */}
          {post.media_url && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {post.media_type === 'video' ? (
                <video src={post.media_url} controls className="w-full h-full object-cover" />
              ) : post.media_type === 'audio' ? (
                <audio src={post.media_url} controls className="w-full" />
              ) : (
                <img src={post.media_url} alt="Post content" className="w-full h-full object-cover" />
              )}
            </div>
          )}

          {/* Post Info */}
          <div className="space-y-4">
            {/* Author Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {post.author_avatar || post.author_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.author_name}</p>
                  <p className="text-xs text-muted-foreground">@{post.author_username}</p>
                </div>
              </div>
            </div>

            {/* Post Content */}
            {post.content && (
              <div>
                <p className="text-sm leading-relaxed">{post.content}</p>
              </div>
            )}

            {/* Post Metadata */}
            <Card className="p-3 bg-muted/50 border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-accent" />
                <span>{post.city}, {post.state}, {post.country}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-accent" />
                <span>{new Date(post.post_date).toLocaleDateString()}</span>
              </div>
              {post.department_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-accent" />
                  <span>{post.department_name}</span>
                </div>
              )}
            </Card>

            {/* Interaction Stats */}
            <div className="flex justify-between text-xs text-muted-foreground border-b border-border pb-3">
              <span>{post.likes_count} Thanks</span>
              <span>{post.comments_count} Comments</span>
              <span>{post.shares_count} Shares</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="ghost"
                className={`gap-2 bg-transparent ${post.isLikedByUser ? "text-destructive" : "text-muted-foreground hover:text-primary"}`}
                onClick={handleThank}
              >
                <Zap className={`w-4 h-4 ${post.isLikedByUser ? "fill-current" : ""}`} />
                <span className="hidden sm:inline text-xs">Thanks</span>
              </Button>
              <Button variant="ghost" className="gap-2 bg-transparent text-muted-foreground hover:text-primary">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Comment</span>
              </Button>
              <Button
                variant="ghost"
                className={`gap-2 bg-transparent ${post.isSharedByUser ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                onClick={handleShare}
              >
                <Share2 className={`w-4 h-4 ${post.isSharedByUser ? "fill-current" : ""}`} />
                <span className="hidden sm:inline text-xs">Share</span>
              </Button>
              <Button
                variant="ghost"
                className="gap-2 bg-transparent text-muted-foreground hover:text-primary"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Save</span>
              </Button>
            </div>

            {/* Comments Section */}
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-4">Comments</h3>
              <CommentSection postId={postId} />
            </div>
          </div>
        </div>

        {post && (
          <SharePostDialog
            isOpen={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
            postId={post.id}
            onShared={loadPost}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
