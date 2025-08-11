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
import { processTravelerData } from "@/utils/travelerUtils"
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
          .or(`departure_time.like.${dateStr}%,departure_time.like.%${dateStr}%`)
          .order("departure_time")

        if (error) {
          console.error("Error fetching travelers by date:", error)
          return
        }

        if (!travelers || travelers.length === 0) {
          console.log(`No travelers found for date: ${dateStr}`)
          setArrivalTravelers([])
          setDepartureTravelers([])
          setUniquePersons([])
          return
        }

        const { arrivals, departures, uniquePersons } = processTravelerData(travelers)

        setArrivalTravelers(arrivals)
        setDepartureTravelers(departures)
        setUniquePersons(uniquePersons)

        console.log(
          `Loaded ${travelers.length} travelers for ${dateStr}: ${arrivals.length} arrivals, ${departures.length} departures`,
        )
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Safeguard Management
                </h1>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[240px] justify-start text-left font-normal bg-white/60 hover:bg-white/80 border-gray-200 hover:border-gray-300 transition-all duration-200",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" sideOffset={5}>
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
                    className="rounded-md border shadow-lg"
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <Badge
                  variant="secondary"
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0 ${
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
                  className="bg-white/60 hover:bg-white/80 border-gray-200 hover:border-gray-300 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
                >
                  Sign Out
                </Button>
              </div>
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
