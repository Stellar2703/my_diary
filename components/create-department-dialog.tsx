"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Upload, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DepartmentPhotoTemplate } from "./department-avatar"

interface CreateDepartmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateDepartmentData, avatarFile?: File) => void
}

export interface CreateDepartmentData {
  name: string
  type: "college" | "government" | "corporate" | "community"
  description: string
  location?: string
}

export function CreateDepartmentDialog({ isOpen, onClose, onCreate }: CreateDepartmentDialogProps) {
  const [formData, setFormData] = useState<CreateDepartmentData>({
    name: "",
    type: "college",
    description: "",
    location: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, avatar: 'Please select an image file' })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, avatar: 'Image must be less than 2MB' })
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    
    // Clear avatar error if any
    const newErrors = { ...errors }
    delete newErrors.avatar
    setErrors(newErrors)
  }

  const clearAvatar = () => {
    setAvatarFile(null)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Department name is required"
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onCreate(formData, avatarFile || undefined)
    
    // Reset form
    setFormData({ name: "", type: "college", description: "", location: "" })
    setErrors({})
    clearAvatar()
    onClose()
  }

  const handleClose = () => {
    clearAvatar()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Department / Page</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label>Department Avatar (Optional)</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="w-20 h-20">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Department avatar" />
                ) : null}
                <AvatarFallback className="bg-transparent p-0">
                  <DepartmentPhotoTemplate name={formData.name || "New Department"} type={formData.type} />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => document.getElementById('avatar-input')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                  {avatarFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAvatar}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF or WebP. Max 2MB.
                </p>
                {errors.avatar && (
                  <p className="text-xs text-destructive">{errors.avatar}</p>
                )}
              </div>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-name">Department / Page Name</Label>
            <Input
              id="dept-name"
              placeholder="e.g., CSE Department, Police Station"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">{errors.name}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dept-type">Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
              <SelectTrigger id="dept-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College Department</SelectItem>
                <SelectItem value="government">Government Department</SelectItem>
                <SelectItem value="corporate">Corporate Organization</SelectItem>
                <SelectItem value="community">Community Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dept-desc">Description</Label>
            <textarea
              id="dept-desc"
              placeholder="Describe the purpose of this department or page..."
              className="w-full p-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            {errors.description && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">{errors.description}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dept-location">Location (Optional)</Label>
            <Input
              id="dept-location"
              placeholder="e.g., Chennai, TamilNadu"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button type="button" variant="outline" className="bg-transparent" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Create Department</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
