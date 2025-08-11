"use client"

import { memo, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Hotel, AlertTriangle } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Person } from "@/types/traveler"

interface PersonListProps {
  persons: Person[]
  showManage?: boolean
  onDeletePerson?: (personId: string) => void
}

export const PersonList = memo(function PersonList({ persons, showManage = false, onDeletePerson }: PersonListProps) {
  const isMobile = useIsMobile()

  const { sortedPersons, stats } = useMemo(() => {
    const sortedPersons = [...persons].sort((a, b) => {
      // Sort by status: departed -> checked in -> pending
      if (a.isAnySegmentCheckedOut !== b.isAnySegmentCheckedOut) {
        return a.isAnySegmentCheckedOut ? -1 : 1
      }
      if (a.isAnySegmentCheckedIn !== b.isAnySegmentCheckedIn) {
        return a.isAnySegmentCheckedIn ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    const stats = {
      total: persons.length,
      withPhotos: persons.filter((p) => p.photo_url).length,
      withNotes: persons.filter((p) => p.notes).length,
    }

    return { sortedPersons, stats }
  }, [persons])

  const handleDelete = (personId: string, personName: string) => {
    if (!onDeletePerson) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${personName} and all their travel segments? This action cannot be undone.`,
    )

    if (confirmed) {
      onDeletePerson(personId)
    }
  }

  if (sortedPersons.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-gray-400 mb-4">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Individuals Found</h3>
          <p className="text-gray-500 text-center max-w-md">
            {showManage
              ? "No individuals are currently in the system. Add some travelers to get started."
              : "No individuals match the current criteria."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg sm:text-xl text-gray-900">All Unique Individuals</CardTitle>
            <CardDescription className="text-sm text-gray-700/80">
              Consolidated view across arrival and departure segments
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="bg-gray-100 px-2 py-1 rounded">Total: {stats.total}</span>
            <span className="bg-blue-100 px-2 py-1 rounded">Photos: {stats.withPhotos}</span>
            <span className="bg-green-100 px-2 py-1 rounded">Notes: {stats.withNotes}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          {sortedPersons.map((person) => {
            const hasOvernight = person.arrivalSegments.some((s) => s.overnight_hotel)
            return (
              <PersonCard
                key={person.personId}
                person={person}
                hasOvernight={hasOvernight}
                showManage={showManage}
                onDelete={handleDelete}
                isMobile={isMobile}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})

const PersonCard = memo(function PersonCard({
  person,
  hasOvernight,
  showManage,
  onDelete,
  isMobile,
}: {
  person: Person
  hasOvernight: boolean
  showManage: boolean
  onDelete: (personId: string, personName: string) => void
  isMobile: boolean
}) {
  return (
    <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
      {person.photo_url ? (
        <img
          src={person.photo_url || "/placeholder.svg"}
          alt={`Photo of ${person.name}`}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-purple-200 flex-shrink-0"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            target.nextElementSibling?.classList.remove("hidden")
          }}
        />
      ) : null}
      <div
        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 ${
          person.photo_url ? "hidden" : ""
        }`}
      >
        <span className="text-gray-500 text-xs font-medium">No Photo</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{person.name}</h3>
          {person.isAnySegmentCheckedOut ? (
            <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-600 text-white h-5 text-xs">
              Departed
            </Badge>
          ) : person.isAnySegmentCheckedIn ? (
            <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white h-5 text-xs">
              Checked In
            </Badge>
          ) : (
            <Badge variant="secondary" className="h-5 text-xs">
              Pending
            </Badge>
          )}
          {hasOvernight && (
            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white h-5 text-xs">
              <Hotel className="h-3 w-3 mr-1" />
              Overnight
            </Badge>
          )}
        </div>

        <div className="space-y-1 text-xs sm:text-sm text-gray-700">
          <p className="truncate">
            <span className="font-medium">Arrivals:</span>{" "}
            {person.arrivalSegments.length > 0
              ? person.arrivalSegments
                  .map((s) => `${s.flight_number} (${s.departure_time})`)
                  .join(", ")
                  .substring(0, isMobile ? 50 : 100) + (person.arrivalSegments.length > 1 ? "..." : "")
              : "N/A"}
          </p>
          <p className="truncate">
            <span className="font-medium">Departures:</span>{" "}
            {person.departureSegments.length > 0
              ? person.departureSegments
                  .map((s) => `${s.flight_number} (${s.departure_time})`)
                  .join(", ")
                  .substring(0, isMobile ? 50 : 100) + (person.departureSegments.length > 1 ? "..." : "")
              : "N/A"}
          </p>
        </div>

        {person.notes && (
          <p className="text-xs text-gray-700 mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 line-clamp-2">
            {person.notes}
          </p>
        )}
      </div>

      {showManage && (
        <div className="flex items-center flex-shrink-0">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(person.personId, person.name)}
            className="shadow-sm h-8 px-3 text-xs"
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  )
})
