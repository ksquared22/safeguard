"use client"
import { LoginPage } from "@/components/auth/LoginPage"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { useTravelers } from "@/hooks/useTravelers"

export default function HomePage() {
  const {
    user,
    setUser,
    loading,
    arrivalTravelers,
    setArrivalTravelers,
    departureTravelers,
    setDepartureTravelers,
    uniquePersons,
    setUniquePersons,
    fetchTravelers,
  } = useTravelers()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading Safeguard Management...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage setUser={setUser} />
  }

  return (
    <Dashboard
      user={user}
      setUser={setUser}
      arrivalTravelers={arrivalTravelers}
      setArrivalTravelers={setArrivalTravelers}
      departureTravelers={departureTravelers}
      setDepartureTravelers={setDepartureTravelers}
      uniquePersons={uniquePersons}
      setUniquePersons={setUniquePersons}
      fetchTravelers={fetchTravelers}
    />
  )
}
