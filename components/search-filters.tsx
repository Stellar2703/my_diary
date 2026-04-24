"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronDown, X } from "lucide-react"
import { departmentsApi } from "@/lib/api"
import { toast } from "sonner"

interface SearchFilters {
  query: string
  department: string
  username: string
  streetName: string
  area: string
  city: string
  state: string
  country: string
  dateFrom: string
  dateTo: string
  mediaType: string
  sortBy: string
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFilterChange: (filters: SearchFilters) => void
  onSearch: () => void
}

export function SearchFiltersComponent({ filters, onFilterChange, onSearch }: SearchFiltersProps) {
  const [expanded, setExpanded] = useState(true)
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])

  // Load departments on component mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await departmentsApi.getAll()
        if (response.success && response.data) {
          // Handle both array and object responses
          const deptData = Array.isArray(response.data) ? response.data : response.data.departments || []
          setDepartments(deptData)
        }
      } catch (error) {
        
        setDepartments([]) // Ensure it's always an array
      }
    }
    loadDepartments()
  }, [])

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    onFilterChange({ ...filters, [field]: value })
  }

  const handleReset = () => {
    onFilterChange({
      query: "",
      department: "",
      username: "",
      streetName: "",
      area: "",
      city: "",
      state: "",
      country: "",
      dateFrom: "",
      dateTo: "",
      mediaType: "",
      sortBy: "",
    })
  }

  const activeFilters = Object.values(filters).filter((v) => v !== "").length

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Advanced Filters</CardTitle>
          <div className="flex items-center gap-2">
            {activeFilters > 0 && (
              <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-medium">
                {activeFilters}
              </span>
            )}
            <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Search Query Field */}
          <div>
            <Label htmlFor="search-query" className="text-sm">
              Search Query
            </Label>
            <Input
              id="search-query"
              placeholder="Search posts by content..."
              value={filters.query}
              onChange={(e) => handleInputChange("query", e.target.value)}
            />
          </div>

          {/* Sort By */}
          <div>
            <Label htmlFor="sort-by" className="text-sm">
              Sort By
            </Label>
            <Select value={filters.sortBy || undefined} onValueChange={(v) => handleInputChange("sortBy", v)}>
              <SelectTrigger id="sort-by">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="relevance">Most Relevant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Media Type Filter */}
          <div>
            <Label htmlFor="media-type" className="text-sm">
              Media Type
            </Label>
            <Select value={filters.mediaType || undefined} onValueChange={(v) => handleInputChange("mediaType", v)}>
              <SelectTrigger id="media-type">
                <SelectValue placeholder="All media types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photos</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {/* Department Filter */}
            <AccordionItem value="department">
              <AccordionTrigger>Department</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label htmlFor="department" className="text-sm">
                    Department
                  </Label>
                  <Select value={filters.department || undefined} onValueChange={(v) => handleInputChange("department", v)}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(departments) && departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Location Filters */}
            <AccordionItem value="location">
              <AccordionTrigger>Location Details</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label htmlFor="country" className="text-sm">
                    Country
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g., India"
                    value={filters.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-sm">
                    State / Province
                  </Label>
                  <Input
                    id="state"
                    placeholder="e.g., Tamil Nadu"
                    value={filters.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="city" className="text-sm">
                    City / District
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., Chennai"
                    value={filters.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="area" className="text-sm">
                    Area Name
                  </Label>
                  <Input
                    id="area"
                    placeholder="e.g., Mylapore"
                    value={filters.area}
                    onChange={(e) => handleInputChange("area", e.target.value)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* User & Date Filters */}
            <AccordionItem value="user-date">
              <AccordionTrigger>User & Date Range</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label htmlFor="username" className="text-sm">
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="e.g., @johndoe"
                    value={filters.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm">Date Range</Label>
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleInputChange("dateFrom", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleInputChange("dateTo", e.target.value)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={onSearch} className="flex-1">
              Search
            </Button>
            {activeFilters > 0 && (
              <Button variant="outline" className="bg-transparent" onClick={handleReset}>
                <X className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
