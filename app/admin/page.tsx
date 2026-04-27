"use client"

import { useEffect, useState } from "react"
import { AdminRoute } from "@/components/AdminRoute"
import { adminApi, moderationApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Shield, Users, FileText, Building2, AlertTriangle, Activity, RefreshCw } from "lucide-react"

interface DashboardStats {
  total_users: number
  active_users: number
  total_posts: number
  active_posts: number
  total_comments: number
  active_departments: number
  pending_reports: number
  active_bans: number
}

interface AdminUser {
  id: string
  name: string
  username: string
  email: string
  role: "user" | "moderator" | "admin"
  is_active: boolean
  is_banned: boolean
  ban_reason?: string | null
  created_at: string
}

interface AdminPost {
  id: string
  content: string
  author_name: string
  author_username: string
  department_name?: string
  is_active: boolean
  created_at: string
}

interface AdminDepartment {
  id: string
  name: string
  type: string
  member_count: number
  is_active: boolean
  created_by_name?: string
}

interface ReportItem {
  _id: string
  id?: string
  targetType: "post" | "comment" | "user"
  reason: string
  description?: string
  status: string
  reporter_name?: string
  reporter_username?: string
  createdAt: string
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminPageContent />
    </AdminRoute>
  )
}

function AdminPageContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [userStatusFilter, setUserStatusFilter] = useState("all")

  const [postSearch, setPostSearch] = useState("")
  const [departmentSearch, setDepartmentSearch] = useState("")

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadDashboard(),
        loadUsers(),
        loadPosts(),
        loadDepartments(),
        loadReports(),
        loadLogs(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadDashboard(),
        loadUsers(),
        loadPosts(),
        loadDepartments(),
        loadReports(),
        loadLogs(),
      ])
      toast.success("Admin data refreshed")
    } catch {
      toast.error("Failed to refresh admin data")
    } finally {
      setIsRefreshing(false)
    }
  }

  const loadDashboard = async () => {
    const response = await adminApi.getDashboard()
    if (response.success && response.data) {
      const data: any = response.data
      setStats(data.stats || null)
    }
  }

  const loadUsers = async () => {
    const response = await adminApi.getUsers({
      query: userSearch,
      role: userRoleFilter as any,
      status: userStatusFilter as any,
      page: 1,
      limit: 50,
    })
    if (response.success && response.data) {
      const data: any = response.data
      setUsers(Array.isArray(data.users) ? data.users : [])
    }
  }

  const loadPosts = async () => {
    const response = await adminApi.getPosts({ query: postSearch, status: "all", page: 1, limit: 50 })
    if (response.success && response.data) {
      const data: any = response.data
      setPosts(Array.isArray(data.posts) ? data.posts : [])
    }
  }

  const loadDepartments = async () => {
    const response = await adminApi.getDepartments({ query: departmentSearch, status: "all", page: 1, limit: 50 })
    if (response.success && response.data) {
      const data: any = response.data
      setDepartments(Array.isArray(data.departments) ? data.departments : [])
    }
  }

  const loadReports = async () => {
    const response = await moderationApi.getReports({ status: "pending", page: 1, limit: 50 })
    if (response.success && response.data) {
      const data: any = response.data
      const list = Array.isArray(data) ? data : []
      setReports(list)
    }
  }

  const loadLogs = async () => {
    const response = await moderationApi.getLogs(1, 30)
    if (response.success && response.data) {
      const data: any = response.data
      setLogs(Array.isArray(data) ? data : [])
    }
  }

  const handleUserRoleChange = async (userId: string, role: "user" | "moderator" | "admin") => {
    const response = await adminApi.updateUserRole(userId, role)
    if (response.success) {
      toast.success("User role updated")
      loadUsers()
      loadDashboard()
    } else {
      toast.error(response.message || "Failed to update role")
    }
  }

  const handleToggleUserStatus = async (userId: string) => {
    const response = await adminApi.toggleUserStatus(userId)
    if (response.success) {
      toast.success(response.message || "User status updated")
      loadUsers()
      loadDashboard()
    } else {
      toast.error(response.message || "Failed to update user status")
    }
  }

  const handleTogglePostStatus = async (postId: string) => {
    const response = await adminApi.togglePostStatus(postId)
    if (response.success) {
      toast.success(response.message || "Post status updated")
      loadPosts()
      loadDashboard()
    } else {
      toast.error(response.message || "Failed to update post status")
    }
  }

  const handleToggleDepartmentStatus = async (departmentId: string) => {
    const response = await adminApi.toggleDepartmentStatus(departmentId)
    if (response.success) {
      toast.success(response.message || "Department status updated")
      loadDepartments()
      loadDashboard()
    } else {
      toast.error(response.message || "Failed to update department status")
    }
  }

  const handleReviewReport = async (reportId: string, action: "dismiss" | "remove_content" | "ban_user") => {
    const response = await moderationApi.reviewReport(reportId, action, "Reviewed by admin panel")
    if (response.success) {
      toast.success("Report reviewed")
      loadReports()
      loadDashboard()
      loadLogs()
    } else {
      toast.error(response.message || "Failed to review report")
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">Platform control center for moderation, users, and content.</p>
          </div>
          <Button onClick={refreshAll} disabled={isRefreshing} className="gap-2 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Users" value={stats?.total_users || 0} icon={<Users className="w-4 h-4" />} />
          <StatCard title="Active Posts" value={stats?.active_posts || 0} icon={<FileText className="w-4 h-4" />} />
          <StatCard title="Departments" value={stats?.active_departments || 0} icon={<Building2 className="w-4 h-4" />} />
          <StatCard title="Pending Reports" value={stats?.pending_reports || 0} icon={<AlertTriangle className="w-4 h-4" />} />
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage roles, activation, and basic account controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Search users"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                  />
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="moderator">Moderators</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={loadUsers}>Apply Filters</Button>

                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name} <span className="text-muted-foreground">@{u.username}</span></p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant={u.is_active ? "default" : "secondary"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                          <Badge variant="outline">{u.role}</Badge>
                          {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Select value={u.role} onValueChange={(v) => handleUserRoleChange(u.id, v as any)}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant={u.is_active ? "destructive" : "default"} onClick={() => handleToggleUserStatus(u.id)}>
                          {u.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Queue</CardTitle>
                <CardDescription>Review abuse and violation reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {reports.map((r: any) => {
                  const reportId = (r.id || r._id)?.toString()
                  return (
                    <div key={reportId} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{r.reason}</p>
                          <p className="text-xs text-muted-foreground">Type: {r.targetType} • Reporter: {r.reporter_name || r.reporter_username || "Unknown"}</p>
                        </div>
                        <Badge>{r.status}</Badge>
                      </div>
                      {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => handleReviewReport(reportId, "dismiss")}>Dismiss</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleReviewReport(reportId, "remove_content")}>Remove Content</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReviewReport(reportId, "ban_user")}>Ban User</Button>
                      </div>
                    </div>
                  )
                })}
                {reports.length === 0 && <p className="text-sm text-muted-foreground">No pending reports.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Moderation</CardTitle>
                <CardDescription>Review and remove or restore posts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Search post content" value={postSearch} onChange={(e) => setPostSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadPosts()} />
                  <Button variant="outline" onClick={loadPosts}>Search</Button>
                </div>
                <div className="space-y-2">
                  {posts.map((p) => (
                    <div key={p.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm line-clamp-2">{p.content || "(No text content)"}</p>
                        <p className="text-xs text-muted-foreground mt-1">By {p.author_name} @{p.author_username} {p.department_name ? `• ${p.department_name}` : ""}</p>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="mt-2">{p.is_active ? "Active" : "Removed"}</Badge>
                      </div>
                      <Button variant={p.is_active ? "destructive" : "default"} onClick={() => handleTogglePostStatus(p.id)}>
                        {p.is_active ? "Remove" : "Restore"}
                      </Button>
                    </div>
                  ))}
                  {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts found.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department Control</CardTitle>
                <CardDescription>Enable/disable departments globally.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Search departments" value={departmentSearch} onChange={(e) => setDepartmentSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadDepartments()} />
                  <Button variant="outline" onClick={loadDepartments}>Search</Button>
                </div>
                <div className="space-y-2">
                  {departments.map((d) => (
                    <div key={d.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.type} • {d.member_count} members • Created by {d.created_by_name || "Unknown"}</p>
                        <Badge variant={d.is_active ? "default" : "secondary"} className="mt-2">{d.is_active ? "Active" : "Disabled"}</Badge>
                      </div>
                      <Button variant={d.is_active ? "destructive" : "default"} onClick={() => handleToggleDepartmentStatus(d.id)}>
                        {d.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  ))}
                  {departments.length === 0 && <p className="text-sm text-muted-foreground">No departments found.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Moderation Logs</CardTitle>
                <CardDescription>Audit trail of admin and moderation actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {logs.map((log: any) => (
                  <div key={(log._id || log.id)?.toString()} className="border rounded p-3">
                    <p className="font-medium text-sm">{log.action} • {log.targetType}</p>
                    <p className="text-xs text-muted-foreground">{log.moderator_name || log.moderator_username || "System"} • {new Date(log.createdAt || log.created_at).toLocaleString()}</p>
                    {log.reason && <p className="text-xs mt-1 text-muted-foreground">{log.reason}</p>}
                  </div>
                ))}
                {logs.length === 0 && <p className="text-sm text-muted-foreground">No logs found.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-primary">{icon}</div>
      </CardContent>
    </Card>
  )
}
