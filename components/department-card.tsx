"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DepartmentAvatar } from "./department-avatar"
import { Users, MapPin, Settings } from "lucide-react"

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

interface DepartmentCardProps {
  department: Department
  onJoin?: (id: string) => void
  onViewDetails?: (id: string) => void
}

export function DepartmentCard({ department, onJoin, onViewDetails }: DepartmentCardProps) {
  const deptIcons = {
    college: "🎓",
    government: "🏛️",
    corporate: "🏢",
    community: "👥",
  }

  const deptColors = {
    college: "bg-blue-100 text-blue-700",
    government: "bg-purple-100 text-purple-700",
    corporate: "bg-green-100 text-green-700",
    community: "bg-orange-100 text-orange-700",
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <DepartmentAvatar
              avatar={department.avatar}
              name={department.name}
              type={department.type}
              className="w-12 h-12 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-1">{department.name}</CardTitle>
              <p className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${deptColors[department.type]}`}>
                {department.type.charAt(0).toUpperCase() + department.type.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{department.description}</p>

        {department.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{department.location}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-y border-border">
          <div className="text-center">
            <p className="font-semibold text-sm">{department.members}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">{department.posts}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">{department.members * 3}</p>
            <p className="text-xs text-muted-foreground">Reach</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {!department.isJoined ? (
            <Button className="w-full sm:flex-1" size="sm" onClick={() => onJoin?.(department.id)}>
              <Users className="w-3 h-3 mr-1" />
              Join
            </Button>
          ) : (
            <Button className="w-full sm:flex-1 gap-2 bg-transparent" variant="outline" size="sm">
              <Users className="w-3 h-3" />
              Joined
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onViewDetails?.(department.id)} className="w-full sm:w-auto">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
