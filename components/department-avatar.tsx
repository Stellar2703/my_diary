"use client"

import type React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ImageIcon } from "lucide-react"

type DepartmentType = "college" | "government" | "corporate" | "community"

const typeGradients: Record<DepartmentType, string> = {
  college: "from-sky-600 via-cyan-500 to-teal-400",
  government: "from-slate-700 via-slate-600 to-zinc-500",
  corporate: "from-emerald-600 via-green-500 to-lime-400",
  community: "from-amber-500 via-orange-500 to-rose-400",
}

const typeLabels: Record<DepartmentType, string> = {
  college: "College",
  government: "Government",
  corporate: "Corporate",
  community: "Community",
}

function normalizeAvatarUrl(avatar?: string) {
  if (!avatar) return null
  if (avatar.startsWith("http")) return avatar
  if (avatar.startsWith("/")) return `http://localhost:5000${avatar}`
  if (avatar.startsWith("uploads/")) return `http://localhost:5000/${avatar}`
  return `http://localhost:5000/uploads/${avatar}`
}

function isImageAvatar(avatar?: string) {
  return !!avatar && /(\.|^)(jpg|jpeg|png|gif|webp|svg)$/i.test(avatar)
}

interface DepartmentPhotoTemplateProps {
  name: string
  type: DepartmentType
}

export function DepartmentPhotoTemplate({ name, type }: DepartmentPhotoTemplateProps) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden text-white", `bg-gradient-to-br ${typeGradients[type]}`)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_24%)]" />
      <div className="absolute left-2 top-2 h-8 w-8 rounded-full border border-white/20 bg-white/10" />
      <div className="absolute bottom-2 right-2 h-10 w-10 rounded-full border border-white/15 bg-white/10" />
      <div className="relative flex flex-col items-center gap-2 px-3 text-center">
        <div className="rounded-full bg-white/15 p-3 shadow-lg backdrop-blur-sm">
          <ImageIcon className="h-5 w-5 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/75">PeekHour</p>
          <p className="text-xs font-semibold leading-tight text-white/95 line-clamp-2">{name}</p>
          <p className="text-[10px] text-white/75">{typeLabels[type]} Department</p>
        </div>
      </div>
    </div>
  )
}

interface DepartmentAvatarProps {
  avatar?: string
  name: string
  type: DepartmentType
  className?: string
}

export function DepartmentAvatar({ avatar, name, type, className }: DepartmentAvatarProps) {
  const avatarUrl = normalizeAvatarUrl(avatar)

  return (
    <Avatar className={cn("overflow-hidden", className)}>
      {isImageAvatar(avatar) && avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="bg-transparent p-0">
        <DepartmentPhotoTemplate name={name} type={type} />
      </AvatarFallback>
    </Avatar>
  )
}
