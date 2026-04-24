"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { Bold, Italic, Type } from "lucide-react"
import { commentsApi } from "@/lib/api"
import { toast } from "sonner"

interface Comment {
  id: string | number
  author_name: string
  author_username: string
  author_avatar: string
  content: string
  created_at: string
  is_bold?: boolean
  is_italic?: boolean
  replies_count?: number
}

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [repliesMap, setRepliesMap] = useState<Record<number, Comment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())

  // Helper to safely format dates
  const safeFormatDate = (dateString: string | undefined) => {
    if (!dateString) return "Just now"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Just now"
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Just now"
    }
  }

  // Load comments
  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      const response = await commentsApi.getAll(postId)
      if (response.success && response.data) {
        setComments(response.data.comments || [])
      }
    } catch (error) {
      
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsLoading(true)
    try {
      const response = await commentsApi.add(postId, newComment, isBold, isItalic)
      
      if (response.success) {
        // Reload comments
        await loadComments()
        
        // Reset form
        setNewComment("")
        setIsBold(false)
        setIsItalic(false)
        
        toast.success("Comment added successfully")
      } else {
        toast.error(response.message || "Failed to add comment")
      }
    } catch (error) {
      toast.error("Failed to add comment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReply = async (commentId: number) => {
    if (!replyContent.trim()) return

    try {
      const response = await commentsApi.createReply(postId, commentId, replyContent)
      if (response.success) {
        toast.success("Reply added successfully")
        setReplyContent("")
        setReplyingTo(null)
        // Reload replies for this comment
        loadReplies(commentId)
      } else {
        toast.error(response.message || "Failed to add reply")
      }
    } catch (error) {
      toast.error("Failed to add reply")
    }
  }

  const loadReplies = async (commentId: number) => {
    try {
      const response = await commentsApi.getReplies(commentId)
      if (response.success && response.data) {
        setRepliesMap(prev => ({
          ...prev,
          [commentId]: response.data || []
        }))
      }
    } catch (error) {
      
    }
  }

  const toggleReplies = (commentId: number) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
      // Load replies if not already loaded
      if (!repliesMap[commentId]) {
        loadReplies(commentId)
      }
    }
    setExpandedComments(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <Card className="p-4 bg-muted/50 border-none">
        <div className="space-y-3">
          {/* Text Formatting Toolbar */}
          <div className="flex gap-1">
            <Button
              variant={isBold ? "default" : "ghost"}
              size="sm"
              className="gap-1 bg-transparent text-sm"
              onClick={() => setIsBold(!isBold)}
              title="Bold text"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant={isItalic ? "default" : "ghost"}
              size="sm"
              className="gap-1 bg-transparent text-sm"
              onClick={() => setIsItalic(!isItalic)}
              title="Italic text"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
              <Type className="w-3 h-3" />
              <span>Rich text enabled</span>
            </div>
          </div>

          {/* Comment Input Field */}
          <div className="relative">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAddComment()
                }
              }}
              className="pr-24"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              {isLoading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-3 bg-muted/30 border-border/50">
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {comment.author_avatar?.startsWith('/') ? (
                    <AvatarImage 
                      src={`http://localhost:5000${comment.author_avatar}`} 
                      alt={comment.author_name} 
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {comment.author_avatar && !comment.author_avatar.startsWith('/') 
                      ? comment.author_avatar 
                      : comment.author_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">{comment.author_username}</span>
                    <span className="text-xs text-muted-foreground">
                      {safeFormatDate(comment.created_at)}
                    </span>
                  </div>

                  <p
                    className={`text-sm mt-1 text-foreground ${comment.is_bold ? "font-semibold" : ""} ${comment.is_italic ? "italic" : ""}`}
                  >
                    {comment.content}
                  </p>

                  <div className="flex gap-4 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground bg-transparent"
                      onClick={() => setReplyingTo(replyingTo === Number(comment.id) ? null : Number(comment.id))}
                    >
                      Reply
                    </Button>
                    {comment.replies_count && comment.replies_count > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground bg-transparent"
                        onClick={() => toggleReplies(Number(comment.id))}
                      >
                        {expandedComments.has(Number(comment.id)) ? "Hide" : "View"} {comment.replies_count} {comment.replies_count === 1 ? "reply" : "replies"}
                      </Button>
                    ) : null}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === Number(comment.id) && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleReply(Number(comment.id))
                          }
                        }}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={() => handleReply(Number(comment.id))} disabled={!replyContent.trim()}>
                        Send
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setReplyingTo(null)
                        setReplyContent("")
                      }}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {expandedComments.has(Number(comment.id)) && repliesMap[Number(comment.id)] && (
                    <div className="mt-3 ml-4 space-y-2 border-l-2 border-border pl-3">
                      {repliesMap[Number(comment.id)].map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            {reply.author_avatar?.startsWith('/') ? (
                              <AvatarImage 
                                src={`http://localhost:5000${reply.author_avatar}`} 
                                alt={reply.author_name} 
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {reply.author_avatar && !reply.author_avatar.startsWith('/') 
                                ? reply.author_avatar 
                                : reply.author_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">{reply.author_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {safeFormatDate(reply.created_at)}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${reply.is_bold ? "font-semibold" : ""} ${reply.is_italic ? "italic" : ""}`}>
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* View More Comments */}
      {comments.length > 3 && (
        <Button variant="outline" className="w-full bg-transparent">
          View all {comments.length} comments
        </Button>
      )}
    </div>
  )
}
