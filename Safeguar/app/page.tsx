"use client"

import { DialogDescription } from "@/components/ui/dialog"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plane, Users, Clock, LogOut, LogIn, MessageSquare } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase" // Import Supabase client

console.log("App Page Component Loaded") // Added for debugging

interface Traveler {
  id: string // Unique ID for this specific travel segment (e.g., "arr-1", "dep-1")
  personId: string // Unique ID for the actual person
  name: string
  flight_number: string
  departure_time: string // This field now represents either arrival or departure time based on 'type'
  type: "arrival" | "departure" | "cruise"
  checked_in: boolean // True if arrived (for arrival) or checked in for departure (for departure/cruise)
  checked_out: boolean // True if departed (for departure/cruise)
  photo_url: string | null // Will store Base64 string
  overnight_hotel?: boolean // Only relevant for arrival flights
  check_in_time?: string | null
  check_out_time?: string | null
  notes?: string | null // New field for notes
}

interface Person {
  personId: string
  name: string
  photo_url: string | null
  notes: string | null
  arrivalSegments: Traveler[]
  departureSegments: Traveler[]
  isAnySegmentCheckedIn: boolean
  isAnySegmentCheckedOut: boolean
}

// Function to process raw data (fetched from DB) into structured arrival/departure lists and unique persons
const processTravelerData = (
  rawTravelers: Traveler[],
): { arrivals: Traveler[]; departures: Traveler[]; uniquePersons: Person[] } => {
  console.log("Processing raw travelers:", rawTravelers)
  const personMap = new Map<string, Person>() // Maps personId to Person object
  const allTravelerSegments: Traveler[] = []

  rawTravelers.forEach((traveler) => {
    // Ensure personId exists, if not, generate one (should ideally come from DB)
    const personId = traveler.personId || `person-${traveler.name.toLowerCase().replace(/\s+/g, "-")}`

    const currentTravelerSegment: Traveler = {
      ...traveler,
      personId: personId, // Ensure personId is set
      overnight_hotel: traveler.overnight_hotel || false, // Default to false if undefined
      notes: traveler.notes || null, // Default to null if undefined
      check_in_time: traveler.check_in_time || null,
      check_out_time: traveler.check_out_time || null,
    }
    allTravelerSegments.push(currentTravelerSegment)

    // Update or create the Person object
    if (!personMap.has(personId)) {
      personMap.set(personId, {
        personId: personId,
        name: currentTravelerSegment.name,
        photo_url: currentTravelerSegment.photo_url,
        notes: currentTravelerSegment.notes,
        arrivalSegments: [],
        departureSegments: [],
        isAnySegmentCheckedIn: false,
        isAnySegmentCheckedOut: false,
      })
    }
    const person = personMap.get(personId)!

    // Synchronize photo_url and notes from any segment to the main person object
    // Only update if the person's photo_url/notes are null and the segment has a value
    if (currentTravelerSegment.photo_url && !person.photo_url) {
      person.photo_url = currentTravelerSegment.photo_url
    }
    if (currentTravelerSegment.notes && !person.notes) {
      person.notes = currentTravelerSegment.notes
    }

    if (currentTravelerSegment.type === "arrival") {
      person.arrivalSegments.push(currentTravelerSegment)
    } else {
      person.departureSegments.push(currentTravelerSegment)
    }
  })

  // Convert map to array and calculate aggregated status
  const uniquePersons = Array.from(personMap.values()).map((person) => {
    person.isAnySegmentCheckedIn =
      person.arrivalSegments.some((s) => s.checked_in) || person.departureSegments.some((s) => s.checked_in)
    person.isAnySegmentCheckedOut = person.departureSegments.some((s) => s.checked_out)
    return person
  })

  const arrivals = allTravelerSegments.filter((t) => t.type === "arrival")
  const departures = allTravelerSegments.filter((t) => t.type === "departure" || t.type === "cruise")

  console.log("Processed unique persons:", uniquePersons)
  return { arrivals, departures, uniquePersons }
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [arrivalTravelers, setArrivalTravelers] = useState<Traveler[]>([])
  const [departureTravelers, setDepartureTravelers] = useState<Traveler[]>([])
  const [uniquePersons, setUniquePersons] = useState<Person[]>([])
  const supabase = createClient()

  const fetchTravelers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from("travelers").select("*")

    if (error) {
      console.error("Error fetching travelers from Supabase:", error)
      // Fallback to empty data if there's an error
      setArrivalTravelers([])
      setDepartureTravelers([])
      setUniquePersons([])
    } else {
      console.log("Fetched raw data from Supabase:", data)
      const processedData = processTravelerData(data as Traveler[])
      setArrivalTravelers(processedData.arrivals)
      setDepartureTravelers(processedData.departures)
      setUniquePersons(processedData.uniquePersons)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const loadUserAndData = async () => {
      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Error getting session:", sessionError)
        setLoading(false)
        return
      }

      if (session?.user) {
        // Fetch the user's role from the user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single()

        if (roleError) {
          console.error("Error fetching user role:", roleError)
          // Default to employee if role fetch fails
          setUser({ id: session.user.id, email: session.user.email, role: "employee" })
        } else {
          setUser({ id: session.user.id, email: session.user.email, role: roleData.role })
        }
      } else {
        setUser(null) // No active session, user is not logged in
      }

      await fetchTravelers()
    }
    loadUserAndData()

    // Listen for auth state changes (e.g., login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // When auth state changes, re-fetch user role and travelers
        const fetchUserAndDataOnAuthChange = async () => {
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single()

          if (roleError) {
            console.error("Error fetching user role on auth change:", roleError)
            setUser({ id: session.user.id, email: session.user.email, role: "employee" })
          } else {
            setUser({ id: session.user.id, email: roleData.role }) // Corrected: use roleData.role
          }
          await fetchTravelers()
        }
        fetchUserAndDataOnAuthChange()
      } else {
        setUser(null) // User logged out
        setArrivalTravelers([])
        setDepartureTravelers([])
        setUniquePersons([])
      }
    })

    return () => {
      authListener?.unsubscribe() // Clean up the listener
    }
  }, [supabase, fetchTravelers, setArrivalTravelers, setDepartureTravelers, setUniquePersons])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
      fetchTravelers={fetchTravelers} // Pass fetch function down
    />
  )
}

