"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { authApi, departmentsApi } from "@/lib/api"
import { DepartmentPhotoTemplate } from "./department-avatar"

interface AvatarUploadProps {
  currentAvatar?: string
  fallbackText: string
  type: "user" | "department"
  departmentId?: string
  onSuccess?: (avatarUrl: string) => void
  size?: "sm" | "md" | "lg" | "xl"
  fallbackContent?: React.ReactNode
}

export function AvatarUpload({
  currentAvatar,
  fallbackText,
  type,
  departmentId,
  onSuccess,
  size = "lg",
  fallbackContent,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-40 h-40"
  }

  const normalizeAvatarUrl = (avatar?: string) => {
    if (!avatar) return null
    if (avatar.startsWith("http")) return avatar
    if (avatar.startsWith("/")) return `http://localhost:5000${avatar}`
    if (avatar.startsWith("uploads/")) return `http://localhost:5000/${avatar}`
    return `http://localhost:5000/uploads/${avatar}`
  }

  const isImageAvatar = (avatar?: string) => !!avatar && /(\.|^)(jpg|jpeg|png|gif|webp|svg)$/i.test(avatar)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB")
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      let response

      if (type === "user") {
        response = await authApi.uploadAvatar(selectedFile)
      } else if (type === "department" && departmentId) {
        response = await departmentsApi.uploadAvatar(departmentId, selectedFile)
      } else {
        toast.error("Invalid upload configuration")
        return
      }

      if (response.success) {
        toast.success("Avatar uploaded successfully!")
        const data = response.data as any
        const avatarUrl = data?.profileAvatar || data?.avatar
        onSuccess?.(avatarUrl)
        setPreviewUrl(null)
        setSelectedFile(null)
      } else {
        toast.error(response.message || "Failed to upload avatar")
      }
    } catch (error) {
      
      toast.error("Failed to upload avatar")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const displayAvatar = previewUrl || normalizeAvatarUrl(currentAvatar)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          {displayAvatar && (!currentAvatar || isImageAvatar(currentAvatar) || previewUrl) ? (
            <AvatarImage src={displayAvatar} alt="Avatar" />
          ) : null}
          <AvatarFallback className={type === "department" ? "bg-transparent p-0" : "bg-primary text-primary-foreground text-2xl"}>
            {type === "department" ? (
              fallbackContent || (
                <DepartmentPhotoTemplate name={fallbackText} type="community" />
              )
            ) : (
              fallbackText
            )}
          </AvatarFallback>
        </Avatar>
        
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFile && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Click the camera icon to change avatar
        <br />
        Max size: 2MB (JPEG, PNG, GIF, WebP)
      </p>
    </div>
  )
}
