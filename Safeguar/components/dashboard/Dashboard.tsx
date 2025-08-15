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
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("safeguard-selected-date")
      if (saved) {
        const date = new Date(saved)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
    return new Date()
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setUserRole(user.role)
  }, [user.role])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("safeguard-selected-date", selectedDate.toISOString())
    }
  }, [selectedDate])

  useEffect(() => {
    const handleAuthStateChange = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (error) {
          console.error("Session error:", error)
          await supabase.auth.signOut()
          return
        }

        if (!session) {
          console.log("No valid session found")
          setUser(null)
        }
      } catch (error) {
        console.error("Auth state error:", error)
        await supabase.auth.signOut()
        setUser(null)
      }
    }

    handleAuthStateChange()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null)
      } else if (event === "TOKEN_REFRESHED" && session) {
        console.log("Token refreshed successfully")
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, setUser])

  const fetchTravelersByDate = useCallback(
    async (date: Date) => {
      try {
        console.log("=== DATABASE DEBUG START ===")

        const { data: allTravelers, error: allError } = await supabase.from("travelers").select("*").limit(10)

        if (allError) {
          console.error("Error fetching all travelers for debug:", allError)
          return
        }

        console.log("Sample travelers in database:", allTravelers)
        console.log("Total travelers found:", allTravelers?.length || 0)

        if (!allTravelers || allTravelers.length === 0) {
          console.log("❌ NO DATA FOUND IN TRAVELERS TABLE")
          setArrivalTravelers([])
          setDepartureTravelers([])
          setUniquePersons([])
          return
        }

        const sampleDepartureTimes = allTravelers.slice(0, 5).map((t) => t.departure_time)
        console.log("Sample departure_time formats:", sampleDepartureTimes)

        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ]

        const month = monthNames[date.getMonth()]
        const day = date.getDate()
        const year = date.getFullYear()

        const datePatterns = [
          `${month} ${day}, ${year}`, // "August 10, 2024"
          `${month} ${day}`, // "August 10" (no year)
          `${month.substring(0, 3)} ${day}`, // "Aug 10"
        ]

        console.log("Trying date patterns:", datePatterns)

        let arrivingTravelers: any[] = []

        for (const pattern of datePatterns) {
          console.log(`Trying pattern: "${pattern}"`)

          const { data, error } = await supabase
            .from("travelers")
            .select("*")
            .eq("type", "arrival")
            .ilike("departure_time", `${pattern}%`)
            .order("departure_time")

          if (error) {
            console.error(`Error with pattern "${pattern}":`, error)
            continue
          }

          console.log(`Pattern "${pattern}" found ${data?.length || 0} travelers`)

          if (data && data.length > 0) {
            arrivingTravelers = data
            console.log(`✅ SUCCESS with pattern: "${pattern}"`)
            break
          }
        }

        console.log(`Final result: ${arrivingTravelers.length} arriving travelers`)

        if (arrivingTravelers.length === 0) {
          console.log(`❌ No arriving travelers found for any date pattern on ${month} ${day}, ${year}`)
          setArrivalTravelers([])
          setDepartureTravelers([])
          setUniquePersons([])
          return
        }

        const arrivingPersonIds = arrivingTravelers.map((t) => t.person_id).filter(Boolean)
        console.log("Arriving person IDs:", arrivingPersonIds)

        const { data: allRelatedTravelers, error: allError2 } = await supabase
          .from("travelers")
          .select("*")
          .in("person_id", arrivingPersonIds)
          .order("departure_time")

        if (allError2) {
          console.error("Error fetching all related travelers:", allError2)
          return
        }

        console.log(`Found ${allRelatedTravelers?.length || 0} total related travelers`)

        const { arrivals, departures, uniquePersons } = processTravelerData(allRelatedTravelers || [])

        setArrivalTravelers(arrivals)
        setDepartureTravelers(departures)
        setUniquePersons(uniquePersons)

        console.log(
          `✅ FINAL RESULT: ${arrivals.length} arrivals, ${departures.length} departures, ${uniquePersons.length} unique persons`,
        )
        console.log("=== DATABASE DEBUG END ===")
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("safeguard-selected-date")
      localStorage.removeItem("safeguard-admin-tab")
      localStorage.removeItem("safeguard-employee-tab")
    }

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
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Safeguard Management
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-white/70 hover:bg-white/90 border-gray-200 hover:border-gray-300 transition-all duration-200 min-w-0 flex-shrink-0",
                      "text-sm sm:text-base px-2 sm:px-3 py-2",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-1 sm:mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">
                      {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick date"}
                    </span>
                    <span className="sm:hidden">{selectedDate ? format(selectedDate, "M/d") : "Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
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
                    className="rounded-lg border shadow-xl bg-white"
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2 sm:gap-3">
                <Badge
                  variant="secondary"
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0 ${
                    userRole === "admin"
                      ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                      : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                  }`}
                >
                  <span className="hidden sm:inline">{userRole === "admin" ? "👑 Admin" : "👤 Employee"}</span>
                  <span className="sm:hidden">{userRole === "admin" ? "👑" : "👤"}</span>
                </Badge>

                <span className="hidden md:inline text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full truncate max-w-32">
                  {user.email}
                </span>

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="bg-white/70 hover:bg-white/90 border-gray-200 hover:border-gray-300 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
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
