"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Calendar, Users, FileText, Heart, MessageCircle, Share2 } from "lucide-react"
import { profileApi, followApi } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { PostFeed } from "@/components/post-feed"
import FollowButton from "@/components/follow-button"
import FollowList from "@/components/follow-list"

interface UserProfile {
  id: number
  name: string
  username: string
  email: string
  mobile: string
  bio?: string
  location?: string
  profile_avatar: string
  created_at: string
  posts_count: number
  likes_received: number
  departments_count: number
  comments_count: number
}

interface Department {
  id: number
  name: string
  type: string
  avatar: string
  role: string
}

export default function UserProfile() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const username = params.username as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("posts")
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 })
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const profileResponse = await profileApi.getProfile(username)

      if (profileResponse.success && profileResponse.data) {
        const data: any = profileResponse.data
        setProfile(data.user || null)
        setDepartments(Array.isArray(data.departments) ? data.departments : [])

        if (data.user) {
          const [statsRes, followRes] = await Promise.all([
            followApi.getFollowStats(data.user.id),
            currentUser && currentUser.userId !== data.user.id
              ? followApi.checkFollowing(data.user.id)
              : Promise.resolve({ data: { isFollowing: false } })
          ])

          if (statsRes.data) {
            setFollowStats(statsRes.data as { followers_count: number; following_count: number })
          }
          if (followRes.data) {
            setIsFollowing((followRes.data as any).isFollowing || false)
          }
        }
      } else {
        toast.error("User not found")
        router.push("/")
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
      toast.error("Failed to load profile")
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const isOwnProfile = currentUser?.username === username

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-3xl">{profile.profile_avatar}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>

              {profile.bio && (
                <p className="text-sm">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {isOwnProfile ? (
                  <Button variant="outline" onClick={() => router.push("/settings")}>
                    Edit Profile
                  </Button>
                ) : (
                  <FollowButton
                    userId={profile.id}
                    username={profile.username}
                    initialIsFollowing={isFollowing}
                    onFollowChange={(following) => {
                      setIsFollowing(following)
                      loadProfile() // Reload to update stats
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{profile.posts_count}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div className="text-center cursor-pointer hover:opacity-70" onClick={() => setActiveTab("followers")}>
              <div className="text-2xl font-bold">{followStats.followers_count}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center cursor-pointer hover:opacity-70" onClick={() => setActiveTab("followers")}>
              <div className="text-2xl font-bold">{followStats.following_count}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{profile.likes_received}</div>
              <div className="text-xs text-muted-foreground">Thanks Received</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{profile.departments_count}</div>
              <div className="text-xs text-muted-foreground">Departments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{profile.comments_count}</div>
              <div className="text-xs text-muted-foreground">Comments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Departments
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {departments.map((dept) => (
                <Badge
                  key={dept.id}
                  variant="secondary"
                  className="px-3 py-1.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => router.push(`/departments/${dept.id}`)}
                >
                  <span className="mr-2">{dept.avatar}</span>
                  {dept.name}
                  {dept.role === "admin" && (
                    <span className="ml-2 text-xs opacity-75">(Admin)</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">
            <Heart className="w-4 h-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex-1">
            <Users className="w-4 h-4 mr-2" />
            Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-6">
          {/* Show user's posts using existing PostFeed with filter */}
          <UserPosts username={username} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-6">
          <UserActivity username={username} />
        </TabsContent>

        <TabsContent value="followers" className="space-y-4 mt-6">
          {profile && <FollowList userId={profile.id} username={profile.username} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Component to show user's posts
function UserPosts({ username }: { username: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [username])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const response = await profileApi.getPosts(username, 1, 20)
      if (response.success && response.data && Array.isArray(response.data)) {
        setPosts(response.data)
      }
    } catch (error) {
      console.error("Failed to load user posts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
  }

  if (posts.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No posts yet</div>
  }

  return <div className="text-muted-foreground">Showing {posts.length} posts</div>
}

// Component to show user's activity
function UserActivity({ username }: { username: string }) {
  const [activity, setActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadActivity()
  }, [username])

  const loadActivity = async () => {
    setIsLoading(true)
    try {
      const response = await profileApi.getActivity(username, 1, 20)
      if (response.success && response.data && Array.isArray(response.data)) {
        setActivity(response.data)
      }
    } catch (error) {
      console.error("Failed to load activity:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
  }

  if (activity.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No recent activity</div>
  }

  return (
    <div className="space-y-3">
      {activity.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {item.type === "like" && <Heart className="w-5 h-5 text-destructive mt-1" />}
              {item.type === "comment" && <MessageCircle className="w-5 h-5 text-primary mt-1" />}
              {item.type === "share" && <Share2 className="w-5 h-5 text-blue-500 mt-1" />}

              <div className="flex-1">
                <p className="text-sm">
                  {item.type === "like" && "Liked a post by "}
                  {item.type === "comment" && "Commented on a post by "}
                  {item.type === "share" && "Shared a post by "}
                  <span className="font-semibold">@{item.post_author_username}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
