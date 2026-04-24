"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, ArrowLeft, LogOut, UserPlus } from "lucide-react"
import { PostFeed } from "@/components/post-feed"
import { PostUploadCard } from "@/components/post-upload-card"
import { departmentsApi } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"

interface Department {
  id: number
  name: string
  type: string
  description?: string
  avatar: string
  location?: string
  created_by: number
  created_at: string
  member_count?: number
  post_count?: number
  isJoined?: boolean
}

interface Member {
  id: string
  user_id: number
  name: string
  username: string
  profile_avatar: string
  role: string
  joined_at: string
}

interface Post {
  id: number
  user_id: number
  author_name: string
  author_username: string
  author_avatar: string
  content: string
  media_type: string
  media_url?: string
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  isLikedByUser?: boolean
  isSharedByUser?: boolean
}

export default function DepartmentView() {
  return (
    <ProtectedRoute>
      <DepartmentViewContent />
    </ProtectedRoute>
  )
}

function DepartmentViewContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const departmentId = params.id as string

  const [department, setDepartment] = useState<Department | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("posts")

  useEffect(() => {
    loadDepartment()
    loadMembers()
    loadPosts()
  }, [departmentId])

  const loadDepartment = async () => {
    try {
      const response = await departmentsApi.getById(departmentId)
      if (response.success && response.data) {
        const data: any = response.data
        setDepartment(data)
      }
    } catch (error) {
      console.error("Failed to load department:", error)
      toast.error("Failed to load department")
    }
  }

  const loadMembers = async () => {
    try {
      const response = await departmentsApi.getMembers(departmentId)
      if (response.success && response.data) {
        const data: any = response.data
        setMembers(Array.isArray(data.members) ? data.members : [])
      }
    } catch (error) {
      console.error("Failed to load members:", error)
    }
  }

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const response = await departmentsApi.getPosts(departmentId)
      if (response.success && response.data) {
        const data: any = response.data
        setPosts(Array.isArray(data.posts) ? data.posts : [])
      } else {
        toast.error(response.error || "Failed to load posts")
      }
    } catch (error) {
      console.error("Failed to load posts:", error)
      toast.error("Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    try {
      const response = await departmentsApi.join(departmentId)
      if (response.success) {
        toast.success("Joined department successfully!")
        loadDepartment()
        loadMembers()
        loadPosts()
      } else {
        toast.error(response.error || "Failed to join department")
      }
    } catch (error) {
      toast.error("Failed to join department")
    }
  }

  const handleLeave = async () => {
    try {
      const response = await departmentsApi.leave(departmentId)
      if (response.success) {
        toast.success("Left department successfully")
        router.push("/departments")
      } else {
        toast.error(response.error || "Failed to leave department")
      }
    } catch (error) {
      toast.error("Failed to leave department")
    }
  }

  if (!department) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  const isCreator = user?.id === department.created_by
  const isMember = department.isJoined || isCreator

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/departments")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Departments
      </Button>

      {/* Department Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 flex items-center justify-center text-6xl bg-primary/10 rounded-lg">
              {department.avatar}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{department.name}</h1>
                  <Badge variant="secondary" className="mt-2">
                    {department.type}
                  </Badge>
                  {isCreator && (
                    <Badge variant="default" className="ml-2">
                      Admin
                    </Badge>
                  )}
                </div>

                {!isMember && (
                  <Button onClick={handleJoin} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Join Department
                  </Button>
                )}

                {isMember && !isCreator && (
                  <Button onClick={handleLeave} variant="destructive" className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Leave Department
                  </Button>
                )}
              </div>

              {department.description && (
                <p className="text-sm text-muted-foreground">{department.description}</p>
              )}

              {department.location && (
                <p className="text-sm text-muted-foreground">📍 {department.location}</p>
              )}

              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold">{department.member_count || members.length}</span>
                  <span className="text-muted-foreground ml-1">Members</span>
                </div>
                <div>
                  <span className="font-semibold">{department.post_count || posts.length}</span>
                  <span className="text-muted-foreground ml-1">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      {isMember ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {/* Post Upload for Members */}
            <PostUploadCard defaultDepartmentId={departmentId} />
            
            {/* Department Posts Feed */}
            <PostFeed departmentId={departmentId} />
          </TabsContent>

          <TabsContent value="members" className="space-y-4 mt-6">
            {members.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No members yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member, index) => (
                  <Card
                    key={member.id || member.user_id?.toString() || index}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/profile/${member.username}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {member.profile_avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">@{member.username}</p>
                        </div>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">Join this department to view posts and members</p>
            <Button onClick={handleJoin} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Join Department
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
