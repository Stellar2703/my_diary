"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { departmentsApi } from "@/lib/api"
import { AvatarUpload } from "./avatar-upload"
import { DepartmentPhotoTemplate } from "./department-avatar"

interface DepartmentSettingsDialogProps {
  department: {
    id: string
    name: string
    type: "college" | "government" | "corporate" | "community"
    description?: string
    avatar?: string
  }
  isAdmin: boolean
  onUpdate?: () => void
}

export function DepartmentSettingsDialog({
  department,
  isAdmin,
  onUpdate
}: DepartmentSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState(department.avatar || "")
  const [formData, setFormData] = useState({
    name: department.name,
    description: department.description || ""
  })

  useEffect(() => {
    if (open) {
      setFormData({
        name: department.name,
        description: department.description || ""
      })
      setCurrentAvatar(department.avatar || "")
    }
  }, [department, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await departmentsApi.update(department.id, formData)
      
      if (response.success) {
        toast.success("Department updated successfully!")
        onUpdate?.()
        setOpen(false)
      } else {
        toast.error(response.message || "Failed to update department")
      }
    } catch (error) {
      
      toast.error("Failed to update department")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarSuccess = (avatarUrl: string) => {
    setCurrentAvatar(avatarUrl)
    toast.success("Avatar updated! Changes will appear after refresh.")
    onUpdate?.()
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Department Settings</DialogTitle>
          <DialogDescription>
            Update department information and avatar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center py-4 border-b">
            <AvatarUpload
              currentAvatar={currentAvatar}
              fallbackText={department.name.substring(0, 2).toUpperCase()}
              type="department"
              departmentId={department.id}
              onSuccess={handleAvatarSuccess}
              size="xl"
              fallbackContent={<DepartmentPhotoTemplate name={department.name} type={department.type} />}
            />
          </div>

          {/* Department Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Department name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your department..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
