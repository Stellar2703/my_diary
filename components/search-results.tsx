"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, MessageCircle, Share2, Download, ImageIcon, Video, Volume2 } from "lucide-react"
import { postsApi } from "@/lib/api"
import { toast } from "sonner"

interface SearchResult {
  id: string
  title: string
  author: string
  username: string
  avatar: string
  location: string
  date: string
  department: string
  description: string
  mediaType: "photo" | "video" | "audio"
  thumbnail: string
  likes: number
  comments: number
}

interface SearchResultsProps {
  filters: Record<string, string>
  hasSearched: boolean
}

export function SearchResults({ filters, hasSearched }: SearchResultsProps) {
  const [viewType, setViewType] = useState<"grid" | "timeline">("grid")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load search results when filters change
  useEffect(() => {
    if (hasSearched) {
      loadSearchResults()
    }
  }, [filters, hasSearched])

  const loadSearchResults = async () => {
    setIsLoading(true)
    try {
      // Build search parameters from filters
      const searchParams: any = {
        type: 'posts', // Only search for posts
        sortBy: filters.sortBy || 'recent',
        page: 1,
        limit: 50,
      }

      // Add location filters
      if (filters.country) searchParams.country = filters.country
      if (filters.state) searchParams.state = filters.state
      if (filters.city) searchParams.city = filters.city
      if (filters.area) searchParams.area = filters.area
      
      // Add department filter
      if (filters.department) searchParams.department = filters.department
      
      // Add date filters
      if (filters.dateFrom) searchParams.dateFrom = filters.dateFrom
      if (filters.dateTo) searchParams.dateTo = filters.dateTo
      
      // Add media type filter
      if (filters.mediaType && filters.mediaType !== 'all') {
        searchParams.mediaType = filters.mediaType
        searchParams.hasMedia = true
      }
      
      // Add search query if present
      if (filters.query) searchParams.query = filters.query

      const response = await postsApi.search(searchParams)
      if (response.success && response.data) {
        const posts = response.data.posts || []
        setResults(posts.map((post: any) => ({
          id: (post.id || post._id)?.toString() || '',
          title: post.content?.substring(0, 100) || "Untitled Post",
          author: post.name || "Unknown",
          username: post.username || "",
          avatar: post.avatar || post.name?.substring(0, 2).toUpperCase() || "U",
          location: `${post.city || ''}, ${post.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Unknown',
          date: post.post_date || post.created_at,
          department: post.department_name || "General",
          description: post.content || "",
          mediaType: post.media_type === "video" ? "video" : post.media_type === "audio" ? "audio" : "photo",
          thumbnail: post.media_url ? `http://localhost:5000${post.media_url}` : "/placeholder.svg",
          likes: post.reaction_count || 0,
          comments: post.comment_count || 0,
        })).filter((r: any) => r.id)) // Filter out any results without valid ids)
      } else {
        setResults([])
        if (response.message) {
          toast.error(response.message)
        }
      }
    } catch (error) {
      
      toast.error("Failed to load search results")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">Use the filters above to search for events and content</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  const activeFilters = Object.values(filters).filter((v) => v !== "").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {results.length} results found
            {activeFilters > 0 && ` with ${activeFilters} active filter(s)`}
          </p>
        </div>
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as "grid" | "timeline")}>
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewType === "grid" ? (
        <div className="grid md:grid-cols-2 gap-4">
          {results.map((result) => (
            <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden group">
                <img
                  src={result.thumbnail || "/placeholder.svg"}
                  alt={result.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  {result.mediaType === "photo" && (
                    <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" />
                  )}
                  {result.mediaType === "video" && (
                    <Video className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" />
                  )}
                  {result.mediaType === "audio" && (
                    <Volume2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{result.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{result.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {result.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{result.author}</p>
                    <p className="text-xs text-muted-foreground">{result.username}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  <p>📍 {result.location}</p>
                  <p>🏢 {result.department}</p>
                </div>

                <div className="flex gap-2 text-xs text-muted-foreground mb-3">
                  <span>{result.likes} likes</span>
                  <span>·</span>
                  <span>{result.comments} comments</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 bg-transparent text-muted-foreground hover:text-primary"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Like</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 bg-transparent text-muted-foreground hover:text-primary"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Comment</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 bg-transparent text-muted-foreground hover:text-primary"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Share</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-32 h-32 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    <img
                      src={result.thumbnail || "/placeholder.svg"}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-sm mb-1">{result.title}</h3>
                        <p className="text-xs text-muted-foreground">{result.date}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {result.mediaType === "photo" && "📷"}
                        {result.mediaType === "video" && "🎥"}
                        {result.mediaType === "audio" && "🎙️"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">{result.description}</p>

                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {result.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{result.author}</span>
                      <span className="text-xs text-muted-foreground">({result.username})</span>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 mb-2">
                      <p>
                        📍 {result.location} • 🏢 {result.department}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 bg-transparent text-muted-foreground hover:text-primary"
                      >
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">{result.likes}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 bg-transparent text-muted-foreground hover:text-primary"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span className="text-xs">{result.comments}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 bg-transparent text-muted-foreground hover:text-primary"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
