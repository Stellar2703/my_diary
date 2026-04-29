"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageIcon, Video, Volume2, MapPin, X, AlertCircle, RefreshCw } from "lucide-react"
import { postsApi, departmentsApi } from "@/lib/api"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface PostUploadCardProps {
  defaultDepartmentId?: string
}

interface DetectedLocation {
  latitude: number
  longitude: number
  city: string
  state: string
  country: string
}

export function PostUploadCard({ defaultDepartmentId }: PostUploadCardProps = {}) {
  const [content, setContent] = useState("")
  const [mediaType, setMediaType] = useState<"photo" | "video" | "audio" | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [extraLocation, setExtraLocation] = useState("")
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null)
  const [locationStatus, setLocationStatus] = useState("Detecting your current location...")
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [postInDepartment, setPostInDepartment] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(defaultDepartmentId || "")
  const [isAlert, setIsAlert] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load departments and detect the user's current location
  useEffect(() => {
    detectCurrentLocation()
    loadDepartments()
  }, [])

  // Set default department when prop changes
  useEffect(() => {
    if (defaultDepartmentId) {
      setSelectedDepartment(defaultDepartmentId)
    }
  }, [defaultDepartmentId])

  const normalizeLocationText = (value: string) => value.trim().replace(/\s+/g, " ")

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to reverse geocode location")
      }

      const data = await response.json()
      const address = data?.address || {}

      const city = address.city || address.town || address.village || address.municipality || address.county || address.suburb || address.city_district || ""
      const state = address.state || address.region || address.state_district || address.province || address.county || ""
      const country = address.country || ""

      return {
        city: normalizeLocationText(city),
        state: normalizeLocationText(state),
        country: normalizeLocationText(country),
      }
    } catch (error) {
      return {
        city: "",
        state: "",
        country: "",
      }
    }
  }

  const detectCurrentLocation = () => {
    setIsDetectingLocation(true)
    setLocationError("")
    setLocationStatus("Detecting your current location...")

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("This browser does not support automatic location detection.")
      setLocationStatus("Location detection unavailable")
      setIsDetectingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const resolvedLocation = await reverseGeocode(latitude, longitude)

        setDetectedLocation({
          latitude,
          longitude,
          city: resolvedLocation.city,
          state: resolvedLocation.state,
          country: resolvedLocation.country,
        })

        const detectedParts = [resolvedLocation.city, resolvedLocation.state, resolvedLocation.country].filter(Boolean)
        setLocationStatus(
          detectedParts.length > 0
            ? `Using ${detectedParts.join(", ")}`
            : `Using current coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
        )
        setIsDetectingLocation(false)
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location access is required so posts are tagged automatically and cannot be entered manually."
            : "Unable to detect your location right now. Please enable location services and try again."
        )
        setLocationStatus("Location detection failed")
        setIsDetectingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    )
  }

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getJoined()
      if (response.success && response.data) {
        setDepartments(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      
    }
  }

  const handleMediaSelect = (type: "photo" | "video" | "audio") => {
    setMediaType(type)
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)
      toast.success(`${mediaType} selected: ${file.name}`)
    }
  }

  const handlePost = async () => {
    if (!content && !mediaFile) {
      toast.error("Please add some content or media")
      return
    }

    if (!detectedLocation) {
      toast.error("Waiting for automatic location detection. Please allow location access.")
      return
    }

    setIsPosting(true)

    try {
      const formData = new FormData()
      
      if (content) {
        formData.append("content", content)
      }
      
      if (mediaFile && mediaType) {
        formData.append("media", mediaFile)
        formData.append("mediaType", mediaType)
      }
      
      if (extraLocation) {
        formData.append("area", extraLocation)
      }
      formData.append("city", detectedLocation.city)
      formData.append("state", detectedLocation.state)
      formData.append("country", detectedLocation.country)
      formData.append("latitude", String(detectedLocation.latitude))
      formData.append("longitude", String(detectedLocation.longitude))
      
      if (selectedDepartment && postInDepartment) {
        formData.append("departmentId", selectedDepartment)
        if (isAlert) {
          formData.append("isAlert", "true")
        }
      }

      const response = await postsApi.create(formData)

      if (response.success) {
        toast.success("Post created successfully!")
        // Reset form
        setContent("")
        setMediaFile(null)
        setMediaType(null)
        setExtraLocation("")
        setPostInDepartment(false)
        setSelectedDepartment(defaultDepartmentId || "")
        setIsAlert(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        // Refresh page to show new post
        window.location.reload()
      } else {
        toast.error(response.message || "Failed to create post")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Content */}
        <div>
          <Textarea
            placeholder="What's happening at your location?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Media Upload */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={
              mediaType === "photo" ? "image/*" :
              mediaType === "video" ? "video/*" :
              mediaType === "audio" ? "audio/*" : ""
            }
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant={mediaType === "photo" ? "default" : "outline"}
              onClick={() => handleMediaSelect("photo")}
              type="button"
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Photo
            </Button>
            <Button
              variant={mediaType === "video" ? "default" : "outline"}
              onClick={() => handleMediaSelect("video")}
              type="button"
              className="gap-2"
            >
              <Video className="w-4 h-4" />
              Video
            </Button>
            <Button
              variant={mediaType === "audio" ? "default" : "outline"}
              onClick={() => handleMediaSelect("audio")}
              type="button"
              className="gap-2"
            >
              <Volume2 className="w-4 h-4" />
              Audio
            </Button>
          </div>

          {mediaFile && (
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm truncate">{mediaFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMediaFile(null)
                  setMediaType(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Automatic Location
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={detectCurrentLocation}
              disabled={isDetectingLocation}
            >
              <RefreshCw className={`w-4 h-4 ${isDetectingLocation ? "animate-spin" : ""}`} />
              {isDetectingLocation ? "Detecting..." : "Refresh location"}
            </Button>
          </div>

          <div className="rounded-md border bg-background px-3 py-2 text-sm">
            {locationError ? (
              <div className="space-y-2 text-destructive">
                <p>{locationError}</p>
                <p className="text-xs text-muted-foreground">
                  Phones will use GPS when available. Laptops use the browser's location services, which usually rely on Wi-Fi or network positioning.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">{locationStatus}</p>
                {detectedLocation && (
                  <p className="text-xs text-muted-foreground">
                    {detectedLocation.latitude.toFixed(5)}, {detectedLocation.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-location">Extra location detail (optional)</Label>
            <Input
              id="extra-location"
              placeholder="Building, block, landmark, or room"
              value={extraLocation}
              onChange={(e) => setExtraLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Alert checkbox - always visible when inside a department page */}
        {defaultDepartmentId && (
          <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <Checkbox
              id="alert-checkbox"
              checked={isAlert}
              onCheckedChange={(checked) => setIsAlert(checked as boolean)}
            />
            <div className="flex-1">
              <label
                htmlFor="alert-checkbox"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Send Alert to All Department Members</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                All members will receive a notification for this post
              </p>
            </div>
          </div>
        )}

        {/* Department Posting Option - only shown on home feed (no defaultDepartmentId) */}
        {!defaultDepartmentId && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="post-in-department"
                checked={postInDepartment}
                onCheckedChange={(checked) => {
                  setPostInDepartment(checked as boolean)
                  if (!checked) {
                    setSelectedDepartment("")
                    setIsAlert(false)
                  }
                }}
              />
              <Label
                htmlFor="post-in-department"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Post in department
              </Label>
            </div>

            {/* Department Selection - shown when checkbox is checked */}
            {postInDepartment && departments.length > 0 && (
              <div className="space-y-3 ml-6">
                <Label>Choose department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Alert Checkbox - shown when a department is selected */}
                {selectedDepartment && (
                  <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <Checkbox
                      id="alert-checkbox-home"
                      checked={isAlert}
                      onCheckedChange={(checked) => setIsAlert(checked as boolean)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="alert-checkbox-home"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Send Alert to All Department Members</span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        All members will receive a notification for this post
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message when no joined departments */}
            {postInDepartment && departments.length === 0 && (
              <div className="ml-6 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You haven't joined any departments yet. Visit the departments page to join one.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Post Button */}
        <Button
          className="w-full"
          onClick={handlePost}
          disabled={isPosting || isDetectingLocation || !detectedLocation}
        >
          {isPosting ? "Posting..." : detectedLocation ? "Post" : "Detect location first"}
        </Button>
      </CardContent>
    </Card>
  )
}
