"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase"
import { AdminDashboard } from "./AdminDashboard"
import { EmployeeDashboard } from "./EmployeeDashboard"
import type { Traveler, Person, User } from "@/types/traveler"
import { cn } from "@/lib/utils"

interface DashboardProps {
  user: User
  setUser: (user: User | null) => void
  arrivalTravelers: Traveler[]
  setArrivalTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  departureTravelers: Traveler[]
  setDepartureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  uniquePersons: Person[]
  setUniquePersons: React.Dispatch<React.SetStateAction<Person[]>>
  fetchTravelers: () => Promise<void>
}

export function Dashboard({
  user,
  setUser,
  arrivalTravelers,
  setArrivalTravelers,
  departureTravelers,
  setDepartureTravelers,
  uniquePersons,
  setUniquePersons,
  fetchTravelers,
}: DashboardProps) {
  const [userRole, setUserRole] = useState<"admin" | "employee">(user.role)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setUserRole(user.role)
  }, [user.role])

  const fetchTravelersByDate = useCallback(
    async (date: Date) => {
      try {
        const dateStr = format(date, "yyyy-MM-dd")
        const { data: travelers, error } = await supabase
          .from("travelers")
          .select("*")
          .like("departure_time", `${dateStr}%`)
          .order("departure_time")

        if (error) {
          console.error("Error fetching travelers by date:", error)
          return
        }

        // Process and separate arrivals/departures
        const arrivals = travelers?.filter((t) => t.type === "arrival") || []
        const departures = travelers?.filter((t) => t.type === "departure" || t.type === "cruise") || []

        setArrivalTravelers(arrivals)
        setDepartureTravelers(departures)

        // Update unique persons
        const personMap = new Map<string, Person>()
        travelers?.forEach((traveler) => {
          const personId = traveler.person_id || `person-${traveler.name.toLowerCase().replace(/\s+/g, "-")}`

          if (!personMap.has(personId)) {
            personMap.set(personId, {
              personId,
              name: traveler.name,
              photo_url: traveler.photo_url,
              notes: traveler.notes,
              arrivalSegments: [],
              departureSegments: [],
              isAnySegmentCheckedIn: false,
              isAnySegmentCheckedOut: false,
            })
          }

          const person = personMap.get(personId)!
          if (traveler.type === "arrival") {
            person.arrivalSegments.push(traveler)
          } else {
            person.departureSegments.push(traveler)
          }
        })

        const uniquePersons = Array.from(personMap.values()).map((p) => {
          p.isAnySegmentCheckedIn =
            p.arrivalSegments.some((s) => s.checked_in) || p.departureSegments.some((s) => s.checked_in)
          p.isAnySegmentCheckedOut = p.departureSegments.some((s) => s.checked_out)
          return p
        })

        setUniquePersons(uniquePersons)
      } catch (error) {
        console.error("Error fetching travelers by date:", error)
      }
    },
    [supabase, setArrivalTravelers, setDepartureTravelers, setUniquePersons],
  )

  useEffect(() => {
    fetchTravelersByDate(selectedDate)
  }, [selectedDate, fetchTravelersByDate])

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
    } else {
      setUser(null)
      window.location.href = "/"
    }
  }, [supabase, setUser])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Safeguard Management
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] sm:w-[240px] justify-start text-left font-normal bg-white/60 hover:bg-white/80 border-gray-200 hover:border-gray-300",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date)
                        setIsCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <Badge
                variant="secondary"
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                  userRole === "admin"
                    ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                    : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                }`}
              >
                {userRole === "admin" ? "👑 Admin" : "👤 Employee"}
              </Badge>
              <span className="hidden sm:inline text-sm text-gray-600 bg-white/60 px-3 py-1 rounded-full truncate max-w-32">
                {user.email}
              </span>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="bg-white/60 hover:bg-white/80 border-gray-200 hover:border-gray-300 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {userRole === "admin" ? (
          <AdminDashboard
            uniquePersons={uniquePersons}
            setUniquePersons={setUniquePersons}
            setArrivalTravelers={setArrivalTravelers}
            setDepartureTravelers={setDepartureTravelers}
            fetchTravelers={() => fetchTravelersByDate(selectedDate)}
          />
        ) : (
          <EmployeeDashboard
            arrivalTravelers={arrivalTravelers}
            setArrivalTravelers={setArrivalTravelers}
            departureTravelers={departureTravelers}
            setDepartureTravelers={setDepartureTravelers}
            fetchTravelers={() => fetchTravelersByDate(selectedDate)}
          />
        )}
      </main>
    </div>
  )
}
