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
import { Plane, LogIn, MessageSquare, Hotel, LogOutIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

console.log("App Page Component Loaded")

interface Traveler {
  id: string
  person_id?: string
  personId: string
  name: string
  flight_number: string
  departure_time: string
  type: "arrival" | "departure" | "cruise"
  checked_in: boolean
  checked_out: boolean
  photo_url: string | null
  overnight_hotel?: boolean
  check_in_time?: string | null
  check_out_time?: string | null
  notes?: string | null
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

function sanitizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizePersonIdFromName(name: string) {
  const slug = sanitizeSlug(name)
  return `person-${slug}`
}

function normalizePersonId(idOrName: string) {
  const raw = (idOrName || "").trim()
  if (raw.startsWith("person-")) {
    const rest = raw.slice(7)
    return `person-${sanitizeSlug(rest)}`
  }
  return normalizePersonIdFromName(raw)
}

// Transform DB rows into structured lists + unique persons
const processTravelerData = (
  rawTravelers: Traveler[],
): { arrivals: Traveler[]; departures: Traveler[]; uniquePersons: Person[] } => {
  const personMap = new Map<string, Person>()
  const allTravelerSegments: Traveler[] = []

  rawTravelers.forEach((traveler) => {
    const rawPersonId = (traveler as any).person_id ?? (traveler as any).personId
    const fallbackId = `person-${traveler.name.toLowerCase().replace(/\s+/g, "-")}`
    const personId = rawPersonId ?? fallbackId

    const current: Traveler = {
      ...traveler,
      personId,
      person_id: (traveler as any).person_id ?? personId,
      overnight_hotel: traveler.overnight_hotel || false,
      notes: traveler.notes || null,
      check_in_time: traveler.check_in_time || null,
      check_out_time: traveler.check_out_time || null,
    }
    allTravelerSegments.push(current)

    if (!personMap.has(personId)) {
      personMap.set(personId, {
        personId,
        name: current.name,
        photo_url: current.photo_url,
        notes: current.notes,
        arrivalSegments: [],
        departureSegments: [],
        isAnySegmentCheckedIn: false,
        isAnySegmentCheckedOut: false,
      })
    }
    const person = personMap.get(personId)!
    if (current.photo_url && !person.photo_url) person.photo_url = current.photo_url
    if (current.notes && !person.notes) person.notes = current.notes

    if (current.type === "arrival") person.arrivalSegments.push(current)
    else person.departureSegments.push(current)
  })

  const uniquePersons = Array.from(personMap.values()).map((p) => {
    p.isAnySegmentCheckedIn =
      p.arrivalSegments.some((s) => s.checked_in) || p.departureSegments.some((s) => s.checked_in)
    p.isAnySegmentCheckedOut = p.departureSegments.some((s) => s.checked_out)
    return p
  })

  const arrivals = allTravelerSegments.filter((t) => t.type === "arrival")
  const departures = allTravelerSegments.filter((t) => t.type === "departure" || t.type === "cruise")

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
      console.error("Error fetching travelers:", error)
      setArrivalTravelers([])
      setDepartureTravelers([])
      setUniquePersons([])
    } else {
      const processed = processTravelerData(data as Traveler[])
      setArrivalTravelers(processed.arrivals)
      setDepartureTravelers(processed.departures)
      setUniquePersons(processed.uniquePersons)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const loadUserAndData = async () => {
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
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single()
        if (roleError) {
          console.error("Error fetching user role:", roleError)
          setUser({ id: session.user.id, email: session.user.email, role: "employee" })
        } else {
          setUser({ id: session.user.id, email: session.user.email, role: roleData.role })
        }
      } else {
        setUser(null)
      }
      await fetchTravelers()
    }
    loadUserAndData()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_OUT") {
        setUser(null)
        setArrivalTravelers([])
        setDepartureTravelers([])
        setUniquePersons([])
        window.location.href = "/"
      } else if (session?.user) {
        const refetch = async () => {
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single()
          if (roleError) {
            console.error("Error fetching user role on auth change:", roleError)
            setUser({ id: session.user.id, email: session.user.email, role: "employee" })
          } else {
            setUser({ id: session.user.id, email: session.user.email, role: roleData.role })
          }
          await fetchTravelers()
        }
        refetch()
      } else {
        setUser(null)
        setArrivalTravelers([])
        setDepartureTravelers([])
        setUniquePersons([])
      }
    })
    return () => authListener?.unsubscribe()
  }, [supabase, fetchTravelers])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
    const supabase = createClient()

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        const role = email.includes("admin") ? "admin" : "employee"
        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role })
        if (roleError) {
          console.error("Error inserting user role:", roleError)
          setMessage("Registration successful, but failed to assign role. Please contact support.")
        } else {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) {
            setMessage(signInError.message)
          } else if (signInData.user) {
            const { data: roleData, error: fetchRoleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", signInData.user.id)
              .single()
            if (fetchRoleError) {
              console.error("Error fetching user role after signup login:", fetchRoleError)
              setUser({ id: signInData.user.id, email: signInData.user.email, role: "employee" })
            } else {
              setUser({ id: signInData.user.id, email: signInData.user.email, role: roleData.role })
            }
            setMessage("")
          }
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()
        if (roleError) {
          console.error("Error fetching user role:", roleError)
          setMessage("Login successful, but failed to fetch role. Please contact support.")
          setUser({ id: data.user.id, email: data.user.email, role: "employee" })
        } else {
          setUser({ id: data.user.id, email: data.user.email, role: roleData.role })
          setMessage("")
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10" />
      <Card className="w-full max-w-md relative z-10 shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-md">
              <Plane className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Safeguard Management</CardTitle>
          <CardDescription className="text-sm text-gray-600 mt-1">
            {isRegistering ? "Create your account" : "Welcome back! Sign in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-gray-700 text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com or employee@demo.com"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-gray-700 text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="h-11"
                required
                minLength={6}
              />
            </div>
            {message && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{message}</div>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setMessage("")
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
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
  const router = useRouter()

  useEffect(() => {
    if (user) setUserRole(user.role)
  }, [user])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
    } else {
      setUser(null)
      window.location.href = "/"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-sm">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Safeguard Management</h1>
                <span className="inline-flex items-center gap-1 text-xs text-gray-600">✈️ August 11 Movements</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`hidden sm:inline-flex px-2.5 py-1 ${
                  userRole === "admin"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-blue-100 text-blue-700 border-blue-200"
                }`}
              >
                {userRole === "admin" ? "Administrator" : "Employee"}
              </Badge>
              <span className="hidden md:inline text-sm text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
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
  // Controlled Tabs to prevent resets
  const [adminTab, setAdminTab] = useState<"overview" | "add-traveler" | "manage" | "photos">(
    (typeof window !== "undefined" && (localStorage.getItem("adminTab") as any)) || "overview",
  )
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("adminTab", adminTab)
  }, [adminTab])

  const totalTravelers = uniquePersons.length
  const checkedInCount = uniquePersons.filter((p) => p.isAnySegmentCheckedIn).length
  const departedCount = uniquePersons.filter((p) => p.isAnySegmentCheckedOut).length
  const pendingCount = totalTravelers - checkedInCount

  const supabase = createClient()

  const handleAddTraveler = async (
    newTravelers: (Omit<
      Traveler,
      "id" | "checked_in" | "checked_out" | "photo_url" | "check_in_time" | "check_out_time" | "notes"
    > & { notes?: string | null; photo_url?: string | null })[],
  ) => {
    const { error } = await supabase.from("travelers").insert(newTravelers)
    if (error) {
      console.error("Error adding travelers to Supabase:", error)
    } else {
      await fetchTravelers()
    }
  }

  const handleUpdatePerson = async (updatedPerson: Person) => {
    setUniquePersons((prev) => prev.map((p) => (p.personId === updatedPerson.personId ? updatedPerson : p)))
    const { error: updateError } = await supabase
      .from("travelers")
      .update({ photo_url: updatedPerson.photo_url, notes: updatedPerson.notes })
      .eq("person_id", updatedPerson.personId)
    if (updateError) console.error("Error updating person data in DB:", updateError)
    await fetchTravelers()
  }

  const handleDeletePerson = async (personIdToDelete: string) => {
    const canonicalId = normalizePersonId(personIdToDelete)
    const candidates = Array.from(
      new Set([
        canonicalId,
        canonicalId.replace(/^person-/, ""),
        canonicalId.replace(/-+$/, ""),
        canonicalId.replace(/^person-/, "").replace(/-+$/, ""),
      ]),
    )
    let { data: delRows, error } = await supabase.from("travelers").delete().eq("person_id", canonicalId).select("id")
    if (!error && (delRows?.length ?? 0) === 0) {
      const alt = await supabase.from("travelers").delete().in("person_id", candidates).select("id")
      delRows = alt.data
      error = alt.error
    }
    if (error) {
      console.error("Error deleting person and their segments:", error)
    } else {
      console.log("Rows deleted:", delRows?.length ?? 0)
      await fetchTravelers()
    }
  }

  return (
    <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as any)} className="space-y-4 sm:space-y-6">
      <TabsList className="sticky top-[56px] sm:top-[64px] z-40 bg-white/95 backdrop-blur border rounded-lg p-1 overflow-x-auto whitespace-nowrap w-full">
        <TabsTrigger value="overview" className="rounded-md">
          Overview
        </TabsTrigger>
        <TabsTrigger value="add-traveler" className="rounded-md">
          Add Individual
        </TabsTrigger>
        <TabsTrigger value="manage" className="rounded-md">
          Manage Individuals
        </TabsTrigger>
        <TabsTrigger value="photos" className="rounded-md">
          Upload Photos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Individuals</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalTravelers}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Checked In</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{checkedInCount}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-amber-700">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Departed</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-purple-700">{departedCount}</div>
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

    const canonicalId = normalizePersonId(selectedPersonId)
    const candidates = Array.from(
      new Set([
        canonicalId,
        canonicalId.replace(/^person-/, ""),
        canonicalId.replace(/-+$/, ""),
        canonicalId.replace(/^person-/, "").replace(/-+$/, ""),
      ]),
    )

    setLoading(true)
    const fileExt = photo.name.split(".").pop()
    const filePath = `${canonicalId}-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("traveler-photos")
      .upload(filePath, photo, { cacheControl: "3600", upsert: false })

    if (uploadError) {
      console.error("Error uploading photo:", uploadError)
      setLoading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from("traveler-photos").getPublicUrl(uploadData.path)
    const publicUrl = publicUrlData.publicUrl

    const personToUpdate = uniquePersons.find((p) => p.personId === selectedPersonId)
    if (personToUpdate) {
      let { data: updateRows, error: updateError } = await supabase
        .from("travelers")
        .update({ photo_url: publicUrl })
        .eq("person_id", canonicalId)
        .select("id")

      if (!updateError && (updateRows?.length ?? 0) === 0) {
        const { data: altRows, error: altErr } = await supabase
          .from("travelers")
          .update({ photo_url: publicUrl })
          .in("person_id", candidates)
          .select("id")
        updateRows = altRows
        updateError = altErr as any
      }

      if (updateError) {
        console.error("Error updating photo URL in DB:", updateError)
      } else if ((updateRows?.length ?? 0) > 0) {
        onUpdatePerson({ ...personToUpdate, photo_url: publicUrl })
      } else {
        console.warn("No travelers matched person_id candidates:", candidates)
      }
    }

    setSelectedPersonId("")
    setPhoto(null)
    setLoading(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Upload Individual Photos</CardTitle>
          <CardDescription>Add photos for individual identification</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhotoUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="traveler">Select Individual</Label>
                <select
                  id="traveler"
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Choose an individual...</option>
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

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Individuals with Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {uniquePersons
              .filter((p) => p.photo_url)
              .map((person) => (
                <div key={person.personId} className="border rounded-lg p-3 text-center">
                  <img
                    src={person.photo_url || "/placeholder.svg"}
                    alt={person.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 object-cover"
                  />
                  <h3 className="font-medium text-sm text-gray-800">{person.name}</h3>
                  <p className="text-[10px] text-gray-500">ID: {person.personId.substring(0, 8)}...</p>
                </div>
              ))}
            {uniquePersons.filter((p) => p.photo_url).length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">No photos uploaded yet.</div>
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
  departureTravelers: Traveler[]
  setDepartureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  fetchTravelers: () => Promise<void>
}) {
  const supabase = createClient()

  // Controlled Tabs (persist selection)
  const [empTab, setEmpTab] = useState<"arrivals" | "departures">(
    (typeof window !== "undefined" && (localStorage.getItem("empTab") as any)) || "arrivals",
  )
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("empTab", empTab)
  }, [empTab])

  const groupTravelers = (travelers: Traveler[]) => {
    const grouped: Record<string, Traveler[]> = travelers.reduce(
      (acc, traveler) => {
        const key = `${traveler.departure_time} - ${traveler.flight_number}`
        if (!acc[key]) acc[key] = []
        acc[key].push(traveler)
        return acc
      },
      {} as Record<string, Traveler[]>,
    )
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
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

  const handleCheckIn = async (id: string) => {
    const { error } = await supabase
      .from("travelers")
      .update({ checked_in: true, check_in_time: new Date().toISOString() })
      .eq("id", id)
    if (error) console.error("Error checking in traveler:", error)
    else await fetchTravelers()
  }

  const handleCheckOut = async (id: string) => {
    const { error } = await supabase
      .from("travelers")
      .update({ checked_out: true, check_out_time: new Date().toISOString() })
      .eq("id", id)
    if (error) console.error("Error checking out traveler:", error)
    else await fetchTravelers()
  }

  const handleSaveNote = async (travelerId: string, newNote: string) => {
    const { error } = await supabase.from("travelers").update({ notes: newNote }).eq("id", travelerId)
    if (error) console.error("Error saving note:", error)
    else await fetchTravelers()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="border">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-600">Arrivals Checked In</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-semibold text-blue-700">{checkedInArrivals}</div>
            <div className="text-xs text-gray-500">{pendingArrivals} pending</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-600">Departures Checked In</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-semibold text-indigo-700">{checkedInDepartures}</div>
            <div className="text-xs text-gray-500">{pendingDepartures} pending</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-600">Checked Out</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-semibold text-emerald-700">{checkedOutDepartures}</div>
            <div className="text-xs text-gray-500">Departures</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-gray-600">Total Flights</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-semibold text-gray-800">
              {sortedArrivalFlights.length + sortedDepartureFlights.length}
            </div>
            <div className="text-xs text-gray-500">Arrival + Departure</div>
          </CardContent>
        </Card>
      </div>

      {/* Controlled Tabs, sticky on mobile, scrollable */}
      <Tabs value={empTab} onValueChange={(v) => setEmpTab(v as any)} className="space-y-4">
        <TabsList className="sticky top-[56px] sm:top-[64px] z-40 bg-white/95 backdrop-blur border rounded-lg p-1 overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="arrivals" className="rounded-md">
            Arrivals
          </TabsTrigger>
          <TabsTrigger value="departures" className="rounded-md">
            Departures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Incoming Individuals</h2>
          <div className="space-y-3 sm:space-y-4">
            {sortedArrivalFlights.map(([flightGroup, flightTravelers]) => (
              <Card key={flightGroup} className="border">
                <CardHeader className="py-3 sm:py-4">
                  <CardTitle className="flex items-center justify-between text-blue-700 text-sm sm:text-base">
                    <div>
                      <span className="font-medium">{flightTravelers[0]?.flight_number}</span>
                      <div className="text-[11px] sm:text-xs font-normal text-gray-600 mt-1">
                        Arrival: {flightTravelers[0]?.departure_time}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <LogIn className="h-3 w-3 mr-1" />
                      {flightTravelers.filter((t) => t.checked_in).length}/{flightTravelers.length} Checked In
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Outgoing Individuals</h2>
          <div className="space-y-3 sm:space-y-4">
            {sortedDepartureFlights.map(([flightGroup, flightTravelers]) => (
              <Card key={flightGroup} className="border">
                <CardHeader className="py-3 sm:py-4">
                  <CardTitle className="flex items-center justify-between text-purple-700 text-sm sm:text-base">
                    <div>
                      <span className="font-medium">{flightTravelers[0]?.flight_number}</span>
                      <div className="text-[11px] sm:text-xs font-normal text-gray-600 mt-1">
                        Departure: {flightTravelers[0]?.departure_time}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <LogOutIcon className="h-3 w-3 mr-1" />
                      {flightTravelers.filter((t) => t.checked_out).length}/{flightTravelers.length} Checked Out
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

function TravelerCard({
  traveler,
  onCheckIn,
  onCheckOut,
  onSaveNote,
  mode,
}: {
  traveler: Traveler
  onCheckIn: () => void
  onCheckOut: () => void
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
    <div className="bg-white rounded-lg p-4 border shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        {traveler.photo_url ? (
          <img
            src={traveler.photo_url || "/placeholder.svg"}
            alt={traveler.name}
            className="w-12 h-12 rounded-full object-cover border"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">
            No Photo
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 truncate">{traveler.name}</h3>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {traveler.overnight_hotel && (
              <Badge className="bg-rose-100 text-rose-700 border-rose-200 px-1.5 py-0.5 h-5">
                <Hotel className="h-3 w-3 mr-1" />
                Overnight
              </Badge>
            )}
            {traveler.checked_in && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0.5 h-5">
                ✓ Checked In
              </Badge>
            )}
            {traveler.checked_out && mode !== "arrival" && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-1.5 py-0.5 h-5">✓ Checked Out</Badge>
            )}
          </div>
          {traveler.check_in_time && (
            <p className="text-[11px] text-emerald-700 mt-1">In: {new Date(traveler.check_in_time).toLocaleString()}</p>
          )}
          {traveler.check_out_time && (
            <p className="text-[11px] text-purple-700">Out: {new Date(traveler.check_out_time).toLocaleString()}</p>
          )}
        </div>
      </div>

      {traveler.notes && <p className="text-xs text-gray-700 mb-2 p-2 bg-gray-50 rounded border">{traveler.notes}</p>}

      <div className="flex flex-col gap-2">
        {mode === "arrival" && !traveler.checked_in && (
          <Button size="sm" onClick={onCheckIn} className="w-full">
            Mark Checked In
          </Button>
        )}
        {mode !== "arrival" && !traveler.checked_in && (
          <Button size="sm" onClick={onCheckIn} className="w-full">
            Mark Checked In
          </Button>
        )}
        {mode !== "arrival" && traveler.checked_in && !traveler.checked_out && (
          <Button size="sm" onClick={onCheckOut} className="w-full" variant="secondary">
            Mark Checked Out
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowNoteDialog(true)} className="w-full">
          <MessageSquare className="h-4 w-4 mr-2" />
          {traveler.notes ? "View/Edit Note" : "Add Note"}
        </Button>
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Note for {traveler.name}</DialogTitle>
            <DialogDescription>Add or edit a note for this individual.</DialogDescription>
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

    const personId = normalizePersonIdFromName(name)

    const arrivalTraveler = {
      person_id: personId,
      name,
      flight_number: arrivalFlightNumber,
      departure_time: arrivalTime,
      type: "arrival" as Traveler["type"],
      overnight_hotel: overnightHotel,
      notes: null,
      photo_url: null,
    }

    const departureTraveler = {
      person_id: personId,
      name,
      flight_number: departureFlightNumber,
      departure_time: departureTime,
      type: "departure" as Traveler["type"],
      overnight_hotel: false,
      notes: null,
      photo_url: null,
    }

    await onAddTraveler([arrivalTraveler, departureTraveler])

    setName("")
    setArrivalFlightNumber("")
    setArrivalTime("")
    setDepartureFlightNumber("")
    setDepartureTime("")
    setOvernightHotel(false)
    setLoading(false)
  }

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Add New Individual</CardTitle>
        <CardDescription>Enter individual name, flight, and time information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrivalFlight">Arrival Flight Name</Label>
              <Input
                id="arrivalFlight"
                value={arrivalFlightNumber}
                onChange={(e) => setArrivalFlightNumber(e.target.value)}
                placeholder="e.g., Alaska Airlines 66"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrivalTime">Arrival Time/Date</Label>
              <Input
                id="arrivalTime"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                placeholder="e.g., August 10, 10:33pm or TBD"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departureFlight">Departure Flight Name</Label>
              <Input
                id="departureFlight"
                value={departureFlightNumber}
                onChange={(e) => setDepartureFlightNumber(e.target.value)}
                placeholder="e.g., China Airlines 21"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departureTime">Departure Time/Date</Label>
              <Input
                id="departureTime"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                placeholder="e.g., August 11, 01:40 or TBD"
                required
              />
            </div>
            <div className="flex items-center gap-2 col-span-full">
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
            {loading ? "Adding..." : "Add Individual"}
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
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">All Unique Individuals</CardTitle>
        <CardDescription>Consolidated view across arrival and departure segments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {persons.map((person) => {
            const hasOvernight = person.arrivalSegments.some((s) => s.overnight_hotel)
            return (
              <div key={person.personId} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                {person.photo_url ? (
                  <img
                    src={person.photo_url || "/placeholder.svg"}
                    alt={person.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">
                    No Photo
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">{person.name}</h3>
                    {/* Status and tags visible in overview */}
                    {person.isAnySegmentCheckedOut ? (
                      <Badge variant="default" className="bg-purple-600 text-white h-5">
                        Departed
                      </Badge>
                    ) : person.isAnySegmentCheckedIn ? (
                      <Badge variant="default" className="h-5">
                        Checked In
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="h-5">
                        Pending
                      </Badge>
                    )}
                    {hasOvernight && (
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 h-5">
                        <Hotel className="h-3 w-3 mr-1" />
                        Overnight
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] sm:text-sm text-gray-600 mt-1">
                    Arrivals:{" "}
                    {person.arrivalSegments.map((s) => `${s.flight_number} (${s.departure_time})`).join(", ") || "N/A"}
                  </p>
                  <p className="text-[12px] sm:text-sm text-gray-600">
                    Departures:{" "}
                    {person.departureSegments.map((s) => `${s.flight_number} (${s.departure_time})`).join(", ") ||
                      "N/A"}
                  </p>
                  {person.notes && (
                    <p className="text-xs text-gray-700 mt-1 p-2 bg-gray-50 rounded-md border">{person.notes}</p>
                  )}
                </div>
                {showManage && onDeletePerson && (
                  <div className="flex items-center">
                    <Button size="sm" variant="destructive" onClick={() => onDeletePerson(person.personId)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
          {persons.length === 0 && <div className="text-center py-8 text-gray-500">No unique individuals found.</div>}
        </div>
      </CardContent>
    </Card>
  )
}
