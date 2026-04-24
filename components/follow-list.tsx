'use client';

import { useState, useEffect } from 'react';
import { followApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, UserPlus, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  is_following?: boolean;
  is_blocked?: boolean;
  followers_count?: number;
  mutual_followers?: number;
  followed_at?: string;
}

interface FollowListProps {
  userId: number;
  username: string;
}

export default function FollowList({ userId, username }: FollowListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [stats, setStats] = useState({ followers_count: 0, following_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('followers');
  const [followingStates, setFollowingStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [followersRes, followingRes, statsRes] = await Promise.all([
        followApi.getFollowers(userId),
        followApi.getFollowing(userId),
        followApi.getFollowStats(userId),
      ]);

      if (!followersRes.error && followersRes.data) {
        const followersData = (followersRes.data as any).followers || []
        setFollowers(followersData);
        const states: Record<number, boolean> = {};
        followersData.forEach((f: User) => {
          states[f.id] = f.is_following || false;
        });
        setFollowingStates(prev => ({ ...prev, ...states }));
      }

      if (!followingRes.error && followingRes.data) {
        const followingData = (followingRes.data as any).following || []
        setFollowing(followingData);
        const states: Record<number, boolean> = {};
        followingData.forEach((f: User) => {
          states[f.id] = f.is_following || false;
        });
        setFollowingStates(prev => ({ ...prev, ...states }));
      }

      if (!statsRes.error && statsRes.data) {
        setStats(statsRes.data as { followers_count: number; following_count: number });
      }
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: number, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        const response = await followApi.unfollowUser(targetUserId);
        if (response.error) throw new Error(response.error);
      } else {
        const response = await followApi.followUser(targetUserId);
        if (response.error) throw new Error(response.error);
      }

      setFollowingStates(prev => ({
        ...prev,
        [targetUserId]: !currentlyFollowing,
      }));

      toast({
        title: currentlyFollowing ? 'Unfollowed' : 'Following',
        description: currentlyFollowing
          ? 'You unfollowed this user'
          : 'You are now following this user',
      });

      // Reload data to update counts
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  };

  const renderUser = (u: User) => {
    const isCurrentUser = user?.userId === u.id;
    const isFollowing = followingStates[u.id] || false;

    return (
      <div key={u.id} className="flex items-center justify-between py-3 border-b last:border-0">
        <Link href={`/profile/${u.username}`} className="flex items-center gap-3 flex-1 hover:opacity-80">
          <Avatar>
            <AvatarImage src={u.avatar || undefined} />
            <AvatarFallback>{u.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{u.name}</span>
              {u.verified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
            </div>
            <p className="text-sm text-muted-foreground">@{u.username}</p>
            {u.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{u.bio}</p>}
            {u.mutual_followers !== undefined && u.mutual_followers > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {u.mutual_followers} mutual {u.mutual_followers === 1 ? 'follower' : 'followers'}
              </p>
            )}
          </div>
        </Link>

        {!isCurrentUser && !u.is_blocked && (
          <Button
            onClick={() => handleFollowToggle(u.id, isFollowing)}
            variant={isFollowing ? 'outline' : 'default'}
            size="sm"
            className="ml-2"
          >
            {isFollowing ? (
              <>
                <UserMinus className="w-4 h-4 mr-1" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({stats.followers_count})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({stats.following_count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4">
            {followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No followers yet
              </div>
            ) : (
              <div className="divide-y">
                {followers.map(renderUser)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            {following.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Not following anyone yet
              </div>
            ) : (
              <div className="divide-y">
                {following.map(renderUser)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
