'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, MoreHorizontal, Edit, Trash2, Reply } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { commentsApi, reactionApi } from '@/lib/api';
import { ReactionPicker, ReactionType } from '@/components/reaction-picker';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  parent_comment_id: number | null;
  depth: number;
  username: string;
  name: string;
  avatar: string | null;
  created_at: string;
  edited_at: string | null;
  reactions_count?: number;
  has_reacted?: boolean;
  user_reaction?: ReactionType;
  replies_count?: number;
}

interface NestedCommentProps {
  comment: Comment;
  postId: number;
  maxDepth?: number;
  onReplyAdded?: () => void;
  onCommentDeleted?: () => void;
}

export default function NestedComment({
  comment,
  postId,
  maxDepth = 5,
  onReplyAdded,
  onCommentDeleted,
}: NestedCommentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(
    comment.user_reaction || null
  );

  const isOwner = user?.userId === comment.user_id;
  const canReply = comment.depth < maxDepth;

  const loadReplies = async () => {
    if (replies.length > 0) {
      setShowReplies(!showReplies);
      return;
    }

    setIsLoadingReplies(true);
    try {
      const response = await commentsApi.getReplies(comment.id);
      if (response.success && response.data) {
        setReplies(response.data as Comment[]);
        setShowReplies(true);
      }
    } catch (error) {
      
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await commentsApi.createReply(postId, comment.id, replyContent);
      if (response.success) {
        setReplyContent('');
        setShowReplyBox(false);
        toast({
          title: 'Reply added',
          description: 'Your reply has been posted successfully',
        });

        // Reload replies
        const repliesResponse = await commentsApi.getReplies(comment.id);
        if (repliesResponse.success && repliesResponse.data) {
          setReplies(repliesResponse.data as Comment[]);
          setShowReplies(true);
        }

        onReplyAdded?.();
      } else {
        throw new Error(response.error || 'Failed to post reply');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post reply',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      const response = await commentsApi.update(comment.id, editContent);
      if (response.success) {
        comment.content = editContent;
        comment.edited_at = new Date().toISOString();
        setIsEditing(false);
        toast({
          title: 'Comment updated',
          description: 'Your comment has been updated successfully',
        });
      } else {
        throw new Error(response.error || 'Failed to update comment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update comment',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await commentsApi.delete(comment.id);
      if (response.success) {
        toast({
          title: 'Comment deleted',
          description: 'Your comment has been deleted successfully',
        });
        onCommentDeleted?.();
      } else {
        throw new Error(response.error || 'Failed to delete comment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  const handleReaction = async (reactionType: ReactionType) => {
    try {
      const response = await reactionApi.toggleCommentReaction(comment.id, reactionType);
      if (response.success && response.data) {
        setCurrentReaction((response.data as any).reacted ? reactionType : null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to react to comment',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('flex gap-3', comment.depth > 0 && 'ml-8 mt-3')}>
      {/* Vertical line for nested comments */}
      {comment.depth > 0 && (
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      )}

      <Link href={`/profile/${comment.username}`}>
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.avatar || undefined} />
          <AvatarFallback>{comment.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 space-y-2">
        {/* Comment Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${comment.username}`} className="font-semibold text-sm hover:underline">
              {comment.name}
            </Link>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
            {comment.edited_at && (
              <Badge variant="secondary" className="text-xs">
                Edited
              </Badge>
            )}
          </div>

          {isOwner && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEdit}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm">{comment.content}</p>
        )}

        {/* Comment Actions */}
        <div className="flex items-center gap-4">
          <ReactionPicker
            onReact={handleReaction}
            currentReaction={currentReaction}
            size="sm"
            showLabel={false}
          />

          {canReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="gap-1"
            >
              <Reply className="w-4 h-4" />
              Reply
            </Button>
          )}

          {(comment.replies_count || 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadReplies}
              className="gap-1"
            >
              <MessageCircle className="w-4 h-4" />
              {showReplies ? 'Hide' : 'Show'} {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
            </Button>
          )}
        </div>

        {/* Reply Box */}
        {showReplyBox && (
          <div className="space-y-2 pt-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReply} disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowReplyBox(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {showReplies && (
          <div className="space-y-3 mt-3">
            {isLoadingReplies ? (
              <p className="text-sm text-muted-foreground">Loading replies...</p>
            ) : (
              replies.map((reply) => (
                <NestedComment
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  maxDepth={maxDepth}
                  onReplyAdded={() => loadReplies()}
                  onCommentDeleted={() => loadReplies()}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
