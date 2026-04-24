'use client';

import { useState, useEffect } from 'react';
import { storiesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Plus, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Story {
  id: number;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string;
  backgroundColor: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  userViewed: boolean;
}

interface UserStories {
  userId: number;
  username: string;
  name: string;
  avatar: string;
  stories: Story[];
}

interface StoryCarouselProps {
  onCreateStory?: () => void;
}

export default function StoryCarousel({ onCreateStory }: StoryCarouselProps) {
  const [userStories, setUserStories] = useState<UserStories[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserStories | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (!selectedUser || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 2; // 5 seconds per story (100/20 = 5s)
      });
    }, 100);

    return () => clearInterval(timer);
  }, [selectedUser, currentStoryIndex, isPaused]);

  const fetchStories = async () => {
    try {
      const response = await storiesApi.getStories();
      if (response.success) {
        setUserStories(response.data as UserStories[]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch stories',
        variant: 'destructive',
      });
    }
  };

  const handleStoryClick = async (userStory: UserStories, storyIndex: number = 0) => {
    setSelectedUser(userStory);
    setCurrentStoryIndex(storyIndex);
    setProgress(0);

    // Mark as viewed
    const story = userStory.stories[storyIndex];
    if (!story.userViewed && userStory.userId !== user?.id) {
      try {
        await storiesApi.viewStory(story.id);
      } catch (error) {
        
      }
    }
  };

  const handleNextStory = () => {
    if (!selectedUser) return;

    if (currentStoryIndex < selectedUser.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setProgress(0);
      
      // Mark new story as viewed
      const story = selectedUser.stories[nextIndex];
      if (!story.userViewed && selectedUser.userId !== user?.id) {
        storiesApi.viewStory(story.id).catch(() => {});
      }
    } else {
      handleClose();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setCurrentStoryIndex(0);
    setProgress(0);
  };

  const currentStory = selectedUser?.stories[currentStoryIndex];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max px-2">
        {/* Create story button */}
        {user && (
          <button
            onClick={onCreateStory}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
                <Plus className="h-3 w-3" />
              </div>
            </div>
            <span className="text-xs font-medium">Create Story</span>
          </button>
        )}

        {/* User stories */}
        {userStories.map((userStory) => (
          <button
            key={userStory.userId}
            onClick={() => handleStoryClick(userStory)}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div
              className={`relative p-0.5 rounded-full ${
                userStory.stories.some((s) => !s.userViewed)
                  ? 'bg-gradient-to-tr from-yellow-400 to-pink-600'
                  : 'bg-gray-300'
              }`}
            >
              <Avatar className="h-16 w-16 border-2 border-background">
                <AvatarImage src={userStory.avatar} alt={userStory.username} />
                <AvatarFallback>{userStory.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs font-medium truncate max-w-[80px]">
              {userStory.userId === user?.id ? 'Your Story' : userStory.name}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md p-0 bg-black border-none">
          {selectedUser && currentStory && (
            <div
              className="relative h-[600px] flex flex-col"
              onClick={() => setIsPaused(!isPaused)}
            >
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
                {selectedUser.stories.map((_, index) => (
                  <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all"
                      style={{
                        width: `${
                          index < currentStoryIndex
                            ? 100
                            : index === currentStoryIndex
                            ? progress
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border border-white">
                    <AvatarImage src={selectedUser.avatar} alt={selectedUser.username} />
                    <AvatarFallback>{selectedUser.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-white">
                    <p className="text-sm font-medium">{selectedUser.name}</p>
                    <p className="text-xs opacity-70">
                      {new Date(currentStory.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Story Content */}
              <div
                className="flex-1 flex items-center justify-center"
                style={{ backgroundColor: currentStory.backgroundColor }}
              >
                {currentStory.mediaUrl ? (
                  currentStory.mediaType === 'image' ? (
                    <img
                      src={currentStory.mediaUrl}
                      alt="Story"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <video
                      src={currentStory.mediaUrl}
                      className="max-h-full max-w-full"
                      autoPlay
                      loop
                    />
                  )
                ) : (
                  <div className="px-8">
                    <p className="text-white text-2xl text-center font-medium whitespace-pre-wrap">
                      {currentStory.content}
                    </p>
                  </div>
                )}
              </div>

              {/* View count (only show on own stories) */}
              {selectedUser.userId === user?.id && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">{currentStory.viewCount} views</span>
                </div>
              )}

              {/* Navigation */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevStory();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white opacity-50 hover:opacity-100"
                disabled={currentStoryIndex === 0}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextStory();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white opacity-50 hover:opacity-100"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