function LoginPage({ setUser }: { setUser: any }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const supabase = createClient() // Get Supabase client here

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        // After successful signup, insert into user_roles table
        const role = email.includes("admin") ? "admin" : "employee"
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: role,
        })
        if (roleError) {
          console.error("Error inserting user role:", roleError)
          setMessage("Registration successful, but failed to assign role. Please contact support.")
        } else {
          setMessage("Registration successful! Please check your email to confirm your account.")
          // For demo purposes, we'll auto-login after signup if email confirmation is disabled
          // In a real app, you'd wait for email confirmation or handle it differently
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInError) {
            setMessage(signInError.message)
          } else if (signInData.user) {
            // Fetch the user's role after sign-in to ensure it's correct
            const { data: roleData, error: fetchRoleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", signInData.user.id)
              .single()

            if (fetchRoleError) {
              console.error("Error fetching user role after signup login:", fetchRoleError)
              setUser({ id: signInData.user.id, email: signInData.user.email, role: "employee" }) // Default
            } else {
              setUser({ id: signInData.user.id, email: signInData.user.email, role: roleData.role })
            }
            setMessage("")
          }
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        // Fetch the user's role from the user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()

        if (roleError) {
          console.error("Error fetching user role:", roleError)
          setMessage("Login successful, but failed to fetch role. Please contact support.")
          setUser({ id: data.user.id, email: data.user.email, role: "employee" }) // Default to employee
        } else {
          setUser({ id: data.user.id, email: data.user.email, role: roleData.role }) // Corrected: use roleData.role
          setMessage("")
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Plane className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Traveler Management
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            {isRegistering ? "Create your account" : "Welcome back! Sign in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com or employee@demo.com"
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
                minLength={6}
              />
            </div>
            {message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{message}</div>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setMessage("")
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isRegistering ? "Already have an account? Sign in" : "Need an account? Register here"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Dashboard({
  user,
  setUser,
  arrivalTravelers,
  setArrivalTravelers,
  departureTravelers,
  setDepartureTravelers,
  uniquePersons,
  setUniquePersons,
  fetchTravelers,
}: {
  user: any
  setUser: any
  arrivalTravelers: Traveler[]
  setArrivalTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  departureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  uniquePersons: Person[]
  setUniquePersons: React.Dispatch<React.SetStateAction<Person[]>>
  fetchTravelers: () => Promise<void>
}) {
  const [userRole, setUserRole] = useState<"admin" | "employee">("admin")
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      setUserRole(user.role) // Directly use the role from the user object
    }
  }, [user])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
    } else {
      setUser(null) // Clear user state on successful sign out
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Traveler Management
                </h1>
                <Badge
                  variant="outline"
                  className="mt-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                >
                  ✈️ August 11 Departures
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge
                variant="secondary"
                className={`px-3 py-1 ${
                  userRole === "admin"
                    ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                    : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                }`}
              >
                {userRole === "admin" ? "👑 Administrator" : "👤 Employee"}
              </Badge>
              <span className="text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full">{user.email}</span>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="bg-white/50 hover:bg-white/80 border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

function AdminDashboard({
  uniquePersons,
  setUniquePersons,
  setArrivalTravelers,
  setDepartureTravelers,
  fetchTravelers,
}: {
  uniquePersons: Person[]
  setUniquePersons: React.Dispatch<React.SetStateAction<Person[]>>
  setArrivalTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  setDepartureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  fetchTravelers: () => Promise<void>
}) {
  const totalTravelers = uniquePersons.length
  const checkedInCount = uniquePersons.filter((p) => p.isAnySegmentCheckedIn).length
  const pendingCount = totalTravelers - checkedInCount
  const supabase = createClient()

  const handleAddTraveler = async (
    newTravelers: (Omit<
      Traveler,
      "id" | "checked_in" | "checked_out" | "photo_url" | "check_in_time" | "check_out_time" | "notes"
    > & { notes?: string | null; photo_url?: string | null })[], // Expect an array of travelers
  ) => {
    console.log("Attempting to add new travelers:", newTravelers) // Log data before insert
    const { error } = await supabase.from("travelers").insert(newTravelers) // Insert the array directly
    if (error) {
      console.error("Error adding travelers to Supabase:", error) // Updated log message with error object
    } else {
      console.log("Travelers added successfully. Re-fetching data...") // Success log
      await fetchTravelers() // Re-fetch all data to update UI
    }
  }

  const handleUpdatePerson = async (updatedPerson: Person) => {
    // Update the unique person list locally for immediate feedback
    setUniquePersons((prev) => prev.map((p) => (p.personId === updatedPerson.personId ? updatedPerson : p)))

    // Update all associated traveler segments in the database
    // This is a simplified approach; in a real app, you might update only the specific fields that changed
    // and only for the relevant segments. For photo_url and notes, we update all segments for that person.
    const { error: updateError } = await supabase
      .from("travelers")
      .update({ photo_url: updatedPerson.photo_url, notes: updatedPerson.notes })
      .eq("person_id", updatedPerson.personId)

    if (updateError) {
      console.error("Error updating person data in DB:", updateError)
    }
    await fetchTravelers() // Re-fetch all data to ensure consistency
  }

  const handleDeletePerson = async (personIdToDelete: string) => {
    const { error } = await supabase.from("travelers").delete().eq("person_id", personIdToDelete)
    if (error) {
      console.error("Error deleting person and their segments:", error)
    } else {
      await fetchTravelers() // Re-fetch all data to update UI
    }
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-white/80 backdrop-blur-sm shadow-lg border-0 p-1 rounded-xl">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="add-traveler"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
        >
          Add Traveler
        </TabsTrigger>
        <TabsTrigger
          value="manage"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
        >
          Manage Travelers
        </TabsTrigger>
        <TabsTrigger
          value="photos"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
        >
          Upload Photos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Travelers</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">{totalTravelers}</div>
              <p className="text-xs text-blue-600 mt-1">Unique travelers</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Checked In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-800">{checkedInCount}</div>
              <p className="text-xs text-emerald-600 mt-1">Travelers with at least one checked-in segment</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Pending</CardTitle>
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800">{pendingCount}</div>
              <p className="text-xs text-amber-600 mt-1">Travelers awaiting check-in</p>
            </CardContent>
          </Card>
        </div>

        <PersonList persons={uniquePersons} showManage={false} />
      </TabsContent>

      <TabsContent value="add-traveler">
        <AddTravelerForm onAddTraveler={handleAddTraveler} />
      </TabsContent>

      <TabsContent value="manage">
        <PersonList persons={uniquePersons} showManage={true} onDeletePerson={handleDeletePerson} />
      </TabsContent>

      <TabsContent value="photos">
        <PhotoUploadSection uniquePersons={uniquePersons} onUpdatePerson={handleUpdatePerson} />
      </TabsContent>
    </Tabs>
  )
}

function PhotoUploadSection({
  uniquePersons,
  onUpdatePerson,
}: {
  uniquePersons: Person[]
  onUpdatePerson: (person: Person) => void
}) {
  const [selectedPersonId, setSelectedPersonId] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonId || !photo) return

    setLoading(true)

    const fileExt = photo.name.split(".").pop()
    const filePath = `${selectedPersonId}-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("traveler-photos")
      .upload(filePath, photo, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Error uploading photo:", uploadError)
      setLoading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from("traveler-photos").getPublicUrl(uploadData.path)

    const publicUrl = publicUrlData.publicUrl
    console.log("Uploaded photo public URL:", publicUrl)

    const personToUpdate = uniquePersons.find((p) => p.personId === selectedPersonId)
    if (personToUpdate) {
      // Update the person in the database with the new photo URL
      const { error: updateError } = await supabase
        .from("travelers")
        .update({ photo_url: publicUrl })
        .eq("person_id", selectedPersonId) // Update all segments for this person_id

      if (updateError) {
        console.error("Error updating photo URL in DB:", updateError)
      } else {
        console.log("Photo URL updated in DB for person:", selectedPersonId)
        // Update local state to reflect the change
        onUpdatePerson({ ...personToUpdate, photo_url: publicUrl })
      }
    }
    setSelectedPersonId("")
    setPhoto(null)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Traveler Photos</CardTitle>
          <CardDescription>Add photos for traveler identification</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhotoUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="traveler">Select Traveler</Label>
                <select
                  id="traveler"
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Choose a traveler...</option>
                  {uniquePersons.map((person) => (
                    <option key={person.personId} value={person.personId}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || !selectedPersonId || !photo}>
              {loading ? "Uploading..." : "Upload Photo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Travelers with Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniquePersons
              .filter((p) => p.photo_url)
              .map((person) => (
                <div key={person.personId} className="border rounded-lg p-4 text-center">
                  <img
                    src={person.photo_url || "/placeholder.svg"}
                    alt={person.name}
                    className="w-20 h-20 rounded-full mx-auto mb-2 object-cover"
                  />
                  <h3 className="font-semibold text-sm">{person.name}</h3>
                  <p className="text-xs text-gray-500">Person ID: {person.personId.substring(0, 8)}...</p>
                </div>
              ))}
            {uniquePersons.filter((p) => p.photo_url).length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No photos uploaded yet. Use the form above to add traveler photos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmployeeDashboard({
  arrivalTravelers,
  setArrivalTravelers,
  departureTravelers,
  setDepartureTravelers,
  fetchTravelers,
}: {
  arrivalTravelers: Traveler[]
  setArrivalTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  departureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  fetchTravelers: () => Promise<void>
}) {
  const supabase = createClient()

  const groupTravelers = (travelers: Traveler[]) => {
    const grouped: Record<string, Traveler[]> = travelers.reduce((acc, traveler) => {
      const key = `${traveler.departure_time} - ${traveler.flight_number}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(traveler)
      return acc
    }, {})

    return Object.entries(grouped).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  }

  const sortedArrivalFlights = groupTravelers(arrivalTravelers)
  const sortedDepartureFlights = groupTravelers(departureTravelers)

  const totalArrivals = arrivalTravelers.length
  const checkedInArrivals = arrivalTravelers.filter((t) => t.checked_in).length
  const pendingArrivals = totalArrivals - checkedInArrivals

  const totalDepartures = departureTravelers.length
  const checkedInDepartures = departureTravelers.filter((t) => t.checked_in).length
  const checkedOutDepartures = departureTravelers.filter((t) => t.checked_out).length
  const pendingDepartures = totalDepartures - checkedInDepartures

  const handleCheckIn = async (id: string, type: Traveler["type"]) => {
    const { error } = await supabase
      .from("travelers")
      .update({ checked_in: true, check_in_time: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("Error checking in traveler:", error)
    } else {
      await fetchTravelers() // Re-fetch all data to update UI
    }
  }

  const handleCheckOut = async (id: string, type: Traveler["type"]) => {
    const { error } = await supabase
      .from("travelers")
      .update({ checked_out: true, check_out_time: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("Error checking out traveler:", error)
    } else {
      await fetchTravelers() // Re-fetch all data to update UI
    }
  }

  const handleSaveNote = async (travelerId: string, type: Traveler["type"], newNote: string) => {
    const { error } = await supabase.from("travelers").update({ notes: newNote }).eq("id", travelerId)

    if (error) {
      console.error("Error saving note:", error)
    } else {
      await fetchTravelers() // Re-fetch all data to update UI
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-blue-700">Arrival Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-800">Arrived:</span>
                <Badge className="bg-blue-500 text-white">{checkedInArrivals}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800">Pending Arrival:</span>
                <Badge variant="secondary">{pendingArrivals}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-purple-700">Departure Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-800">Checked In for Departure:</span>
                <Badge className="bg-purple-500 text-white">{checkedInDepartures}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-800">Departed:</span>
                <Badge className="bg-emerald-500 text-white">{checkedOutDepartures}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-800">Pending Departure Check-in:</span>
                <Badge variant="secondary">{pendingDepartures}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="arrivals" className="space-y-6">
        <TabsList className="bg-white/80 backdrop-blur-sm shadow-lg border-0 p-1 rounded-xl">
          <TabsTrigger
            value="arrivals"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
          >
            Arrivals
          </TabsTrigger>
          <TabsTrigger
            value="departures"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
          >
            Departures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Incoming Travelers</h2>
          <div className="space-y-6">
            {sortedArrivalFlights.map(([flightGroup, flightTravelers]) => (
              <Card key={flightGroup} className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-blue-700">
                    <div>
                      <span>{flightTravelers[0]?.flight_number}</span>
                      <div className="text-sm font-normal text-gray-500 mt-1">
                        Arrival: {flightTravelers[0]?.departure_time}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                      <LogIn className="h-3 w-3 mr-1" />
                      {flightTravelers.filter((t) => t.checked_in).length}/{flightTravelers.length} Arrived
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flightTravelers.map((traveler) => (
                      <TravelerCard
                        key={traveler.id}
                        traveler={traveler}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                        onSaveNote={handleSaveNote}
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Outgoing Travelers</h2>
          <div className="space-y-6">
            {sortedDepartureFlights.map(([flightGroup, flightTravelers]) => (
              <Card key={flightGroup} className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-purple-700">
                    <div>
                      <span>{flightTravelers[0]?.flight_number}</span>
                      <div className="text-sm font-normal text-gray-500 mt-1">
                        Departure: {flightTravelers[0]?.departure_time}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                      <LogOut className="h-3 w-3 mr-1" />
                      {flightTravelers.filter((t) => t.checked_out).length}/{flightTravelers.length} Departed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flightTravelers.map((traveler) => (
                      <TravelerCard
                        key={traveler.id}
                        traveler={traveler}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                        onSaveNote={handleSaveNote}
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

function TravelerCard({
  traveler,
  onCheckIn,
  onCheckOut,
  onSaveNote,
  mode,
}: {
  traveler: Traveler
  onCheckIn: (id: string, type: Traveler["type"]) => void
  onCheckOut: (id: string, type: Traveler["type"]) => void
  onSaveNote: (travelerId: string, type: Traveler["type"], newNote: string) => void
  mode: "arrival" | "departure" | "cruise"
}) {
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [currentNote, setCurrentNote] = useState(traveler.notes || "")

  const handleNoteSave = () => {
    onSaveNote(traveler.id, traveler.type, currentNote)
    setShowNoteDialog(false)
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center space-x-4 mb-4">
        {traveler.photo_url ? (
          <img
            src={traveler.photo_url || "/placeholder.svg"}
            alt={traveler.name}
            className="w-14 h-14 rounded-full object-cover border-3 border-gradient-to-r from-blue-400 to-purple-500 shadow-md"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
            <span className="text-gray-400 text-xs font-medium">No Photo</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-sm">{traveler.name}</h3>
          {traveler.overnight_hotel && (
            <div
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full mt-2 font-
bold shadow-md inline-flex items-center"
            >
              🏨 OVERNIGHT HOTEL
            </div>
          )}
          {traveler.checked_in && traveler.check_in_time && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              {mode === "arrival" ? "✅ Arrived" : "✅ Checked In"}: {new Date(traveler.check_in_time).toLocaleString()}
            </p>
          )}
          {traveler.checked_out && traveler.check_out_time && (
            <p className="text-xs text-purple-600 mt-1 font-medium">
              ✈️ Departed: {new Date(traveler.check_out_time).toLocaleString()}
            </p>
          )}
          {traveler.notes && (
            <p className="text-xs text-gray-700 mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              <span className="font-semibold">Note:</span> {traveler.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {mode === "arrival" && !traveler.checked_in && (
          <Button
            size="sm"
            onClick={() => onCheckIn(traveler.id, traveler.type)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
          >
            Mark Arrived
          </Button>
        )}
        {mode !== "arrival" && !traveler.checked_in && (
          <Button
            size="sm"
            onClick={() => onCheckIn(traveler.id, traveler.type)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
          >
            Check In for Departure
          </Button>
        )}
        {mode !== "arrival" && traveler.checked_in && !traveler.checked_out && (
          <Button
            size="sm"
            onClick={() => onCheckOut(traveler.id, traveler.type)}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
          >
            Mark Departed
          </Button>
        )}
        {traveler.checked_in && mode === "arrival" && (
          <Badge
            variant="default"
            className="w-full justify-center bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2 rounded-lg shadow-md"
          >
            ✓ Arrived
          </Badge>
        )}
        {traveler.checked_out && mode !== "arrival" && (
          <Badge
            variant="default"
            className="w-full justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg shadow-md"
          >
            ✓ Departed
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNoteDialog(true)}
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {traveler.notes ? "View/Edit Note" : "Add Note"}
        </Button>
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Note for {traveler.name}</DialogTitle>
            <DialogDescription>Add or edit a note for this traveler.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Enter your note here..."
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleNoteSave}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddTravelerForm({ onAddTraveler }: { onAddTraveler: (traveler: any) => void }) {
  const [name, setName] = useState("")
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState("")
  const [arrivalTime, setArrivalTime] = useState("")
  const [departureFlightNumber, setDepartureFlightNumber] = useState("")
  const [departureTime, setDepartureTime] = useState("")
  const [overnightHotel, setOvernightHotel] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const personId = name.toLowerCase().replace(/\s+/g, "-") // Consistent person_id for both segments

    const arrivalTraveler = {
      person_id: personId,
      name,
      flight_number: arrivalFlightNumber,
      departure_time: arrivalTime, // This is arrival time for arrival segment
      type: "arrival" as Traveler["type"],
      overnight_hotel: overnightHotel,
      notes: null,
      photo_url: null,
    }

    const departureTraveler = {
      person_id: personId,
      name,
      flight_number: departureFlightNumber,
      departure_time: departureTime, // This is departure time for departure segment
      type: "departure" as Traveler["type"],
      overnight_hotel: false, // Overnight hotel only applies to arrival
      notes: null,
      photo_url: null,
    }

    await onAddTraveler([arrivalTraveler, departureTraveler]) // Pass both segments

    setName("")
    setArrivalFlightNumber("")
    setArrivalTime("")
    setDepartureFlightNumber("")
    setDepartureTime("")
    setOvernightHotel(false)
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Traveler</CardTitle>
        <CardDescription>Enter traveler name, flight, and time information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivalFlight">Arrival Flight Name</Label>
              <Input
                id="arrivalFlight"
                value={arrivalFlightNumber}
                onChange={(e) => setArrivalFlightNumber(e.target.value)}
                placeholder="e.g., Alaska Airlines 66"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Arrival Time/Date</Label>
              <Input
                id="arrivalTime"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                placeholder="e.g., August 10, 10:33pm or TBD"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departureFlight">Departure Flight Name</Label>
              <Input
                id="departureFlight"
                value={departureFlightNumber}
                onChange={(e) => setDepartureFlightNumber(e.target.value)}
                placeholder="e.g., China Airlines 21 or Celebrity Summit 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departureTime">Departure Time/Date</Label>
              <Input
                id="departureTime"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                placeholder="e.g., August 11, 01:40 or TBD"
                required
              />
            </div>
            <div className="flex items-center space-x-2 col-span-full">
              <Input
                id="overnight"
                type="checkbox"
                checked={overnightHotel}
                onChange={(e) => setOvernightHotel(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="overnight">Overnight Hotel Required</Label>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Traveler"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PersonList({
  persons,
  showManage = false,
  onDeletePerson,
}: {
  persons: Person[]
  showManage?: boolean
  onDeletePerson?: (personId: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Unique Travelers</CardTitle>
        <CardDescription>Consolidated view of all travelers across arrival and departure segments.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {persons.map((person) => (
            <div key={person.personId} className="flex items-center space-x-4 p-4 border rounded-lg">
              {person.photo_url ? (
                <img
                  src={person.photo_url || "/placeholder.svg"}
                  alt={person.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">No Photo</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{person.name}</h3>
                <p className="text-sm text-gray-600">
                  Arrivals:{" "}
                  {person.arrivalSegments.map((s) => `${s.flight_number} (${s.departure_time})`).join(", ") || "N/A"}
                </p>
                <p className="text-sm text-gray-600">
                  Departures:{" "}
                  {person.departureSegments.map((s) => `${s.flight_number} (${s.departure_time})`).join(", ") || "N/A"}
                </p>
                {person.notes && (
                  <p className="text-xs text-gray-700 mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
                    <span className="font-semibold">Note:</span> {person.notes}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {person.isAnySegmentCheckedOut ? (
                  <Badge variant="default" className="bg-purple-500 text-white">
                    Departed
                  </Badge>
                ) : person.isAnySegmentCheckedIn ? (
                  <Badge variant="default">Checked In</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
                {showManage && onDeletePerson && (
                  <Button size="sm" variant="destructive" onClick={() => onDeletePerson(person.personId)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
          {persons.length === 0 && <div className="text-center py-8 text-gray-500">No unique travelers found.</div>}
        </div>
      </CardContent>
    </Card>
  )
}
