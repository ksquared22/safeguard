"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { AdminDashboard } from "./AdminDashboard"
import { EmployeeDashboard } from "./EmployeeDashboard"
import type { Traveler, Person, User } from "@/types/traveler"

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
  const supabase = createClient()

  useEffect(() => {
    setUserRole(user.role)
  }, [user.role])

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
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
                <Plane className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Safeguard Management
                </h1>
                <Badge
                  variant="outline"
                  className="mt-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200 text-xs sm:text-sm"
                >
                  ✈️ August 11 Movements
                </Badge>
              </div>
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
            fetchTravelers={fetchTravelers}
          />
        ) : (
          <EmployeeDashboard
            arrivalTravelers={arrivalTravelers}
            setArrivalTravelers={setArrivalTravelers}
            departureTravelers={departureTravelers}
            setDepartureTravelers={setDepartureTravelers}
            fetchTravelers={fetchTravelers}
          />
        )}
      </main>
    </div>
  )
}
