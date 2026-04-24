"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DepartmentCard } from "@/components/department-card"
import { CreateDepartmentDialog, type CreateDepartmentData } from "@/components/create-department-dialog"
import { Search, Plus } from "lucide-react"
import { departmentsApi } from "@/lib/api"
import { toast } from "sonner"

interface Department {
  id: string
  name: string
  type: "college" | "government" | "corporate" | "community"
  description: string
  members: number
  posts: number
  avatar: string
  location?: string
  isJoined: boolean
}

export function DepartmentsList() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load departments from API
  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    setIsLoading(true)
    try {
      const response = await departmentsApi.getAll()
      if (response.success && response.data) {
        const depts = response.data.departments || []
        setDepartments(depts.map((d: any) => ({
          id: (d.id || d._id)?.toString() || '',
          name: d.name,
          type: d.type || "community",
          description: d.description || "",
          members: d.member_count || 0,
          posts: d.post_count || 0,
          avatar: d.avatar || "🏢",
          location: d.location || "",
          isJoined: d.is_member || false,
        })).filter((d: any) => d.id)) // Filter out any invalid departments
      }
    } catch (error) {
      
      toast.error("Failed to load departments")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDepartment = async (data: CreateDepartmentData, avatarFile?: File) => {
    try {
      // Create the department first
      const response = await departmentsApi.create(data)
      
      if (response.success && response.data) {
        const departmentId = response.data.departmentId
        
        // Upload avatar if provided
        if (avatarFile && departmentId) {
          try {
            await departmentsApi.uploadAvatar(departmentId, avatarFile)
          } catch (error) {
            
            // Don't fail the whole operation if avatar upload fails
            toast.error("Department created but avatar upload failed")
          }
        }
        
        // Reload departments to get the new one
        await loadDepartments()
        toast.success("Department created successfully")
      } else {
        toast.error(response.message || "Failed to create department")
      }
    } catch (error) {
      
      toast.error("Failed to create department")
    }
  }

  const handleJoinDepartment = async (id: string) => {
    try {
      const response = await departmentsApi.join(id)
      if (response.success) {
        setDepartments(departments.map((dept) => (dept.id === id ? { ...dept, isJoined: true } : dept)))
        toast.success("Joined department successfully")
      }
    } catch (error) {
      
      toast.error("Failed to join department")
    }
  }

  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = !filterType || dept.type === filterType
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Departments & Pages</h1>
        <p className="text-muted-foreground">
          Browse departments, join communities, or create your own page to share local content
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Department
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!filterType ? "default" : "outline"}
          className={!filterType ? "" : "bg-transparent"}
          onClick={() => setFilterType(null)}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filterType === "college" ? "default" : "outline"}
          className={filterType === "college" ? "" : "bg-transparent"}
          onClick={() => setFilterType("college")}
          size="sm"
        >
          College
        </Button>
        <Button
          variant={filterType === "government" ? "default" : "outline"}
          className={filterType === "government" ? "" : "bg-transparent"}
          onClick={() => setFilterType("government")}
          size="sm"
        >
          Government
        </Button>
        <Button
          variant={filterType === "corporate" ? "default" : "outline"}
          className={filterType === "corporate" ? "" : "bg-transparent"}
          onClick={() => setFilterType("corporate")}
          size="sm"
        >
          Corporate
        </Button>
        <Button
          variant={filterType === "community" ? "default" : "outline"}
          className={filterType === "community" ? "" : "bg-transparent"}
          onClick={() => setFilterType("community")}
          size="sm"
        >
          Community
        </Button>
      </div>

      {/* Departments Grid */}
      {filteredDepartments.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => (
            <div key={dept.id} onClick={() => router.push(`/departments/${dept.id}`)} className="cursor-pointer">
              <DepartmentCard department={dept} onJoin={handleJoinDepartment} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No departments found matching your criteria</p>
          <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="bg-transparent">
            Create a new department
          </Button>
        </div>
      )}

      {/* Create Department Dialog */}
      <CreateDepartmentDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateDepartment}
      />
    </div>
  )
}
