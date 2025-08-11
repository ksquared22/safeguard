"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LogIn, LogOutIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { groupTravelers } from "@/utils/travelerUtils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Traveler } from "@/types/traveler"
import { TravelerCard } from "../traveler/TravelerCard"

interface EmployeeDashboardProps {
  arrivalTravelers: Traveler[]
  setArrivalTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  departureTravelers: Traveler[]
  setDepartureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  fetchTravelers: () => Promise<void>
}

export function EmployeeDashboard({
  arrivalTravelers,
  setArrivalTravelers,
  departureTravelers,
  setDepartureTravelers,
  fetchTravelers,
}: EmployeeDashboardProps) {
  const isMobile = useIsMobile()
  const supabase = useMemo(() => createClient(), [])

  const [empTab, setEmpTab] = useState<"arrivals" | "departures">(
    (typeof window !== "undefined" && (localStorage.getItem("empTab") as any)) || "arrivals",
  )

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("empTab", empTab)
  }, [empTab])

  const { sortedArrivalFlights, sortedDepartureFlights, stats } = useMemo(() => {
    const sortedArrivalFlights = groupTravelers(arrivalTravelers)
    const sortedDepartureFlights = groupTravelers(departureTravelers)

    const totalArrivals = arrivalTravelers.length
    const checkedInArrivals = arrivalTravelers.filter((t) => t.checked_in).length
    const pendingArrivals = totalArrivals - checkedInArrivals

    const totalDepartures = departureTravelers.length
    const checkedInDepartures = departureTravelers.filter((t) => t.checked_in).length
    const checkedOutDepartures = departureTravelers.filter((t) => t.checked_out).length
    const pendingDepartures = totalDepartures - checkedInDepartures

    return {
      sortedArrivalFlights,
      sortedDepartureFlights,
      stats: {
        checkedInArrivals,
        pendingArrivals,
        checkedInDepartures,
        checkedOutDepartures,
        pendingDepartures,
        totalFlights: sortedArrivalFlights.length + sortedDepartureFlights.length,
      },
    }
  }, [arrivalTravelers, departureTravelers])

  const handleCheckIn = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("travelers")
        .update({ checked_in: true, check_in_time: new Date().toISOString() })
        .eq("id", id)
      if (error) console.error("Error checking in traveler:", error)
      else await fetchTravelers()
    },
    [supabase, fetchTravelers],
  )

  const handleCheckOut = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("travelers")
        .update({ checked_out: true, check_out_time: new Date().toISOString() })
        .eq("id", id)
      if (error) console.error("Error checking out traveler:", error)
      else await fetchTravelers()
    },
    [supabase, fetchTravelers],
  )

  const handleSaveNote = useCallback(
    async (travelerId: string, newNote: string) => {
      const { error } = await supabase.from("travelers").update({ notes: newNote }).eq("id", travelerId)
      if (error) console.error("Error saving note:", error)
      else await fetchTravelers()
    },
    [supabase, fetchTravelers],
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm text-blue-700">Arrivals Checked In</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.checkedInArrivals}</div>
            <div className="text-[10px] sm:text-xs text-blue-700/80">{stats.pendingArrivals} pending</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-100">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm text-indigo-700">Departures Checked In</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold text-indigo-900">{stats.checkedInDepartures}</div>
            <div className="text-[10px] sm:text-xs text-indigo-700/80">{stats.pendingDepartures} pending</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-100">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm text-emerald-700">Checked Out</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-900">{stats.checkedOutDepartures}</div>
            <div className="text-[10px] sm:text-xs text-emerald-700/80">Departures</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-100">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm text-amber-700">Total Flights</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold text-amber-900">{stats.totalFlights}</div>
            <div className="text-[10px] sm:text-xs text-amber-700/80">Arrival + Departure</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={empTab} onValueChange={(v) => setEmpTab(v as any)} className="space-y-4">
        <TabsList
          className={`
          sticky top-[60px] sm:top-[72px] z-40 rounded-xl p-1 sm:p-1.5
          bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-md 
          shadow-md border border-white/60
          ${isMobile ? "w-full overflow-x-auto scrollbar-hide" : "w-full"}
        `}
        >
          <div className={`flex ${isMobile ? "min-w-max space-x-2" : "w-full justify-center space-x-4"}`}>
            <TabsTrigger
              value="arrivals"
              className="rounded-lg data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 px-4 sm:px-6 py-2 text-gray-700 text-sm sm:text-base whitespace-nowrap min-w-[100px]"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Arrivals
            </TabsTrigger>
            <TabsTrigger
              value="departures"
              className="rounded-lg data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 px-4 sm:px-6 py-2 text-gray-700 text-sm sm:text-base whitespace-nowrap min-w-[100px]"
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              Departures
            </TabsTrigger>
          </div>
        </TabsList>

        <TabsContent value="arrivals">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Incoming Individuals</h2>
          <div className="space-y-4">
            {sortedArrivalFlights.map(([flightGroup, flightTravelers]) => (
              <Card key={flightGroup} className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-blue-700 space-y-2 sm:space-y-0">
                    <div>
                      <span className="text-base sm:text-lg">{flightTravelers[0]?.flight_number}</span>
                      <div className="text-xs sm:text-sm font-normal text-gray-500 mt-1">
                        Arrival: {flightTravelers[0]?.departure_time}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-700 border-blue-200 self-start sm:self-center"
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      {flightTravelers.filter((t) => t.checked_in).length}/{flightTravelers.length} Checked In
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {flightTravelers.map((traveler) => (
                      <TravelerCard
                        key={traveler.id}
                        traveler={traveler}
                        onCheckIn={() => handleCheckIn(traveler.id)}
                        onCheckOut={() => handleCheckOut(traveler.id)}
                        onSaveNote={(tid, _type, note) => handleSaveNote(tid, note)}
                        mode="arrival"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {sortedArrivalFlights.length === 0 && (
              <div className="text-center py-8 text-gray-500">No arrival travelers found.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="departures">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Outgoing Individuals</h2>
          <div className="space-y-4">
            {sortedDepartureFlights.map(([flightGroup, flightTravelers]) => (
              <Card key={flightGroup} className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-purple-700 space-y-2 sm:space-y-0">
                    <div>
                      <span className="text-base sm:text-lg">{flightTravelers[0]?.flight_number}</span>
                      <div className="text-xs sm:text-sm font-normal text-gray-500 mt-1">
                        Departure: {flightTravelers[0]?.departure_time}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-700 border-purple-200 self-start sm:self-center"
                    >
                      <LogOutIcon className="h-3 w-3 mr-1" />
                      {flightTravelers.filter((t) => t.checked_out).length}/{flightTravelers.length} Checked Out
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {flightTravelers.map((traveler) => (
                      <TravelerCard
                        key={traveler.id}
                        traveler={traveler}
                        onCheckIn={() => handleCheckIn(traveler.id)}
                        onCheckOut={() => handleCheckOut(traveler.id)}
                        onSaveNote={(tid, _type, note) => handleSaveNote(tid, note)}
                        mode="departure"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {sortedDepartureFlights.length === 0 && (
              <div className="text-center py-8 text-gray-500">No departure travelers found.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
